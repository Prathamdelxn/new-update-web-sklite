'use client';

// =============================================================================
// Sky-Lite Web — Daily Progress Reports (DPR) View
// Complete official DPR creation, management & PDF generation (Veelee Creations layout)
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Calendar,
  CloudSun,
  Users,
  Plus,
  Trash2,
  X,
  Loader2,
  Download,
  Printer,
  Eye,
  ChevronRight,
  PackageCheck,
  CalendarClock,
  ClipboardList,
  MessageSquareQuote,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { downloadDprPdf, printDpr, DPRData } from '@/features/interior-new/utils/dprPdfGenerator';
import { DprPdfPreviewModal } from '@/features/interior-new/components/projects/DprPdfPreviewModal';

interface InteriorDprViewProps {
  projectId: string;
}

export default function InteriorDprView({ projectId }: InteriorDprViewProps) {
  const toast = useToast();

  const [project, setProject] = useState<any>(null);
  const [dprs, setDprs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Preview Modal
  const [previewDpr, setPreviewDpr] = useState<DPRData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form Active Tab
  const [activeFormTab, setActiveFormTab] = useState<'labour' | 'receipts' | 'tomorrow' | 'requirements'>('labour');

  // Form Fields
  const [dprDate, setDprDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Sunny');

  // 1. Labour Report & Ongoing Work Status
  const [labourReports, setLabourReports] = useState<any[]>([
    { agencyActivity: 'Electrical - Wall Chasing & Conduit Piping', skilled: 2, unskilled: 1, currentWork: '1st Floor Master Bedroom conduit work', statusAsPerBarChart: 'On Track' },
    { agencyActivity: 'Carpentry - Wardrobe Carcass Assembly', skilled: 3, unskilled: 1, currentWork: 'Living Room TV unit framing', statusAsPerBarChart: '80%' },
  ]);

  // 2. Material Receipt Details
  const [materialReceipts, setMaterialReceipts] = useState<any[]>([
    { supplierName: 'Sri Balaji Plywoods', challanNo: 'DC-9042', receiptNo: 'MR-108', materialDetails: '18mm Century Marine Ply (710 grade)', uom: 'Sheets', qty: 25 },
  ]);

  // 3. Tomorrow's Planning
  const [tomorrowPlanning, setTomorrowPlanning] = useState<any[]>([
    { agencyActivity: 'Carpentry - Lamination Work', skilled: 2, unskilled: 1, targetedWorks: 'Start laminate pressing for wardrobe shutters', remarkConcern: 'Require adhesive delivery by 10 AM' },
    { agencyActivity: 'Electrical - Switch Board Box Fixing', skilled: 2, unskilled: 0, targetedWorks: 'Kitchen & Dining conduit wiring pull', remarkConcern: 'None' },
  ]);

  // 4. Material Requirement
  const [materialRequirements, setMaterialRequirements] = useState<any[]>([
    { materialDescription: 'Fevicol Marine Adhesive (50kg)', uom: 'Can', qty: 2 },
    { materialDescription: '1mm SF Decorative Laminate (L-904)', uom: 'Sheets', qty: 15 },
  ]);

  // 5. Site Instructions / MOMs
  const [siteInstructions, setSiteInstructions] = useState('');

  // Fetch Project details & DPRs
  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, dprRes] = await Promise.allSettled([
        interiorProjectService.getProjectDetails(projectId),
        interiorProjectService.getDprs(projectId),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setProject(projRes.value.data);
      }
      if (dprRes.status === 'fulfilled' && dprRes.value?.data) {
        setDprs(dprRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load DPRs:', err);
      toast.error('Failed to load Daily Progress Reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  // ---------------------------------------------------------------------------
  // Labour Row Helpers
  // ---------------------------------------------------------------------------
  const addLabourRow = () => {
    setLabourReports([
      ...labourReports,
      { agencyActivity: '', skilled: 1, unskilled: 0, currentWork: '', statusAsPerBarChart: 'In Progress' },
    ]);
  };
  const removeLabourRow = (idx: number) => {
    setLabourReports(labourReports.filter((_, i) => i !== idx));
  };
  const updateLabourRow = (idx: number, field: string, val: any) => {
    const updated = [...labourReports];
    updated[idx][field] = val;
    setLabourReports(updated);
  };

  // ---------------------------------------------------------------------------
  // Material Receipt Row Helpers
  // ---------------------------------------------------------------------------
  const addMaterialReceiptRow = () => {
    setMaterialReceipts([
      ...materialReceipts,
      { supplierName: '', challanNo: '', receiptNo: '', materialDetails: '', uom: 'Nos', qty: 1 },
    ]);
  };
  const removeMaterialReceiptRow = (idx: number) => {
    setMaterialReceipts(materialReceipts.filter((_, i) => i !== idx));
  };
  const updateMaterialReceiptRow = (idx: number, field: string, val: any) => {
    const updated = [...materialReceipts];
    updated[idx][field] = val;
    setMaterialReceipts(updated);
  };

  // ---------------------------------------------------------------------------
  // Tomorrow Planning Row Helpers
  // ---------------------------------------------------------------------------
  const addTomorrowPlanningRow = () => {
    setTomorrowPlanning([
      ...tomorrowPlanning,
      { agencyActivity: '', skilled: 1, unskilled: 0, targetedWorks: '', remarkConcern: '' },
    ]);
  };
  const removeTomorrowPlanningRow = (idx: number) => {
    setTomorrowPlanning(tomorrowPlanning.filter((_, i) => i !== idx));
  };
  const updateTomorrowPlanningRow = (idx: number, field: string, val: any) => {
    const updated = [...tomorrowPlanning];
    updated[idx][field] = val;
    setTomorrowPlanning(updated);
  };

  // ---------------------------------------------------------------------------
  // Material Requirement Row Helpers
  // ---------------------------------------------------------------------------
  const addMaterialRequirementRow = () => {
    setMaterialRequirements([
      ...materialRequirements,
      { materialDescription: '', uom: 'Nos', qty: 1 },
    ]);
  };
  const removeMaterialRequirementRow = (idx: number) => {
    setMaterialRequirements(materialRequirements.filter((_, i) => i !== idx));
  };
  const updateMaterialRequirementRow = (idx: number, field: string, val: any) => {
    const updated = [...materialRequirements];
    updated[idx][field] = val;
    setMaterialRequirements(updated);
  };

  // ---------------------------------------------------------------------------
  // Submit DPR
  // ---------------------------------------------------------------------------
  const handleSubmitDpr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dprDate) {
      toast.error('Please select a DPR date');
      return;
    }

    try {
      setSubmitting(true);

      // Backwards compatible payload for legacy backend & new backend
      const legacyManpower = labourReports.map((l) => ({
        trade: l.agencyActivity || 'General',
        count: (Number(l.skilled) || 0) + (Number(l.unskilled) || 0),
        contractor: l.agencyActivity?.split('-')[0]?.trim() || 'Vendor',
      }));

      const legacyActivities = labourReports.map((l) => ({
        category: l.agencyActivity?.split('-')[0]?.trim() || 'General',
        description: l.currentWork || l.agencyActivity || 'Daily task',
        plannedProgress: 100,
        actualProgress: parseInt(l.statusAsPerBarChart) || 50,
        remarks: l.statusAsPerBarChart || '',
      }));

      const payload = {
        date: new Date(dprDate),
        weather,
        projectName: project?.name,
        // New structured fields
        labourReports,
        materialReceipts: materialReceipts.filter((m) => m.supplierName || m.materialDetails),
        tomorrowPlanning: tomorrowPlanning.filter((t) => t.agencyActivity || t.targetedWorks),
        materialRequirements: materialRequirements.filter((r) => r.materialDescription),
        siteInstructions,
        // Legacy fallback fields
        manpower: legacyManpower.length > 0 ? legacyManpower : [{ trade: 'General', count: 1, contractor: 'Vendor' }],
        activities: legacyActivities.length > 0 ? legacyActivities : [{ category: 'Site Work', description: 'General inspection', plannedProgress: 100, actualProgress: 100, remarks: '' }],
      };

      const res = await interiorProjectService.createDpr(projectId, payload);
      if (res?.success) {
        toast.success('Daily Progress Report submitted successfully');
        setIsFormOpen(false);
        // Refresh list
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PDF Export Handlers
  // ---------------------------------------------------------------------------
  const handleDownloadPdf = async (dpr: any) => {
    try {
      setDownloadingId(dpr._id || 'direct');
      await downloadDprPdf(dpr, project);
      toast.success('DPR PDF generated & downloaded successfully');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to download PDF: ' + (err?.message || err));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenPreview = (dpr: any) => {
    setPreviewDpr(dpr);
    setIsPreviewOpen(true);
  };

  const handlePrintDpr = (dpr: any) => {
    printDpr(dpr, project);
  };

  const handleDownloadBlankTemplate = async () => {
    const blankDpr: DPRData = {
      date: new Date(),
      projectName: project?.name || 'Project Name',
      labourReports: [],
      materialReceipts: [],
      tomorrowPlanning: [],
      materialRequirements: [],
      siteInstructions: '',
    };
    await downloadDprPdf(blankDpr, project);
    toast.success('Blank DPR template downloaded');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Daily Progress Reports (DPR)</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Veelee Creations Standard
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Site log, manpower status, material receipt, tomorrow planning & PDF generation for{' '}
            <strong className="text-[hsl(var(--foreground))]">{project?.name || 'Project'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadBlankTemplate} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Blank Template PDF</span>
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Log New DPR
          </Button>
        </div>
      </div>

      {/* DPR List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading Daily Progress Reports...</p>
        </div>
      ) : dprs.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[hsl(var(--foreground))] mb-1">No DPRs Recorded Yet</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-6">
            Log site manpower, ongoing work progress, materials received, and tomorrow&apos;s planning. Click below to generate your first official DPR report.
          </p>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create First DPR
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {dprs.map((dpr) => {
            const dateFormatted = new Date(dpr.date).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            // Calculate total manpower
            const labourList = dpr.labourReports && dpr.labourReports.length > 0
              ? dpr.labourReports
              : (dpr.manpower || []);
            const totalWorkers = dpr.labourReports && dpr.labourReports.length > 0
              ? dpr.labourReports.reduce((acc: number, curr: any) => acc + (Number(curr.skilled) || 0) + (Number(curr.unskilled) || 0), 0)
              : (dpr.manpower || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);

            const matReceiptCount = dpr.materialReceipts?.length || 0;
            const tomorrowCount = dpr.tomorrowPlanning?.length || 0;
            const matReqCount = dpr.materialRequirements?.length || 0;

            return (
              <Card
                key={dpr._id}
                className="overflow-hidden border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] transition-all shadow-sm hover:shadow-md"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-semibold">{dateFormatted}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--muted)/0.5)] text-xs text-[hsl(var(--foreground))]">
                        <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                        <span>{dpr.weather || 'Sunny'}</span>
                      </div>
                    </div>

                    {/* PDF Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreview(dpr)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview Sheet
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintDpr(dpr)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownloadPdf(dpr)}
                        disabled={downloadingId === dpr._id}
                        className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {downloadingId === dpr._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download PDF</span>
                      </Button>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Total Manpower</p>
                      <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-0.5 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-500" />
                        {totalWorkers} workers
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Ongoing Works</p>
                      <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-0.5 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-emerald-500" />
                        {labourList.length} activities
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Materials Received</p>
                      <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-0.5 flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-purple-500" />
                        {matReceiptCount} items
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Tomorrow Planned</p>
                      <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-0.5 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-amber-500" />
                        {tomorrowCount} tasks
                      </p>
                    </div>
                  </div>

                  {/* Labour Activities Preview */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Labour Report & Ongoing Work Status
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {dpr.labourReports && dpr.labourReports.length > 0 ? (
                        dpr.labourReports.map((row: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[hsl(var(--foreground))]">{row.agencyActivity}</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                {row.statusAsPerBarChart || 'In Progress'}
                              </span>
                            </div>
                            <p className="text-[hsl(var(--muted-foreground))]">{row.currentWork}</p>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] flex gap-3 pt-0.5">
                              <span>Skilled: <strong className="text-[hsl(var(--foreground))]">{row.skilled || 0}</strong></span>
                              <span>Unskilled: <strong className="text-[hsl(var(--foreground))]">{row.unskilled || 0}</strong></span>
                            </div>
                          </div>
                        ))
                      ) : (dpr.activities || []).map((act: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[hsl(var(--foreground))]">{act.category}</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold text-[10px]">
                              {act.actualProgress}%
                            </span>
                          </div>
                          <p className="text-[hsl(var(--muted-foreground))]">{act.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Site Instructions if any */}
                  {dpr.siteInstructions && (
                    <div className="p-3 rounded-lg bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] text-xs">
                      <div className="font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 mb-1">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-blue-500" />
                        Site Instructions / MOMs:
                      </div>
                      <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-line">{dpr.siteInstructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DPR LOG MODAL (Multi-Tab Structured Form) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-3xl max-h-[90vh] flex flex-col border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Log Daily Progress Report (DPR)</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Veelee Creations Format • {project?.name || 'Site Project'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Navigation Tabs */}
              <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveFormTab('labour')}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                    activeFormTab === 'labour'
                      ? 'border-blue-600 text-blue-600 bg-[hsl(var(--background))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  1. Labour & Works ({labourReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('receipts')}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                    activeFormTab === 'receipts'
                      ? 'border-blue-600 text-blue-600 bg-[hsl(var(--background))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  2. Material Receipts ({materialReceipts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('tomorrow')}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                    activeFormTab === 'tomorrow'
                      ? 'border-blue-600 text-blue-600 bg-[hsl(var(--background))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  3. Tomorrow&apos;s Plan ({tomorrowPlanning.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('requirements')}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                    activeFormTab === 'requirements'
                      ? 'border-blue-600 text-blue-600 bg-[hsl(var(--background))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  4. Requirements & MOMs
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitDpr} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                  {/* Basic Info Bar (Always Visible) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">DPR Date *</label>
                      <Input
                        required
                        type="date"
                        value={dprDate}
                        onChange={(e) => setDprDate(e.target.value)}
                        className="bg-[hsl(var(--background))]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">Weather Conditions</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={weather}
                        onChange={(e) => setWeather(e.target.value)}
                      >
                        <option value="Sunny">Sunny</option>
                        <option value="Clear / Pleasant">Clear / Pleasant</option>
                        <option value="Cloudy">Cloudy</option>
                        <option value="Rainy">Rainy</option>
                        <option value="Heavy Wind / Thunderstorm">Heavy Wind / Thunderstorm</option>
                      </select>
                    </div>
                  </div>

                  {/* TAB 1: LABOUR REPORT & ONGOING WORK STATUS */}
                  {activeFormTab === 'labour' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                            Labour Report & Ongoing Work Status
                          </h4>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                            Track agency activity, skilled / unskilled headcount, and ongoing task status.
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addLabourRow} className="gap-1 text-xs">
                          <Plus className="w-3.5 h-3.5" />
                          Add Row
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {labourReports.map((row, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] space-y-3 relative"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-[hsl(var(--muted-foreground))]">
                              <span>Entry #{idx + 1}</span>
                              {labourReports.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLabourRow(idx)}
                                  className="text-red-500 hover:text-red-600 p-1 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Agency - Activity *</label>
                                <Input
                                  required
                                  placeholder="e.g. Electrical - Conduit Piping / Carpentry"
                                  value={row.agencyActivity}
                                  onChange={(e) => updateLabourRow(idx, 'agencyActivity', e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Skilled</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Skilled"
                                    value={row.skilled}
                                    onChange={(e) => updateLabourRow(idx, 'skilled', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Unskilled</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Unskilled"
                                    value={row.unskilled}
                                    onChange={(e) => updateLabourRow(idx, 'unskilled', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Current Ongoing Work *</label>
                                <Input
                                  required
                                  placeholder="e.g. Living room wall chasing, bedroom conduit pull"
                                  value={row.currentWork}
                                  onChange={(e) => updateLabourRow(idx, 'currentWork', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Status as per Bar Chart</label>
                                <Input
                                  placeholder="e.g. On Track / 70% / Delayed"
                                  value={row.statusAsPerBarChart}
                                  onChange={(e) => updateLabourRow(idx, 'statusAsPerBarChart', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: MATERIAL RECEIPT DETAILS */}
                  {activeFormTab === 'receipts' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                            Material Receipt Details
                          </h4>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                            Log goods / materials delivered to site with challan & receipt numbers.
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addMaterialReceiptRow} className="gap-1 text-xs">
                          <Plus className="w-3.5 h-3.5" />
                          Add Receipt
                        </Button>
                      </div>

                      {materialReceipts.length === 0 ? (
                        <div className="p-6 text-center border border-dashed rounded-xl text-xs text-[hsl(var(--muted-foreground))]">
                          No materials delivered today. Click &quot;Add Receipt&quot; if site received materials.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {materialReceipts.map((row, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] space-y-3 relative"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-[hsl(var(--muted-foreground))]">
                                <span>Material Item #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeMaterialReceiptRow(idx)}
                                  className="text-red-500 hover:text-red-600 p-1 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Name of Supplier</label>
                                  <Input
                                    placeholder="e.g. Sri Balaji Hardware"
                                    value={row.supplierName}
                                    onChange={(e) => updateMaterialReceiptRow(idx, 'supplierName', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Delivery Challan No</label>
                                  <Input
                                    placeholder="e.g. DC-1049"
                                    value={row.challanNo}
                                    onChange={(e) => updateMaterialReceiptRow(idx, 'challanNo', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Material Receipt No</label>
                                  <Input
                                    placeholder="e.g. MR-084"
                                    value={row.receiptNo}
                                    onChange={(e) => updateMaterialReceiptRow(idx, 'receiptNo', e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="sm:col-span-2 space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Material Details</label>
                                  <Input
                                    placeholder="e.g. 18mm Marine Plywood (BWP Grade)"
                                    value={row.materialDetails}
                                    onChange={(e) => updateMaterialReceiptRow(idx, 'materialDetails', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">UOM</label>
                                  <Input
                                    placeholder="e.g. Sheets / Nos / Bags"
                                    value={row.uom}
                                    onChange={(e) => updateMaterialReceiptRow(idx, 'uom', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Qty</label>
                                  <Input
                                    placeholder="e.g. 20"
                                    value={row.qty}
                                    onChange={(e) => updateMaterialReceiptRow(idx, 'qty', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: TOMORROW'S PLANNING */}
                  {activeFormTab === 'tomorrow' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                            Tomorrow&apos;s Planning
                          </h4>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                            Schedule targets, agency manpower requirements, and potential site concerns.
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addTomorrowPlanningRow} className="gap-1 text-xs">
                          <Plus className="w-3.5 h-3.5" />
                          Add Plan Row
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {tomorrowPlanning.map((row, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] space-y-3 relative"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-[hsl(var(--muted-foreground))]">
                              <span>Tomorrow Target #{idx + 1}</span>
                              {tomorrowPlanning.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTomorrowPlanningRow(idx)}
                                  className="text-red-500 hover:text-red-600 p-1 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Agency - Activity</label>
                                <Input
                                  placeholder="e.g. POP / False Ceiling Framing"
                                  value={row.agencyActivity}
                                  onChange={(e) => updateTomorrowPlanningRow(idx, 'agencyActivity', e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Skilled Req</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Skilled"
                                    value={row.skilled}
                                    onChange={(e) => updateTomorrowPlanningRow(idx, 'skilled', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Unskilled Req</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Unskilled"
                                    value={row.unskilled}
                                    onChange={(e) => updateTomorrowPlanningRow(idx, 'unskilled', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Targeted Works</label>
                                <Input
                                  placeholder="e.g. Master Bedroom perimeter GI channel fixing"
                                  value={row.targetedWorks}
                                  onChange={(e) => updateTomorrowPlanningRow(idx, 'targetedWorks', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Remark / Concern</label>
                                <Input
                                  placeholder="e.g. Require drawing confirmation"
                                  value={row.remarkConcern}
                                  onChange={(e) => updateTomorrowPlanningRow(idx, 'remarkConcern', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: MATERIAL REQUIREMENT & SITE INSTRUCTIONS */}
                  {activeFormTab === 'requirements' && (
                    <div className="space-y-6">
                      {/* Material Requirement */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                              Material Requirement (Site Requisition)
                            </h4>
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                              Materials requested for upcoming days on site.
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addMaterialRequirementRow} className="gap-1 text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            Add Item
                          </Button>
                        </div>

                        <div className="space-y-2.5">
                          {materialRequirements.map((row, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] w-5 text-center">{idx + 1}</span>
                              <div className="flex-1">
                                <Input
                                  placeholder="Material Description (e.g. 1mm Laminate L-904)"
                                  value={row.materialDescription}
                                  onChange={(e) => updateMaterialRequirementRow(idx, 'materialDescription', e.target.value)}
                                />
                              </div>
                              <div className="w-24">
                                <Input
                                  placeholder="UOM"
                                  value={row.uom}
                                  onChange={(e) => updateMaterialRequirementRow(idx, 'uom', e.target.value)}
                                />
                              </div>
                              <div className="w-20">
                                <Input
                                  placeholder="Qty"
                                  value={row.qty}
                                  onChange={(e) => updateMaterialRequirementRow(idx, 'qty', e.target.value)}
                                />
                              </div>
                              {materialRequirements.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMaterialRequirementRow(idx)}
                                  className="text-red-500 hover:text-red-600 p-1.5 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Site Instructions / MOMs */}
                      <div className="space-y-2 pt-3 border-t border-[hsl(var(--border))]">
                        <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                          Site Instructions / MOMs (Minutes of Meeting)
                        </label>
                        <textarea
                          rows={4}
                          value={siteInstructions}
                          onChange={(e) => setSiteInstructions(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-sans"
                          placeholder="Enter architect instructions, client site directives, safety notices, or meeting action items..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                  <div className="flex items-center gap-2">
                    {activeFormTab !== 'labour' && (
                      <Button
                        variant="outline"
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (activeFormTab === 'requirements') setActiveFormTab('tomorrow');
                          else if (activeFormTab === 'tomorrow') setActiveFormTab('receipts');
                          else if (activeFormTab === 'receipts') setActiveFormTab('labour');
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    {activeFormTab !== 'requirements' && (
                      <Button
                        variant="outline"
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (activeFormTab === 'labour') setActiveFormTab('receipts');
                          else if (activeFormTab === 'receipts') setActiveFormTab('tomorrow');
                          else if (activeFormTab === 'tomorrow') setActiveFormTab('requirements');
                        }}
                      >
                        Next Section
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      <span>Save & Generate DPR</span>
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DPR PDF PREVIEW MODAL */}
      {/* ========================================================================= */}
      <DprPdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        dpr={previewDpr}
        project={project}
      />
    </div>
  );
}
