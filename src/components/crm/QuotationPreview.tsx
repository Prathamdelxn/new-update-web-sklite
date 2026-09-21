'use client';

import React, { useState } from 'react';
import { Printer, Download, CheckCircle2, XCircle, Rocket, Mail, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn, parseMaxBudget } from '@/lib/utils';
import { useConfirm } from '@/providers/ConfirmContext';

interface QuotationPreviewProps {
  lead: any;
  quotationIndex: number;
  onSuccess: () => void;
  onAddVersion?: () => void;
}

export function QuotationPreview({ lead, quotationIndex, onSuccess, onAddVersion }: QuotationPreviewProps) {
  const toast = useToast();
  const { confirm, prompt } = useConfirm();
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const quote = lead.quotations ? lead.quotations[quotationIndex] : null;

  const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
  const grandTotal = Number(quote?.grandTotal) || 0;
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && grandTotal > maxBudget);
  const excessAmount = isOverBudget ? grandTotal - (maxBudget || 0) : 0;

  const handleSendEmail = async () => {
    let emailToUse = lead.email;
    if (!emailToUse) {
      const custom = await prompt({
        title: 'Recipient Email Required',
        message: 'No email address saved for this lead. Please enter target email address:',
        placeholder: 'client@example.com',
      });
      if (!custom) return;
      emailToUse = custom.trim();
    }
    
    setIsSendingEmail(true);
    try {
      await interiorCrmService.sendQuotationEmail(lead._id, {
        quotation: quote,
        recipientEmail: emailToUse,
      });
      toast.success(`Proforma Invoice & Quotation emailed to ${emailToUse}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      const updatedQuotations = [...lead.quotations];
      updatedQuotations[quotationIndex] = { ...quote, status };
      
      let nextLeadStatus = lead.status;
      if (status === 'Accepted') {
        nextLeadStatus = 'Booking Pending';
      } else if (status === 'Rejected') {
        nextLeadStatus = 'Under Quotation';
      }
      
      await interiorCrmService.updateCustomer(lead._id, { 
        quotations: updatedQuotations,
        status: nextLeadStatus
      });

      // Log activity
      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Quotation v${quote.version} was marked as ${status}`
      });

      toast.success(`Quotation marked as ${status}. You can now add a new quotation version.`);
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
      // Navigate to the interior-new crm workspace
      router.push('/interior-new/crm');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to convert to project');
      setIsConverting(false);
    }
  };

  const handleDeleteQuotation = async () => {
    const ok = await confirm({
      title: `Delete Quotation Version ${quote?.version || quotationIndex + 1}`,
      message: `Are you sure you want to delete Quotation Version ${quote?.version || quotationIndex + 1} (Total: ₹${grandTotal.toLocaleString('en-IN')})? This action cannot be undone.`,
      confirmText: 'Delete Quotation',
      type: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      const updatedQuotations = (lead.quotations || [])
        .filter((_: any, idx: number) => idx !== quotationIndex)
        .map((q: any, i: number) => ({ ...q, version: i + 1 }));

      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Deleted Quotation Version ${quote?.version || quotationIndex + 1}`
      });

      toast.success(`Quotation Version ${quote?.version || quotationIndex + 1} deleted successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete quotation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isConverted = lead?.status === 'Won' || lead?.status === 'Converted' || lead?.status === 'Lost' || !!lead?.linkedProject;

  if (!quote) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Actions Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-3.5 sm:p-4 rounded-2xl border border-[hsl(var(--border))] shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-[hsl(var(--foreground))] text-sm sm:text-base">Version {quote.version}</h3>
          <span className={cn(
            "text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider",
            quote.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
            quote.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
            'bg-amber-500/10 text-amber-600 border-amber-500/20'
          )}>
            {quote.status || 'Draft'}
          </span>
          {isOverBudget && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30 flex items-center gap-1">
              <AlertTriangle size={11} /> Over Budget by ₹{excessAmount.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
          {!isConverted && quote.status === 'Sent' && (
            <>
              <button 
                onClick={() => handleStatusUpdate('Accepted')}
                className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-2 rounded-xl hover:bg-emerald-500/20 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={15} /> Mark Accepted
              </button>
              <button 
                onClick={() => handleStatusUpdate('Rejected')}
                className="text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3 py-2 rounded-xl hover:bg-rose-500/20 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <XCircle size={15} /> Mark Rejected
              </button>
              <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border))] mx-1"></div>
            </>
          )}

          {!isConverted && quote.status === 'Rejected' && onAddVersion && (
            <>
              <button 
                onClick={onAddVersion}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-sm shadow-rose-600/20 cursor-pointer"
                title="Create next quotation version"
              >
                <Plus size={15} /> Add Quotation Version
              </button>
              <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border))] mx-1"></div>
            </>
          )}

          {!isConverted && quote.status === 'Accepted' && (
            <>
              <button 
                onClick={handleConvertToProject}
                disabled={isConverting}
                className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
              >
                <Rocket size={15} /> 
                {isConverting ? 'Converting...' : '🎉 Convert to Project'}
              </button>
              <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border))] mx-1"></div>
            </>
          )}
          
          <button 
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            className="text-xs font-bold bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
            title="Email Proforma Invoice & Quotation to lead"
          >
            <Mail size={15} /> {isSendingEmail ? 'Sending...' : 'Send Email'}
          </button>

          <button 
            onClick={handlePrint}
            className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            <Printer size={15} /> Print / PDF
          </button>

          {!isConverted && (
            <button 
              onClick={handleDeleteQuotation}
              disabled={isDeleting}
              className="text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 px-3 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Delete this quotation version"
            >
              <Trash2 size={15} /> {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* A4 Printable Area */}
      <div className="overflow-x-auto w-full">
        <div className="bg-white border border-slate-200 mx-auto rounded-xl relative overflow-hidden print:border-none print:m-0 min-w-[320px] sm:min-w-[500px] min-h-[297mm] print:min-h-0" 
             style={{ maxWidth: '210mm' }}>
          
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0 print:hidden">
            <span className="text-6xl sm:text-8xl font-black rotate-[-45deg] tracking-widest uppercase">SKY INTERIOR</span>
          </div>

          {/* Content (Z-10 to stay above watermark) */}
          <div className="relative z-10 p-5 sm:p-8 md:p-12 h-full flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-indigo-100 pb-6 sm:pb-8 mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-indigo-900 tracking-tight">QUOTATION</h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Version {quote.version}</p>
              </div>
              <div className="sm:text-right">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900">SKY INTERIOR</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">123 Design Avenue, Tech Park</p>
                <p className="text-xs sm:text-sm text-slate-500">contact@skyinterior.com</p>
                <p className="text-xs sm:text-sm text-slate-500">+91 98765 43210</p>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 sm:mb-10 min-w-0">
              <div className="min-w-0 max-w-full sm:max-w-[50%]">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prepared For</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 break-words [overflow-wrap:anywhere]">{lead.name}</p>
                <p className="text-xs sm:text-sm text-slate-600 break-words [overflow-wrap:anywhere]">{lead.mobileNumber}</p>
                {lead.email && <p className="text-xs sm:text-sm text-slate-600 break-words [overflow-wrap:anywhere]">{lead.email}</p>}
              </div>
              <div className="sm:text-right min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Details</p>
                <p className="text-xs sm:text-sm text-slate-600"><span className="font-semibold text-slate-900">Date:</span> {new Date(quote.createdAt).toLocaleDateString()}</p>
                <p className="text-xs sm:text-sm text-slate-600"><span className="font-semibold text-slate-900">Lead ID:</span> {lead.leadNumber || 'LD-XXXX'}</p>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 print:flex-none overflow-x-auto mb-6 sm:mb-8 min-w-0">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider min-w-[150px]">Description</th>
                    <th className="py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider text-center w-16 sm:w-24">Qty</th>
                    <th className="py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider text-right w-24 sm:w-32">Unit Price</th>
                    <th className="py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider text-right w-24 sm:w-32">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items.map((item: any, idx: number) => (
                    <tr key={idx} className="print:break-inside-avoid">
                      <td className="py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 break-words [overflow-wrap:anywhere] whitespace-pre-wrap max-w-xs">{item.description}</td>
                      <td className="py-3 sm:py-4 text-xs sm:text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="py-3 sm:py-4 text-xs sm:text-sm text-slate-600 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 sm:py-4 text-xs sm:text-sm font-bold text-slate-900 text-right">₹{item.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="flex justify-end mt-auto pt-6 sm:pt-8 border-t border-slate-200 print:break-inside-avoid">
              <div className="w-full sm:w-72 space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">₹{quote.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                  <span>Tax ({quote.taxPercentage}%)</span>
                  <span className="font-semibold text-slate-900">₹{quote.tax.toLocaleString('en-IN')}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">- ₹{quote.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base sm:text-xl font-black text-indigo-900 pt-2 sm:pt-3 border-t-2 border-indigo-100">
                  <span>Grand Total</span>
                  <span>₹{quote.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes */}
            <div className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-100 print:break-inside-avoid min-w-0 overflow-hidden">
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">Terms & Conditions</p>
              <p className="text-[11px] sm:text-xs text-slate-500 whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                {quote.notes || '1. Quotation is valid for 15 days.\n2. 50% advance payment required to commence work.\n3. Goods once sold will not be taken back.'}
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}