// =============================================================================
// Sky-Lite Web — Handover / Practical Completion Certificate PDF (standard format)
// =============================================================================

import { tr } from '@/i18n';
import { esc, exportPdf, getPdfOrg, pdfDocumentHtml, pdfHeaderHtml, pdfSlug, PDF_TERMS } from './pdfExport';

export interface HandoverChecklistRow {
  id: string;
  title: string;
  subtitle?: string;
  passed: boolean;
}

function clientName(project: any): string {
  const c = project?.client;
  if (typeof c === 'string' && c.trim()) return c;
  if (c && typeof c === 'object' && c.name) return c.name;
  return project?.clientName || tr('Client');
}

export function buildHandoverHtml(project: any, checklist: HandoverChecklistRow[], readiness: number): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const ready = readiness >= 100;
  const org = getPdfOrg('interior');
  const rows = checklist
    .map(
      (c, i) => `<tr>
        <td class="ctr" style="color:#64748b">${i + 1}</td>
        <td style="font-weight:600">${esc(tr(c.title))}</td>
        <td style="color:#475569">${esc(tr(c.subtitle || ''))}</td>
        <td class="ctr" style="font-weight:800;color:${c.passed ? '#047857' : '#b91c1c'}">${esc(c.passed ? tr('Complete') : tr('Pending'))}</td>
      </tr>`
    )
    .join('');

  const body = `
    ${pdfHeaderHtml({
      docType: tr('Handover Certificate'),
      subtitle: tr('Certificate of Practical Completion'),
      org,
      meta: [
        [tr('Project'), project?.name],
        [tr('Project Code'), project?.code || project?.projectCode],
        [tr('Date'), today],
      ],
    })}

    <div class="sd-cols pdf-avoid">
      <div><div class="sd-box">
        <div class="sd-label">${esc(tr('Client'))}</div>
        <div class="sd-strong">${esc(clientName(project))}</div>
      </div></div>
      <div><div class="sd-box">
        <div class="sd-label">${esc(tr('Readiness'))}</div>
        <div class="sd-strong" style="color:${ready ? '#047857' : '#b45309'}">${esc(readiness)}% · ${esc(ready ? tr('Ready for Handover') : tr('In Progress'))}</div>
      </div></div>
    </div>

    <div class="sd-title">${esc(tr('Project Audit Checklist'))}</div>
    <table class="sd-table">
      <colgroup><col style="width:7%"/><col style="width:43%"/><col style="width:32%"/><col style="width:18%"/></colgroup>
      <thead><tr><th class="ctr">#</th><th>${esc(tr('Item'))}</th><th>${esc(tr('Details'))}</th><th class="ctr">${esc(tr('Status'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="pdf-avoid">
      <div class="sd-title">${esc(tr('Declaration'))}</div>
      <div class="sd-box sd-muted">${esc(
        tr('We certify that the works for the above project have reached practical completion as per the checklist above and are handed over to the client on the date stated.')
      )}</div>
    </div>

    <div class="sd-sign pdf-avoid">
      <div><div class="line"></div><div class="who">${esc(tr('Project Manager'))}</div><div class="role">${esc(tr('For {{org}}', { org: org.name }))}</div></div>
      <div><div class="line"></div><div class="who">${esc(tr('Client Representative'))}</div><div class="role">${esc(clientName(project))}</div></div>
    </div>`;

  return pdfDocumentHtml({ title: tr('Handover Certificate'), body });
}

export function downloadHandoverPdf(project: any, checklist: HandoverChecklistRow[], readiness: number): Promise<void> {
  return exportPdf({
    html: buildHandoverHtml(project, checklist, readiness),
    filename: `Handover_Certificate_${pdfSlug(project?.name, 'Project')}.pdf`,
    terms: PDF_TERMS.certificate,
  });
}
