'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { GlassCard } from '@/components/ui/GlassCard';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { ArrowLeft, User, Phone, Mail, Building, DollarSign, Activity, Plus, MessageSquare, X, CheckCircle2, Calendar, MapPin, Ruler, PenTool, UploadCloud, File as FileIcon, Image as ImageIcon, Calculator, FileText, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InteriorLogSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorLogSiteVisitModal';
import { InteriorLogRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorLogRequirementsModal';
import { InteriorUploadDesignModal } from '@/features/interior-new/components/crm/modals/InteriorUploadDesignModal';
import { InteriorQuotationBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal';
import { QuotationPreview } from '@/components/crm/QuotationPreview';

export default function Lead360View() {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [activeQuotationIndex, setActiveQuotationIndex] = useState(0);
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'Phone Call',
    status: 'Completed',
    remarks: ''
  });

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    type: 'Phone Call',
    status: 'Pending',
    scheduledDate: '',
    remarks: ''
  });

  const fetchData = async () => {
    try {
      const leadRes = await interiorCrmService.getCustomers();
      const customerList = leadRes?.success && leadRes?.data ? leadRes.data : Array.isArray(leadRes) ? leadRes : [];
      const found = customerList.find((d: any) => d._id === params.id);
      if (found) setLead(found);

      const actRes = await interiorCrmService.getActivities(params.id as string);
      const activityList = actRes?.success && actRes?.data ? actRes.data : Array.isArray(actRes) ? actRes : [];
      setActivities(activityList);
      
      const userRes = await interiorCrmService.getUsers();
      const userList = userRes?.success && userRes?.data ? userRes.data : Array.isArray(userRes) ? userRes : [];
      setUsers(userList);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (checked && params.id) {
      fetchData();
    }
  }, [checked, params.id]);

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.remarks) return toast.error('Remarks are required');

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        ...activityForm,
        customer: params.id
      });
      toast.success('Activity logged successfully!');
      setIsActivityModalOpen(false);
      setActivityForm({ type: 'Phone Call', status: 'Completed', remarks: '' });
      fetchData(); // refresh timeline
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to log activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpForm.scheduledDate) return toast.error('Date is required');
    if (!followUpForm.remarks) return toast.error('Remarks are required');

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        ...followUpForm,
        customer: params.id
      });
      toast.success('Follow-up scheduled successfully!');
      setIsFollowUpModalOpen(false);
      setFollowUpForm({ type: 'Phone Call', status: 'Pending', scheduledDate: '', remarks: '' });
      fetchData(); // refresh timeline
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await interiorCrmService.updateCustomer(params.id as string, { status: newStatus });
      toast.success(`Lead moved to ${newStatus}`);
      fetchData(); // refresh to show new status and the auto-logged activity
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'site' | 'requirements' | 'designs' | 'quotations'>('overview');

  if (!checked) return null;
  if (isLoading) return <InteriorShell><div className="p-8 flex items-center justify-center text-slate-500 min-h-[60vh] font-medium animate-pulse">Loading Lead Profile...</div></InteriorShell>;
  if (!lead) return <InteriorShell><div className="p-8 text-rose-500 font-bold text-center">Lead not found.</div></InteriorShell>;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'site', label: 'Site Visits' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'designs', label: 'Designs & Files' },
    { id: 'quotations', label: 'Quotations' },
  ];

  return (
    <InteriorShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-24 p-4 md:p-8 animate-in fade-in duration-500">
        
        {/* --- 1. HERO PROFILE HEADER --- */}
        <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50 via-purple-50 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 opacity-70 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <div className="flex items-start md:items-center gap-5 z-10">
            <button 
              onClick={() => router.push('/interior-new/crm')}
              className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-2xl transition-all shadow-sm shrink-0 active:scale-95 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{lead.name}</h1>
                <span className="font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-xs font-bold border border-slate-200/60 shadow-sm">{lead.leadNumber || 'LD-XXXX'}</span> 
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-sm text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Phone size={14} className="text-blue-500" /> {lead.mobileNumber}
                </div>
                {lead.email && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Mail size={14} className="text-purple-500" /> {lead.email}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full md:w-auto">
             <div className="relative w-full sm:w-auto">
               <select 
                 value={lead.status}
                 onChange={(e) => handleStatusChange(e.target.value)}
                 className={cn(
                   "w-full sm:w-auto text-sm font-bold pl-4 pr-10 py-3 rounded-2xl border cursor-pointer shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 appearance-none outline-none transition-all",
                   lead.status === 'New Lead' ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" :
                   lead.status === 'Contacted' ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" :
                   lead.status === 'Meeting Scheduled' || lead.status === 'Measurement Done' ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" :
                   lead.status === 'Requirement Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                   lead.status === 'Quotation Sent' ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" :
                   lead.status === 'Converted' ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600" :
                   lead.status === 'Lost' ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" :
                   "bg-slate-50 text-slate-700 border-slate-200"
                 )}
               >
                 <option value="New Lead">New Lead</option>
                 <option value="Contacted">Contacted</option>
                 <option value="Meeting Scheduled">Meeting Scheduled</option>
                 <option value="Measurement Done">Measurement Done</option>
                 <option value="Requirement Completed">Requirement Completed</option>
                 <option value="Design Approved">Design Approved</option>
                 <option value="Quotation Sent">Quotation Sent</option>
                 <option value="Converted">🎉 Converted (Won)</option>
                 <option value="Lost">Lost</option>
               </select>
               <ChevronDown size={16} className={cn(
                 "absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none",
                 lead.status === 'Converted' ? "text-white" : "text-slate-400"
               )} />
             </div>
             
             <button onClick={() => setIsActivityModalOpen(true)} className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2">
               <Plus size={18} /> Log Activity
             </button>
          </div>
        </div>

        {/* --- 2. QUICK ACTIONS BAR --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button onClick={() => setIsSiteVisitModalOpen(true)} className="group flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all active:scale-95">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <MapPin size={18} />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-purple-700 transition-colors">Site Visit</span>
          </button>
          
          <button onClick={() => setIsReqModalOpen(true)} className="group flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all active:scale-95">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <PenTool size={18} />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">Requirements</span>
          </button>

          <button onClick={() => setIsDesignModalOpen(true)} className="group flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-95">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <UploadCloud size={18} />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-blue-700 transition-colors">Designs</span>
          </button>

          <button onClick={() => setIsQuotationModalOpen(true)} className="group flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all active:scale-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <Calculator size={18} />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-rose-700 transition-colors">Quote</span>
          </button>

          <button onClick={() => setIsFollowUpModalOpen(true)} className="group flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all active:scale-95">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Calendar size={18} />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-amber-700 transition-colors">Follow-up</span>
          </button>
        </div>

        {/* --- 3. TAB NAVIGATION --- */}
        <div className="flex items-center gap-8 border-b border-slate-200 overflow-x-auto scrollbar-hide px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative pb-4 text-sm font-bold transition-colors whitespace-nowrap outline-none",
                activeTab === tab.id ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="leadProfileTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* --- 4. TAB CONTENT --- */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><User size={14} /></span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Source</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{lead.leadSource || 'Manual Entry'}</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Building size={14} /></span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Property Scope</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{lead.propertyType || 'Not specified'}</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><DollarSign size={14} /></span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Budget</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{lead.budgetRange || 'Not specified'}</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <span className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><MapPin size={14} /></span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5 truncate">{lead.projectLocation || lead.city || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" /> Activity Timeline
                  </h3>
                </div>
                
                <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-8">
                  {activities.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                        <MessageSquare size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No activities logged</p>
                      <p className="text-xs text-slate-400 mt-1">Keep track of calls, meetings, and notes here.</p>
                    </div>
                  ) : (
                    activities.map((act, idx) => {
                      // Find the exact user name from the fetched users array matching the user ID or string
                      const loggedByUser = users.find(u => u._id === (act.user?._id || act.user) || u.clerkUserId === (act.user?._id || act.user));
                      const userName = loggedByUser?.name || act.user?.name || 'System';
                      const initial = userName.charAt(0).toUpperCase();

                      return (
                      <div key={act._id} className="relative group">
                        <div className={cn(
                          "absolute -left-[2.6rem] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center shadow-sm",
                          act.status === 'Pending' ? "bg-amber-400" : "bg-blue-500"
                        )}></div>
                        
                        <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                              act.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"
                            )}>
                              {act.type} {act.status === 'Pending' && '• Scheduled'}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {act.status === 'Pending' 
                                ? `Due: ${new Date(act.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` 
                                : new Date(act.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              }
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">{act.remarks}</p>
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                              {initial}
                            </div>
                            <p className="text-xs font-semibold text-slate-500">
                              {act.status === 'Pending' ? 'Scheduled by' : 'Logged by'} <span className="text-slate-700">{userName}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'site' && (
            <motion.div key="site" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!lead.siteMeasurements ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-400 mb-6 shadow-inner">
                    <Ruler size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">No Site Data</h3>
                  <p className="text-slate-500 text-sm mt-2 mb-8 max-w-sm">You haven't logged measurements or photos for this site yet. Keep all physical space data organized here.</p>
                  <button onClick={() => setIsSiteVisitModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-purple-500/30 transition-all active:scale-95">Log Site Visit Now</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="col-span-1 border border-slate-200 rounded-3xl p-6 shadow-sm self-start">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-purple-500" /> Measurements
                      </h3>
                      <button onClick={() => setIsSiteVisitModalOpen(true)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Edit</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carpet Area</p>
                        <p className="font-black text-slate-900">{lead.siteMeasurements.carpetArea || 'N/A'} <span className="text-xs text-slate-500 font-medium">Sq.Ft</span></p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ceiling</p>
                        <p className="font-black text-slate-900">{lead.siteMeasurements.ceilingHeight || 'N/A'} <span className="text-xs text-slate-500 font-medium">Ft</span></p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rooms Count</p>
                        <p className="font-black text-slate-900">{lead.siteMeasurements.rooms || 'N/A'}</p>
                      </div>
                      {lead.siteMeasurements.notes && (
                        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 col-span-2">
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1.5">Site Notes</p>
                          <p className="font-medium text-purple-900 text-sm whitespace-pre-wrap leading-relaxed">{lead.siteMeasurements.notes}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  <GlassCard className="col-span-1 lg:col-span-2 border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-500" /> Site Photos
                    </h3>
                    {lead.sitePhotos && lead.sitePhotos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {lead.sitePhotos.map((photo: string, i: number) => (
                          <div key={i} className="aspect-video md:aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all relative group">
                            <img src={photo} alt={`Site photo ${i+1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <ImageIcon className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">No photos uploaded</p>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requirements' && (
            <motion.div key="requirements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!lead.requirements || lead.requirements.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
                    <PenTool size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">No Requirements</h3>
                  <p className="text-slate-500 text-sm mt-2 mb-8 max-w-sm">Capture room-by-room needs, themes, and specific client requests here.</p>
                  <button onClick={() => setIsReqModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95">Log Requirements Now</button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-emerald-500" /> Room-by-Room Breakdown
                    </h3>
                    <button onClick={() => setIsReqModalOpen(true)} className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors">Edit Plan</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lead.requirements.map((req: any, index: number) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-emerald-200 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{req.roomName}</h4>
                          {req.theme && <span className="text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-emerald-600 shadow-sm">{req.theme}</span>}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{req.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'designs' && (
            <motion.div key="designs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!lead.designFiles || lead.designFiles.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 mb-6 shadow-inner">
                    <UploadCloud size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">No Designs</h3>
                  <p className="text-slate-500 text-sm mt-2 mb-8 max-w-sm">Upload 2D layouts, 3D renders, or reference PDFs to share with the client.</p>
                  <button onClick={() => setIsDesignModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95">Upload Design Files</button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-blue-500" /> Files & Renders
                    </h3>
                    <button onClick={() => setIsDesignModalOpen(true)} className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl transition-colors">Upload More</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {lead.designFiles.map((file: any, index: number) => (
                      <a key={index} href={file.url} target="_blank" rel="noreferrer" className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all group">
                        <div className={`h-40 flex items-center justify-center relative overflow-hidden ${file.fileType === 'pdf' ? 'bg-red-50 text-red-300' : 'bg-slate-100 text-slate-300'}`}>
                          {file.fileType === 'pdf' ? <FileIcon size={48} className="group-hover:scale-110 transition-transform" /> : (
                            file.url.startsWith('data:image') ? <img src={file.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <ImageIcon size={48} className="group-hover:scale-110 transition-transform" />
                          )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 ${file.fileType === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {file.fileType === 'pdf' ? <FileIcon size={16} /> : <ImageIcon size={16} />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-bold text-sm text-slate-900 truncate">{file.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'quotations' && (
            <motion.div key="quotations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!lead.quotations || lead.quotations.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center">
                  <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-400 mb-6 shadow-inner">
                    <FileText size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">No Quotes Yet</h3>
                  <p className="text-slate-500 text-sm mt-2 mb-8 max-w-sm">Create professional, itemized quotes to secure this project.</p>
                  <button onClick={() => setIsQuotationModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95">Generate First Quote</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {lead.quotations.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {lead.quotations.map((q: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveQuotationIndex(idx)}
                          className={cn(
                            "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 whitespace-nowrap",
                            activeQuotationIndex === idx 
                              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          )}
                        >
                          Version {q.version}
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                            q.status === 'Accepted' ? 'bg-emerald-500 text-white' : 
                            q.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
                          )}>
                            {q.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <QuotationPreview 
                      lead={lead} 
                      quotationIndex={activeQuotationIndex} 
                      onSuccess={fetchData} 
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODALS --- */}
      {/* Log Activity Modal */}
      <AnimatePresence>
        {isActivityModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsActivityModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Log Activity</h2>
                  <p className="text-sm text-slate-500 mt-1">Record a touchpoint with {lead.name}</p>
                </div>
                <button onClick={() => setIsActivityModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-2xl bg-slate-50 transition-colors"><X size={20} className="text-slate-500" /></button>
              </div>

              <form onSubmit={handleActivitySubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Type</label>
                  <select 
                    value={activityForm.type}
                    onChange={e => setActivityForm({...activityForm, type: e.target.value})}
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit", "Email", "Status Change"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Remarks / Summary</label>
                  <textarea 
                    required
                    rows={4}
                    value={activityForm.remarks}
                    onChange={e => setActivityForm({...activityForm, remarks: e.target.value})}
                    placeholder="E.g., Client wants a modern theme, budget is strict. Next meeting next week."
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                    {isSubmitting ? 'Saving...' : 'Save Activity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Follow-up Modal */}
      <AnimatePresence>
        {isFollowUpModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFollowUpModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Schedule Follow-up</h2>
                  <p className="text-sm text-slate-500 mt-1">Plan a future touchpoint with {lead.name}</p>
                </div>
                <button onClick={() => setIsFollowUpModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-2xl bg-slate-50 transition-colors"><X size={20} className="text-slate-500" /></button>
              </div>

              <form onSubmit={handleFollowUpSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Follow-up Type</label>
                    <select 
                      value={followUpForm.type}
                      onChange={e => setFollowUpForm({...followUpForm, type: e.target.value})}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    >
                      {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date & Time</label>
                    <input 
                      type="datetime-local"
                      required
                      value={followUpForm.scheduledDate}
                      onChange={e => setFollowUpForm({...followUpForm, scheduledDate: e.target.value})}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Goal / Notes</label>
                  <textarea 
                    required
                    rows={4}
                    value={followUpForm.remarks}
                    onChange={e => setFollowUpForm({...followUpForm, remarks: e.target.value})}
                    placeholder="E.g., Call to discuss revised quotation..."
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsFollowUpModalOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                    {isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InteriorLogSiteVisitModal 
        isOpen={isSiteVisitModalOpen} 
        onClose={() => setIsSiteVisitModalOpen(false)} 
        customerId={params.id as string} 
        onSuccess={fetchData} 
        users={users}
      />
      <InteriorLogRequirementsModal
        isOpen={isReqModalOpen}
        onClose={() => setIsReqModalOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorUploadDesignModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        existingFiles={lead?.designFiles || []}
      />
      <InteriorQuotationBuilderModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        customerId={params.id as string}
        existingQuotations={lead?.quotations || []}
        onSuccess={fetchData}
      />
    </InteriorShell>
  );
}