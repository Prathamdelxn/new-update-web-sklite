'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api.client';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

import {
  UserCheck,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Building,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  X,
  Send,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  Briefcase,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';

interface Lead {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  propertyType: string;
  budget: string;
  stage: 'New Lead' | 'Consultation Scheduled' | 'Proposal Sent' | 'Contract Signed' | 'Lost';
  consultationDate: string;
  avatarColor: string;
}

const INITIAL_LEADS: Lead[] = [
  {
    id: '1',
    clientName: 'Vikram & Radhika Mehta',
    email: 'vikram.mehta@gmail.com',
    phone: '+1 (555) 234-8901',
    propertyType: 'Luxury Penthouse (450 m²)',
    budget: '$120,000',
    stage: 'Contract Signed',
    consultationDate: 'Jul 24, 2026',
    avatarColor: 'bg-emerald-600'
  },
  {
    id: '2',
    clientName: 'Sophie Turner',
    email: 'sophie.t@designcorp.com',
    phone: '+1 (555) 876-1234',
    propertyType: 'Residential Villa (600 m²)',
    budget: '$250,000',
    stage: 'Proposal Sent',
    consultationDate: 'Jul 28, 2026',
    avatarColor: 'bg-blue-600'
  },
  {
    id: '3',
    clientName: 'Apex Capital Offices',
    email: 'contact@apexcap.com',
    phone: '+1 (555) 432-9087',
    propertyType: 'Executive Office Suite (800 m²)',
    budget: '$180,000',
    stage: 'Consultation Scheduled',
    consultationDate: 'Jul 31, 2026',
    avatarColor: 'bg-indigo-600'
  },
  {
    id: '4',
    clientName: 'Julian Rossi',
    email: 'julian.rossi@luxury.it',
    phone: '+1 (555) 345-6789',
    propertyType: 'Boutique Hotel Lobby',
    budget: '$300,000',
    stage: 'New Lead',
    consultationDate: 'Aug 02, 2026',
    avatarColor: 'bg-sky-600'
  }
];

const STAGE_BADGES: Record<string, string> = {
  'New Lead': 'bg-sky-50 text-sky-700 border-sky-200',
  'Consultation Scheduled': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Proposal Sent': 'bg-amber-50 text-amber-700 border-amber-200',
  'Contract Signed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Lost': 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function InteriorCRMPage() {
  const toast = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyType, setPropertyType] = useState('Residential Villa');
  const [budget, setBudget] = useState('$50,000');
  const [stage, setStage] = useState<Lead['stage']>('New Lead');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data } = await api.get('/crm/customers');
        const mappedLeads = data.map((d: any) => ({
          id: d._id,
          clientName: d.name,
          email: d.email || 'N/A',
          phone: d.mobileNumber,
          propertyType: d.propertyType || 'N/A',
          budget: d.budgetRange || '$0',
          stage: d.status,
          consultationDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A',
          avatarColor: 'bg-blue-600'
        }));
        setLeads(mappedLeads);
      } catch (error) {
        toast.error('Failed to load leads from database');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeads();
  }, [toast]);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.propertyType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'All' || l.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !email.trim()) return toast.error('Please enter client name and email.');

    setIsSubmitting(true);
    try {
      const payload = {
        name: clientName.trim(),
        email: email.trim(),
        mobileNumber: phone.trim() || '+1 (555) 000-0000',
        propertyType: propertyType.includes('Villa') ? 'Villa' : propertyType.includes('Penthouse') ? 'Flat' : 'Other',
        budgetRange: budget.startsWith('$') ? budget : `$${budget}`,
        status: stage,
        leadSource: 'Other'
      };

      await api.post('/crm/customers', payload);
      
      setIsModalOpen(false);
      setClientName('');
      setEmail('');
      setPhone('');
      toast.success(`Client lead for "${clientName}" created!`);

      // Refresh list
      const { data } = await api.get('/crm/customers');
      const mappedLeads = data.map((d: any) => ({
        id: d._id,
        clientName: d.name,
        email: d.email || 'N/A',
        phone: d.mobileNumber,
        propertyType: d.propertyType || 'N/A',
        budget: d.budgetRange || '$0',
        stage: d.status,
        consultationDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A',
        avatarColor: 'bg-blue-600'
      }));
      setLeads(mappedLeads);

    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-4 pb-12">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
              <span>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-bold">Client CRM</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Client CRM & Consultations
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Track interior client leads, consultation schedules, budget proposals, and contract sign-offs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Client Lead
          </button>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Total Pipeline</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{leads.length} <span className="text-xs font-normal text-slate-400">leads</span></p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Consultations</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">3 <span className="text-xs font-normal text-slate-400">this week</span></p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Est. Pipeline Value</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">$850K</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Conversion Rate</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">85%</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client or property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium outline-none focus:border-blue-600 transition"
            >
              <option value="All">All Pipeline Stages</option>
              <option value="New Lead">New Lead</option>
              <option value="Consultation Scheduled">Consultation Scheduled</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Contract Signed">Contract Signed</option>
            </select>

            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-lg transition",
                  viewMode === 'table' ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-700"
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "p-1.5 rounded-lg transition",
                  viewMode === 'kanban' ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-700"
                )}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <GlassCard className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Client Name</th>
                    <th className="py-3.5 px-4">Property Type</th>
                    <th className="py-3.5 px-4">Est. Budget</th>
                    <th className="py-3.5 px-4">Pipeline Stage</th>
                    <th className="py-3.5 px-4">Consultation</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No client leads found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-2xs",
                              lead.avatarColor
                            )}>
                              {lead.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{lead.clientName}</p>
                              <p className="text-[11px] text-slate-500 truncate">{lead.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-semibold text-slate-700">
                          {lead.propertyType}
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900">
                          {lead.budget}
                        </td>

                        <td className="py-4 px-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            STAGE_BADGES[lead.stage] || 'bg-slate-50 text-slate-700'
                          )}>
                            {lead.stage}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-slate-500 text-[11px]">
                          {lead.consultationDate}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => toast.success(`Calling ${lead.clientName}...`)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl transition"
                          >
                            <Phone className="w-3.5 h-3.5" /> Contact
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* KANBAN BOARD VIEW */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['New Lead', 'Consultation Scheduled', 'Proposal Sent', 'Contract Signed'].map((stageName) => {
              const stageLeads = filteredLeads.filter(l => l.stage === stageName);
              return (
                <div key={stageName} className="space-y-3 bg-slate-50/60 border border-slate-200/70 p-3.5 rounded-3xl min-h-[400px]">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">{stageName}</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 truncate">{lead.clientName}</p>
                          <span className="text-xs font-bold text-blue-600">{lead.budget}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{lead.propertyType}</p>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{lead.consultationDate}</span>
                          <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => toast.success(`Viewing ${lead.clientName}`)}>View Details &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add New Client Lead</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Mehta"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="client@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Est. Budget</label>
                  <input
                    type="text"
                    placeholder="$150,000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Property & Project Scope</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                >
                  <option value="Residential Villa (500 m²)">Residential Villa Fit-out</option>
                  <option value="Luxury Penthouse Apartment">Luxury Penthouse Apartment</option>
                  <option value="Commercial Executive Office">Commercial Executive Office</option>
                  <option value="Hospitality / Retail Suite">Hospitality / Retail Suite</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  <Send className="w-4 h-4" /> Save Client Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
