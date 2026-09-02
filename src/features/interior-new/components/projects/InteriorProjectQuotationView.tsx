'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/interior/ui';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';
import { Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InteriorProjectQuotationView() {
  const { projectId } = useParams() as { projectId: string };
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<any[]>([]);

  useEffect(() => {
    async function loadQuotations() {
      try {
        setLoading(true);
        // In interior-os-backend, the Customer model stores linkedProject
        // Fetch customers to find the one linked to this project
        const custRes = await interiorApiClient.get(`/crm/customers`);
        const customers = custRes.data?.data || custRes.data || [];
        
        const customer = customers.find((c: any) => {
          if (!c.linkedProject) return false;
          const linkedId = typeof c.linkedProject === 'object' && c.linkedProject !== null && c.linkedProject._id 
            ? String(c.linkedProject._id) 
            : String(c.linkedProject);
          return linkedId === String(projectId);
        });

        if (customer && customer.quotations && customer.quotations.length > 0) {
          // Filter to show approved/accepted quotations, or fallback to the customer quotations
          let approvedQuotes = customer.quotations.filter(
            (q: any) =>
              q.status?.toLowerCase() === 'approved' ||
              q.status?.toLowerCase() === 'accepted'
          );
          if (approvedQuotes.length === 0) {
            approvedQuotes = customer.quotations;
          }
          setQuotations(approvedQuotes);
        } else {
          setQuotations([]);
        }
      } catch (err) {
        console.error('Failed to load project quotations:', err);
        toast.error('Failed to load quotations');
      } finally {
        setLoading(false);
      }
    }

    loadQuotations();
  }, [projectId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4">
        <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
          <FileText size={32} />
        </div>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Approved Quotations Found</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          There are no approved quotations associated with this project.
        </p>
       
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Approved Quotations</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">View the final approved financial quotes for this project</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotations.map((quote, idx) => (
          <Card key={quote._id || idx} className="overflow-hidden border-emerald-200">
            <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800 text-sm">
                  {quote.quotationNumber || `Quotation V${quote.version}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 rounded-full text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {quote.status}
              </div>
            </div>
            
            <CardContent className="p-5 space-y-4 bg-[hsl(var(--card))]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Version</p>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">V{quote.version}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Date</p>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[hsl(var(--border))]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Subtotal</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">₹{(quote.subtotal || quote.subTotal || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Tax/Discount</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {quote.tax > 0 ? `+₹${quote.tax.toLocaleString('en-IN')}` : ''}
                    {quote.discount > 0 ? ` -₹${quote.discount.toLocaleString('en-IN')}` : ''}
                    {!quote.tax && !quote.discount && '₹0'}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                  <p className="text-base font-bold text-[hsl(var(--foreground))]">Grand Total</p>
                  <p className="text-lg font-black text-[hsl(var(--primary))]">₹{quote.grandTotal?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
