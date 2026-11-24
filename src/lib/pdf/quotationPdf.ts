// =============================================================================
// Sky-Lite Web — Quotation PDF (standard format)
// =============================================================================

import { tr } from '@/i18n';
import { esc, escMultiline, exportPdf, ltr, getPdfOrg, pdfDocumentHtml, pdfHeaderHtml, pdfSlug, PDF_TERMS } from './pdfExport';

const money = (n: unknown, sym: string, sign = '') =>
  ltr(`${sign}${sym} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function quotationNumberOf(lead: any, quote: any, quotationIndex: number): string {
  return (
    quote?.quotationNumber ||
    quote?.quoteNumber ||
    (lead?.leadNumber
      ? `QTN-${String(lead.leadNumber).replace(/^LD-/, '')}-${quote?.version || quotationIndex + 1}`
      : `QTN-${String(quotationIndex + 1).padStart(3, '0')}`)
  );
}

function siteAddress(lead: any): string {
  const a = lead?.siteAddress || lead?.address || lead?.location;
  if (!a) return '';
  if (typeof a === 'string') return a;
  return [a.address || a.street, a.city, a.state, a.country].filter(Boolean).join(', ');
}

export function buildQuotationHtml(lead: any, quotationIndex: number, currencySymbol: string): string {
  const quote = lead?.quotations?.[quotationIndex];
  if (!quote) return '';
  const qtn = quotationNumberOf(lead, quote, quotationIndex);
  const issued = quote.createdAt ? new Date(quote.createdAt) : new Date();
  const validUntil = new Date(issued.getTime() + 30 * 86400000);
  const rawTitle = String(quote.title || '').trim();
  const title = rawTitle && rawTitle.toLowerCase() !== 'commercial quotation' ? rawTitle : tr('Commercial Estimate & Scope');
  const items: any[] = Array.isArray(quote.items) ? quote.items : [];
  const subtotal = Number(quote.subtotal ?? items.reduce((s, it) => s + Number(it.total || 0), 0));
  const discount = Number(quote.discount || quote.discountAmount || 0);
  const site = siteAddress(lead);

  const rows = items.length
    ? items
        .map((it, i) => {
          const lines = String(it.description ?? it.itemName ?? 'Item').split('\n').filter(Boolean);
          const head = lines[0] || 'Item';
          const notes = lines.slice(1).join('\n');
          const cat = it.category && it.category !== 'General Scope' ? it.category : '';
          return `<tr>
            <td class="ctr" style="color:#64748b">${i + 1}</td>
            <td>
              <div style="font-weight:700;color:#0f172a">${esc(tr(head))}</div>
              ${notes ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px">${escMultiline(tr(notes))}</div>` : ''}
              ${cat ? `<div style="font-size:9.5px;color:#1e3a8a;font-weight:700;margin-top:3px">${esc(tr(cat))}</div>` : ''}
            </td>
            <td class="ctr">${esc(it.quantity ?? '')}${it.unit ? `<div style="font-size:9.5px;color:#64748b">${esc(it.unit)}</div>` : ''}</td>
            <td class="num">${money(it.unitPrice ?? it.rate, currencySymbol)}</td>
            <td class="num" style="font-weight:700">${money(it.total ?? it.amount, currencySymbol)}</td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" class="ctr" style="color:#94a3b8;padding:18px">${esc(tr('No line items listed in this quotation.'))}</td></tr>`;

  const body = `
    ${pdfHeaderHtml({
      docType: tr('Quotation'),
      org: getPdfOrg('interior'),
      meta: [
        [tr('Quotation No.'), qtn],
        [tr('Issue Date'), fmtDate(issued)],
        [tr('Valid Until'), fmtDate(validUntil)],
        [tr('Version'), `v${quote.version || quotationIndex + 1}`],
        [tr('Lead Reference'), lead?.leadNumber],
      ],
    })}

    <div class="sd-cols pdf-avoid">
      <div>
        <div class="sd-box">
          <div class="sd-label">${esc(tr('Prepared For'))}</div>
          <div class="sd-strong">${esc(lead?.name || tr('Valued Client'))}</div>
          <div class="sd-muted">
            ${[lead?.mobileNumber, lead?.email].filter(Boolean).map(ltr).join(' &nbsp;·&nbsp; ')}${lead?.mobileNumber || lead?.email ? '<br/>' : ''}
            ${site ? esc(site) : ''}
          </div>
        </div>
      </div>
      <div>
        <div class="sd-box">
          <div class="sd-label">${esc(tr('Project / Scope'))}</div>
          <div class="sd-strong">${esc(tr(title))}</div>
          <div class="sd-muted">
            ${esc(tr('{{count}} line items', { count: items.length }))}
            ${lead?.propertyType ? ` · ${esc(tr(lead.propertyType))}` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="sd-title">${esc(tr('Scope of Work & Pricing'))}</div>
    <table class="sd-table">
      <colgroup><col style="width:6%"/><col style="width:46%"/><col style="width:12%"/><col style="width:18%"/><col style="width:18%"/></colgroup>
      <thead><tr>
        <th class="ctr">#</th>
        <th>${esc(tr('Description'))}</th>
        <th class="ctr">${esc(tr('Qty'))}</th>
        <th class="num">${esc(tr('Unit Rate'))}</th>
        <th class="num">${esc(tr('Amount'))}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="sd-totals pdf-avoid">
      <tr><td>${esc(tr('Subtotal'))}</td><td>${money(subtotal, currencySymbol)}</td></tr>
      <tr><td>${esc(tr('Tax'))} ${ltr(`(${quote.taxPercentage || 0}%)`)}</td><td>${money(quote.tax, currencySymbol)}</td></tr>
      ${discount > 0 ? `<tr><td style="color:#047857">${esc(tr('Discount'))}</td><td style="color:#047857">${money(discount, currencySymbol, '- ')}</td></tr>` : ''}
      <tr class="grand"><td>${esc(tr('Grand Total'))}</td><td>${money(quote.grandTotal ?? quote.totalAmount, currencySymbol)}</td></tr>
    </table>

    ${
      String(quote.notes || '').trim()
        ? `<div class="pdf-avoid"><div class="sd-title">${esc(tr('Notes & Remarks'))}</div>
           <div class="sd-box sd-muted">${escMultiline(tr(quote.notes))}</div></div>`
        : ''
    }

    <div class="sd-sign pdf-avoid">
      <div><div class="line"></div><div class="who">${esc(lead?.name || tr('Client'))}</div><div class="role">${esc(tr('Client Acceptance (Signature & Date)'))}</div></div>
      <div><div class="line"></div><div class="who">${esc(tr('Authorised Signatory'))}</div><div class="role">${esc(tr('For {{org}}', { org: getPdfOrg('interior').name }))}</div></div>
    </div>`;

  return pdfDocumentHtml({ title: `${tr('Quotation')} ${qtn}`, body });
}

export async function downloadQuotationPdf(
  lead: any,
  quotationIndex: number,
  currencySymbol: string,
  action: 'download' | 'open' = 'download'
): Promise<void> {
  const quote = lead?.quotations?.[quotationIndex];
  if (!quote) return;
  const qtn = quotationNumberOf(lead, quote, quotationIndex);
  await exportPdf({
    html: buildQuotationHtml(lead, quotationIndex, currencySymbol),
    filename: `Quotation_${pdfSlug(qtn)}_${pdfSlug(lead?.name, 'Client')}.pdf`,
    terms: PDF_TERMS.quotation,
    action,
  });
}
