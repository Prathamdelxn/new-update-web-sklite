'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Printer, Mail, CheckCircle2, XCircle, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { QuotationPreview } from '@/components/crm/QuotationPreview';
import { InteriorSendQuotationModal } from './InteriorSendQuotationModal';
import { cn } from '@/lib/utils';

interface InteriorQuotationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  quotationIndex: number | null;
  onSuccess: () => void;
}

export function InteriorQuotationPreviewModal({
  isOpen,
  onClose,
  lead,
  quotationIndex,
  onSuccess,
}: InteriorQuotationPreviewModalProps) {
  const toast = useToast();
  const { confirm, prompt } = useConfirm();
  const router = useRouter();
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen || quotationIndex === null || !lead?.quotations?.[quotationIndex]) return null;

  const quote = lead.quotations[quotationIndex];
  const quoteTitle = quote?.title || `Quotation #${quotationIndex + 1}`;
  const status = quote?.status || 'Generated';
  const isConverted = lead?.status === 'Won' || lead?.status === 'Converted' || lead?.status === 'Lost' || !!lead?.linkedProject;

  const handleSendEmail = () => {
    setIsSendModalOpen(true);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const updatedQuotations = [...lead.quotations];
      updatedQuotations[quotationIndex] = { ...quote, status: newStatus };

      let nextLeadStatus = lead.status;
      if (newStatus === 'Accepted') {
        nextLeadStatus = 'Booking Pending';
      } else if (newStatus === 'Rejected') {
        nextLeadStatus = 'Under Quotation';
      }

      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
        status: nextLeadStatus,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Quotation v${quote.version || quotationIndex + 1} (${quote.title || 'Option ' + (quotationIndex + 1)}) marked as ${newStatus}`,
      });

      toast.success(`Quotation marked as ${newStatus}.`);
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update quotation status');
    }
  };

  const handleConvertToProject = async () => {
    const ok = await confirm({
      title: 'Convert Lead to Project',
      message: 'Are you sure you want to convert this Lead into an active Project? This will hand it over to the Execution team.',
      confirmText: 'Convert',
      type: 'warning',
    });
    if (!ok) return;

    setIsConverting(true);
    try {
      await interiorCrmService.convertCustomer(lead._id, { quotationIndex });
      toast.success('🎉 Successfully converted to Project!');
      router.push('/interior-new/crm');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to convert to project');
      setIsConverting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Accepted':
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Sent':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Generated':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-5xl my-auto bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
            {/* Title & Status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {quoteTitle}
                </h3>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", getStatusBadge(status))}>
                  {status}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Content: Pure A4 Document */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/40">
            <QuotationPreview
              lead={lead}
              quotationIndex={quotationIndex}
              hideToolbar={true}
              onSuccess={onSuccess}
            />
          </div>
        </motion.div>
      </div>

      {isSendModalOpen && (
        <InteriorSendQuotationModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          customerId={lead._id}
          customerName={lead.name}
          customerEmail={lead.email}
          customerPhone={lead.phone}
          quotation={quote}
          quotationIndex={quotationIndex}
          onSuccess={() => {
            onSuccess();
            setIsSendModalOpen(false);
          }}
        />
      )}
    </AnimatePresence>
  );
}
