'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Calculator, FileSpreadsheet } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  existingBoqs: any[];
  boqIndexToDelete?: number | null; // null or undefined means delete all or active BOQ
  onSuccess: () => void;
}

export function InteriorDeleteBoqModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  existingBoqs = [],
  boqIndexToDelete = null,
  onSuccess,
}: Props) {
  const toast = useToast();
  const { currencySymbol } = useCurrency();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isDeletingSpecificVersion =
    boqIndexToDelete !== null &&
    boqIndexToDelete !== undefined &&
    boqIndexToDelete >= 0 &&
    boqIndexToDelete < existingBoqs.length;

  const targetBoq = isDeletingSpecificVersion ? existingBoqs[boqIndexToDelete!] : existingBoqs[existingBoqs.length - 1];
  const targetVersionNumber = isDeletingSpecificVersion
    ? targetBoq?.version || boqIndexToDelete! + 1
    : existingBoqs.length;

  const rawCategories: string[] = Array.from(
    new Set<string>((targetBoq?.items || []).map((it: any) => (it.category || 'General') as string))
  );
  const sections =
    targetBoq?.sections && Array.isArray(targetBoq.sections) && targetBoq.sections.length > 0
      ? targetBoq.sections
      : rawCategories.map((c: any) => ({ sectionTitle: String(c) }));
  const categoriesCount = sections.length || (targetBoq?.items?.length ? 1 : 0);
  const categoryLabel = `${categoriesCount} ${categoriesCount === 1 ? 'Category' : 'Categories'}`;

  const isOnlyVersion = existingBoqs.length <= 1;

  const handleDelete = async () => {
    if (!customerId) return;
    setIsDeleting(true);

    try {
      let updatedBoqs: any[] = [];
      let activityRemark = '';

      if (isDeletingSpecificVersion && !isOnlyVersion) {
        // Remove specific index and re-index versions
        updatedBoqs = existingBoqs
          .filter((_, idx) => idx !== boqIndexToDelete)
          .map((b, idx) => ({
            ...b,
            version: idx + 1,
          }));
        activityRemark = `Deleted BOQ Version ${targetVersionNumber}. Remaining versions re-indexed.`;
      } else {
        // Delete all / only version
        updatedBoqs = [];
        activityRemark = `Deleted all BOQ estimates for lead.`;
      }

      await interiorCrmService.updateCustomer(customerId, {
        boqs: updatedBoqs,
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'System Update',
        status: 'Completed',
        remarks: activityRemark,
        completedDate: new Date(),
      });

      toast.success(
        isDeletingSpecificVersion && !isOnlyVersion
          ? `BOQ Version ${targetVersionNumber} deleted successfully.`
          : 'BOQ deleted successfully.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete BOQ. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))] bg-rose-500/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                {isDeletingSpecificVersion && !isOnlyVersion
                  ? `Delete BOQ Version ${targetVersionNumber}`
                  : 'Delete BOQ Estimation'}
              </h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {customerName ? `Lead: ${customerName}` : 'Estimate Removal Confirmation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              <span className="font-bold block mb-0.5">Are you sure you want to proceed?</span>
              {isDeletingSpecificVersion && !isOnlyVersion ? (
                <>
                  You are about to permanently delete <strong>Version {targetVersionNumber}</strong> (
                  {currencySymbol} {(targetBoq?.totalAmount || 0).toLocaleString()}). Other BOQ versions will be preserved and
                  re-sequenced.
                </>
              ) : (
                <>
                  This will remove all BOQ line items and total pricing for this lead. The lead status will remain in the
                  CRM, but the BOQ state will reset to <em>Pending</em>.
                </>
              )}
            </div>
          </div>

          {targetBoq && (
            <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-blue-500" /> Version Target
                </span>
                <span className="font-bold text-[hsl(var(--foreground))]">
                  Version {targetVersionNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5">
                  <Calculator size={13} className="text-emerald-500" /> Total Valuation
                </span>
                <span className="font-extrabold text-emerald-600">
                  {currencySymbol} {(targetBoq.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))] font-medium">Scope Categories</span>
                <span className="font-bold text-[hsl(var(--foreground))]">
                  {categoryLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3.5 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              'Deleting...'
            ) : (
              <>
                <Trash2 size={13} /> Confirm Delete
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
