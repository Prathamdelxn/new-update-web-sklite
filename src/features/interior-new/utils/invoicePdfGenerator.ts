// =============================================================================
// Sky-Lite Web — Interior-OS Project Payment Invoice / Receipt PDF Generator
// Generates clean, standard, highly professional corporate tax invoices & payment receipts.
// =============================================================================

import { esc, exportPdf, getPdfOrg, pdfHeaderHtml, PDF_BASE_CSS, PDF_TERMS } from '@/lib/pdf/pdfExport';

export interface InvoicePaymentData {
  _id?: string;
  invoiceNo?: string;
  milestoneName?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNo?: string;
  remarks?: string;
  incomingStatus?: string;
  createdAt?: string;
}

function formatLocation(loc: any): string {
  if (!loc) return 'Site Location';
  if (typeof loc === 'string') {
    const raw = loc.trim();
    if (!raw) return 'Site Location';
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const unique = Array.from(new Set(parts));
    return unique.join(', ');
  }
  if (typeof loc === 'object') {
    const rawParts = [loc.address, loc.city, loc.state, loc.country, loc.zipCode]
      .filter((p) => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim());
    const unique = Array.from(new Set(rawParts));
    return unique.length > 0 ? unique.join(', ') : 'Site Location';
  }
  return 'Site Location';
}

function resolveClientName(project: any): string {
  if (!project) return 'Valued Client';
  if (typeof project.client === 'string' && project.client.trim()) return project.client.trim();
  if (typeof project.client === 'object' && project.client?.name) return project.client.name;
  if (project.clientName && typeof project.clientName === 'string') return project.clientName.trim();
  if (project.customerName && typeof project.customerName === 'string') return project.customerName.trim();
  return 'Valued Client';
}

export function generateInvoiceHtml(
  payment: InvoicePaymentData,
  project?: any,
  currencySymbol: string = 'QAR'
): string {
  const projectName = project?.name || project?.title || 'Interior Fitout Project';
  const clientName = resolveClientName(project);
  const clientPhone = (typeof project?.client === 'object' ? project?.client?.phone : '') || project?.clientPhone || project?.phone || '';
  const clientEmail = (typeof project?.client === 'object' ? project?.client?.email : '') || project?.clientEmail || project?.email || '';
  const location = formatLocation(project?.location || project?.siteAddress);
  const projectCode = project?.code || project?.projectCode || `PRJ-${String(project?._id || '').slice(-4).toUpperCase() || '001'}`;

  const invoiceNumber = payment.invoiceNo || 'INV-2026-001';
  const paymentDate = payment.paymentDate
    ? new Date(payment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const milestone = payment.milestoneName || 'Milestone Payment Receipt';
  const method = payment.paymentMethod || 'Bank Transfer';
  const refNo = payment.referenceNo || 'N/A';
  const formattedAmount = `${currencySymbol} ${(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const status = (payment.incomingStatus || 'COMPLETED').toUpperCase();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Payment Receipt - ${invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background-color: #ffffff;
          padding: 36px 40px;
          line-height: 1.4;
          font-size: 13px;
        }
        .invoice-box {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        table { border-collapse: collapse; width: 100%; }
        td, th { vertical-align: top; }
        ${PDF_BASE_CSS}
      </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; background-color: #ffffff; padding: 36px 40px; font-size: 13px; line-height: 1.4;">
      <div class="invoice-box" style="width: 100%; max-width: 780px; margin: 0 auto; background-color: #ffffff;">

        <!-- ── STANDARD LETTERHEAD ── -->
        ${pdfHeaderHtml({
          docType: 'Payment Receipt',
          org: getPdfOrg('interior'),
          meta: [
            ['Receipt / Invoice #', invoiceNumber],
            ['Receipt Date', paymentDate],
            ['Status', status],
          ],
        })}

        <!-- ── ADDRESSES & PROJECT SECTION ── -->
        <table style="width: 100%; margin-bottom: 24px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px;">
                Billed To (Client)
              </div>
              <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px;">${clientName}</div>
              <div style="font-size: 12px; color: #4b5563; margin-bottom: 3px; line-height: 1.4;">
                <strong style="color: #111827;">Site Location:</strong> ${location}
              </div>
              ${clientPhone ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 3px;"><strong style="color: #111827;">Phone:</strong> ${clientPhone}</div>` : ''}
              ${clientEmail ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 3px;"><strong style="color: #111827;">Email:</strong> ${clientEmail}</div>` : ''}
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px;">
                Project &amp; Transaction Details
              </div>
              <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;"><strong style="color: #111827;">Project:</strong> ${projectName}</div>
              <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;"><strong style="color: #111827;">Project Code:</strong> ${projectCode}</div>
              <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;"><strong style="color: #111827;">Payment Mode:</strong> ${method}</div>
              <div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;"><strong style="color: #111827;">UTR / Transaction Ref:</strong> ${refNo}</div>
            </td>
          </tr>
        </table>

        <!-- ── TABLE ── -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: center; width: 36px;">#</th>
              <th style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: left;">Milestone Scope / Particulars</th>
              <th style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: left; width: 130px;">Payment Mode</th>
              <th style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: left; width: 130px;">Reference #</th>
              <th style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; text-align: right; width: 160px;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-weight: 600;">1</td>
              <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 700; color: #111827; font-size: 13px;">${milestone}</div>
                <div style="font-size: 11.5px; color: #6b7280; margin-top: 3px;">Official milestone payment received against interior contract.</div>
              </td>
              <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${method}</td>
              <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-family: monospace; font-size: 12px;">${refNo}</td>
              <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: #111827; font-size: 13.5px;">${formattedAmount}</td>
            </tr>
          </tbody>
        </table>

        <!-- ── SUMMARY & NOTES ── -->
        <table class="pdf-avoid" style="width: 100%; margin-bottom: 36px;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-right: 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px;">
                <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4b5563; margin-bottom: 4px;">
                  Receipt Notes &amp; Remarks
                </div>
                <div style="font-size: 11.5px; color: #4b5563; line-height: 1.45;">
                  ${
                    payment.remarks
                      ? payment.remarks
                      : `Payment of ${formattedAmount} received and verified for milestone "${milestone}". Thank you for your business.`
                  }
                </div>
              </div>
            </td>
            <td style="width: 45%; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                <tr>
                  <td style="padding: 6px 0; color: #4b5563; font-weight: 500;">Milestone Amount</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #4b5563; font-weight: 500;">Tax / Adjustments (0%)</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${currencySymbol} 0.00</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-top: 2px solid #111827; border-bottom: 2px solid #111827; font-size: 15px; font-weight: 800; color: #111827;">Total Amount Paid</td>
                  <td style="padding: 10px 0; border-top: 2px solid #111827; border-bottom: 2px solid #111827; font-size: 15px; font-weight: 800; color: #111827; text-align: right;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 12px; color: #059669; font-weight: 700;">Balance Due for Milestone</td>
                  <td style="padding-top: 8px; font-size: 12px; color: #059669; font-weight: 700; text-align: right;">${currencySymbol} 0.00</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ── SIGNATURES ── -->
        <table class="pdf-avoid" style="width: 100%; margin-top: 40px;">
          <tr>
            <td style="width: 45%; text-align: center; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #9ca3af; height: 40px; margin-bottom: 8px;"></div>
              <div style="font-size: 12px; font-weight: 700; color: #111827;">${clientName}</div>
              <div style="font-size: 11px; color: #6b7280;">Client Signature &amp; Date</div>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; text-align: center; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #9ca3af; height: 40px; margin-bottom: 8px;"></div>
              <div style="font-size: 12px; font-weight: 700; color: #111827;">Authorized Signatory</div>
              <div style="font-size: 11px; color: #6b7280;">For ${esc(getPdfOrg('interior').name)}</div>
            </td>
          </tr>
        </table>

      </div>
    </body>
    </html>
  `;
}

export async function downloadInvoicePdf(
  payment: InvoicePaymentData,
  project?: any,
  currencySymbol: string = 'QAR'
): Promise<void> {
  const cleanInvNo = (payment.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
  const clientName = resolveClientName(project);
  const cleanClient = (clientName !== 'Valued Client' ? clientName : (project?.name || 'Client') as string).replace(/[^a-zA-Z0-9_-]/g, '_');
  await exportPdf({
    html: generateInvoiceHtml(payment, project, currencySymbol),
    filename: `Invoice_${cleanInvNo}_${cleanClient}.pdf`,
    terms: PDF_TERMS.receipt,
  });
}

/** Opens the generated PDF in a new tab (print from the PDF viewer). */
export function printInvoice(
  payment: InvoicePaymentData,
  project?: any,
  currencySymbol: string = 'QAR'
): Promise<void> {
  return exportPdf({
    html: generateInvoiceHtml(payment, project, currencySymbol),
    filename: `Invoice_${(payment.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
    terms: PDF_TERMS.receipt,
    action: 'open',
  });
}
