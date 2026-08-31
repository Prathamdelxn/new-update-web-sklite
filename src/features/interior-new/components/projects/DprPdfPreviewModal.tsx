'use client';

// =============================================================================
// Sky-Lite Web — DPR PDF Preview & Download Modal
// =============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/interior/ui';
import { DPRData, generateDprHtml, downloadDprPdf, printDpr } from '@/features/interior-new/utils/dprPdfGenerator';
import { useToast } from '@/providers/ToastContext';

interface DprPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dpr: DPRData | null;
  project?: any;
}

export const DprPdfPreviewModal: React.FC<DprPdfPreviewModalProps> = ({
  isOpen,
  onClose,
  dpr,
  project,
}) => {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !dpr) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadDprPdf(dpr, project);
      toast.success('DPR PDF generated and downloaded successfully');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to download PDF: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    try {
      printDpr(dpr, project);
    } catch (err: any) {
      console.error('Error printing:', err);
      toast.error('Failed to open print dialog');
    }
  };

  const htmlPreview = generateDprHtml(dpr, project);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl max-h-[92vh] flex flex-col border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Daily Progress Report (DPR) Preview</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {project?.name ? `${project.name} • ` : ''}
                  {dpr.date ? new Date(dpr.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Report'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={downloading} className="gap-1.5">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 ml-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sheet Preview Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-zinc-900 flex justify-center">
            <div className="w-full max-w-[780px] bg-white shadow-xl rounded border border-slate-200 overflow-hidden text-black">
              <iframe
                srcDoc={htmlPreview}
                title="DPR PDF Preview"
                className="w-full h-[680px] border-none bg-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--muted-foreground))]">
            <span>Format: Standard A4 Official Daily Progress Report Sheet</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={downloading}>
                {downloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DprPdfPreviewModal;
