'use client';

import React, { useState } from 'react';
import { Printer, Download, CheckCircle2, XCircle, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface QuotationPreviewProps {
  lead: any;
  quotationIndex: number;
  onSuccess: () => void;
}

export function QuotationPreview({ lead, quotationIndex, onSuccess }: QuotationPreviewProps) {
  const toast = useToast();
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const quote = lead.quotations[quotationIndex];

  const handleStatusUpdate = async (status: string) => {
    try {
      const updatedQuotations = [...lead.quotations];
      updatedQuotations[quotationIndex] = { ...quote, status };
      
      let nextLeadStatus = lead.status;
      if (status === 'Accepted') nextLeadStatus = 'Negotiation'; // Or Converted, depending on flow
      
      await api.patch(`/crm/customers/${lead._id}`, { 
        quotations: updatedQuotations,
        status: nextLeadStatus
      });

      // Log activity
      await api.post('/crm/activities', {
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Quotation v${quote.version} was marked as ${status}`
      });

      toast.success(`Quotation marked as ${status}`);
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update quotation status');
    }
  };

  const handleConvertToProject = async () => {
    if (!confirm('Are you sure you want to convert this Lead into an active Project? This will hand it over to the Execution team.')) return;
    
    setIsConverting(true);
    try {
      await api.post('/projects', {
        customerId: lead._id,
        quotationIndex
      });
      
      toast.success('🎉 Successfully converted to Project!');
      // Navigate to the dashboard or projects page
      router.push('/interior/crm');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to convert to project');
      setIsConverting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!quote) return null;

  return (
    <div className="space-y-6">
      {/* Actions Bar (Hidden on print) */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-slate-800">Version {quote.version}</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
            quote.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
            quote.status === 'Rejected' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {quote.status}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {quote.status === 'Sent' && (
            <>
              <button 
                onClick={() => handleStatusUpdate('Accepted')}
                className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl hover:bg-emerald-100 transition flex items-center gap-1.5"
              >
                <CheckCircle2 size={16} /> Mark Accepted
              </button>
              <button 
                onClick={() => handleStatusUpdate('Rejected')}
                className="text-xs font-bold bg-red-50 text-red-700 px-3 py-2 rounded-xl hover:bg-red-100 transition flex items-center gap-1.5"
              >
                <XCircle size={16} /> Mark Rejected
              </button>
              <div className="w-px h-6 bg-slate-200 mx-2"></div>
            </>
          )}

          {quote.status === 'Accepted' && (
            <>
              <button 
                onClick={handleConvertToProject}
                disabled={isConverting}
                className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-indigo-500/30 disabled:opacity-50"
              >
                <Rocket size={16} /> 
                {isConverting ? 'Converting...' : '🎉 Convert to Project'}
              </button>
              <div className="w-px h-6 bg-slate-200 mx-2"></div>
            </>
          )}
          
          <button 
            onClick={handlePrint}
            className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5 shadow-md"
          >
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* A4 Printable Area */}
      <div className="bg-white border border-slate-200 shadow-xl mx-auto rounded-xl relative overflow-hidden print:shadow-none print:border-none print:m-0" 
           style={{ minHeight: '297mm', maxWidth: '210mm' }}>
        
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
          <span className="text-8xl font-black rotate-[-45deg] tracking-widest uppercase">SKY INTERIOR</span>
        </div>

        {/* Content (Z-10 to stay above watermark) */}
        <div className="relative z-10 p-10 sm:p-12 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-indigo-100 pb-8 mb-8">
            <div>
              <h1 className="text-4xl font-black text-indigo-900 tracking-tight">QUOTATION</h1>
              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Version {quote.version}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-900">SKY INTERIOR</h2>
              <p className="text-sm text-slate-500 mt-1">123 Design Avenue, Tech Park</p>
              <p className="text-sm text-slate-500">contact@skyinterior.com</p>
              <p className="text-sm text-slate-500">+91 98765 43210</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex justify-between mb-12">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prepared For</p>
              <p className="text-lg font-bold text-slate-900">{lead.name}</p>
              <p className="text-sm text-slate-600">{lead.mobileNumber}</p>
              {lead.email && <p className="text-sm text-slate-600">{lead.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Details</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Date:</span> {new Date(quote.createdAt).toLocaleDateString()}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">Lead ID:</span> {lead.leadNumber || 'LD-XXXX'}</p>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 text-xs font-bold text-slate-900 uppercase tracking-wider">Description</th>
                  <th className="py-3 text-xs font-bold text-slate-900 uppercase tracking-wider text-center w-24">Qty</th>
                  <th className="py-3 text-xs font-bold text-slate-900 uppercase tracking-wider text-right w-32">Unit Price</th>
                  <th className="py-3 text-xs font-bold text-slate-900 uppercase tracking-wider text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-4 text-sm font-medium text-slate-800">{item.description}</td>
                    <td className="py-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="py-4 text-sm text-slate-600 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="py-4 text-sm font-bold text-slate-900 text-right">₹{item.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="flex justify-end mt-8 pt-8 border-t border-slate-200">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">₹{quote.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax ({quote.taxPercentage}%)</span>
                <span className="font-semibold text-slate-900">₹{quote.tax.toLocaleString('en-IN')}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">- ₹{quote.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-indigo-900 pt-3 border-t-2 border-indigo-100">
                <span>Grand Total</span>
                <span>₹{quote.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="mt-16 pt-8 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
            <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">
              {quote.notes || '1. Quotation is valid for 15 days.\n2. 50% advance payment required to commence work.\n3. Goods once sold will not be taken back.'}
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
