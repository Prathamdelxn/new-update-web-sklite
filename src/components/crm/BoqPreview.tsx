'use client';

import React from 'react';
import { Printer, Pencil } from 'lucide-react';

interface BoqPreviewProps {
  lead: any;
  boqIndex: number;
  onSuccess?: () => void;
  onEdit?: () => void;
}

export function BoqPreview({ lead, boqIndex, onEdit }: BoqPreviewProps) {
  const boq = lead?.boqs?.[boqIndex];

  const handlePrint = () => {
    window.print();
  };

  if (!boq) return null;

  return (
    <div className="space-y-6">
      {/* Actions Bar (Hidden on print) */}
      <div className="flex justify-between items-center bg-[hsl(var(--card))] p-4 rounded-2xl border border-[hsl(var(--border))] shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <h3 className="font-black text-sm text-[hsl(var(--foreground))]">Version {boq.version || 1}</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            {boq.items?.length || 0} {boq.items?.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Pencil size={13} /> Edit This BOQ
            </button>
          )}

          <button 
            onClick={handlePrint}
            className="text-xs font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--background))] px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {/* BOQ Table Area */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm rounded-xl relative overflow-hidden">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold border-b border-[hsl(var(--border))]">
                <th className="p-3 w-12 text-center">S.No</th>
                <th className="p-3">Category</th>
                <th className="p-3">Item Description</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {boq.items?.map((item: any, idx: number) => (
                <tr key={item._id || idx} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.15)] transition-colors">
                  <td className="p-3 text-center font-mono font-medium text-[hsl(var(--muted-foreground))]">{item.serialNumber || idx + 1}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-bold text-[10px]">{item.category || 'N/A'}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-[hsl(var(--foreground))]">{item.itemName}</div>
                    {item.description && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{item.description}</div>}
                  </td>
                  <td className="p-3 text-right font-semibold">{item.quantity?.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center uppercase text-[hsl(var(--muted-foreground))]">{item.unit || 'Nos'}</td>
                  <td className="p-3 text-right font-medium">{item.rate?.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-bold text-[hsl(var(--foreground))]">₹{item.amount?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Notes Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Remarks</p>
          <p className="text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
            {boq.notes || 'No remarks added.'}
          </p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-center items-end">
          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Total Estimated Cost</span>
          <span className="text-2xl font-black text-indigo-600">₹{(boq.totalAmount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}
