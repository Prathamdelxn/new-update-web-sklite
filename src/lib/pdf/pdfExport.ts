// =============================================================================
// Sky-Lite Web — Standard PDF engine (one format for every exported document)
//
//   • Official SkyStruct logo + organisation letterhead (pdfHeaderHtml)
//   • A4 pages, rows/blocks never split across a page (whole row moves down,
//     table header repeats on the new page)
//   • Terms & conditions line + "Page X of Y" pinned to the BOTTOM of every
//     page (not after the content)
//   • Produces a real .pdf file (download) or opens it in the browser's PDF
//     viewer for printing — never prints the app page itself.
//
// The document HTML is rendered inside an off-screen iframe, so its CSS can
// never leak into the app and nothing is clipped by modals / scroll areas.
// =============================================================================

import { getLang, isRtl, tr } from '@/i18n';

export const PDF_LOGO_PATH = '/SS-Logo-2025-Colour.svg';
const LOGO_RATIO = 151.36 / 266.65; // h / w of the official logo artboard

// A4 geometry. 794 CSS px == 210 mm at 96 dpi.
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PAGE_W_PX = 794;
const PX_PER_MM = PAGE_W_PX / PAGE_W_MM;
const MARGIN_TOP_MM = 12;
const FOOTER_MM = 20; // reserved band at the bottom of every page
const CONTENT_H_PX = Math.floor((PAGE_H_MM - MARGIN_TOP_MM - FOOTER_MM) * PX_PER_MM);
const SIDE_PX = 40; // left/right page margin used by every document
const RENDER_SCALE = 2;

export const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Numbers, dates, phones, e-mails: keep them left-to-right inside Arabic (RTL) documents. */
export const ltr = (v: unknown): string => `<span dir="ltr" style="unicode-bidi:isolate">${esc(v)}</span>`;

/** Escape + keep line breaks. */
export const escMultiline = (v: unknown): string => esc(v).replace(/\r?\n/g, '<br/>');

// ── Organisation / branding ──────────────────────────────────────────────────

export interface PdfOrg {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

function readJson(key: string): any {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function joinAddress(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a;
  return [a.street || a.address || a.line1, a.city, a.state, a.country].filter(Boolean).join(', ');
}

/** Organisation shown on the letterhead (the signed-in company), falling back to SkyStruct Lite. */
export function getPdfOrg(product: 'interior' | 'construction' = 'interior'): PdfOrg {
  const fromObj = (o: any): PdfOrg | null => {
    if (!o || typeof o !== 'object' || !o.name) return null;
    return {
      name: String(o.name),
      address: joinAddress(o.address || o.location) || undefined,
      phone: o.phone || o.contactPhone || undefined,
      email: o.email || o.contactEmail || undefined,
    };
  };
  if (product === 'interior') {
    const org = fromObj(readJson('interiorOrganization'));
    if (org) return org;
  } else {
    const user = readJson('user');
    const org = fromObj(user?.organization) || (user?.organizationName ? { name: String(user.organizationName) } : null);
    if (org) return org;
  }
  return { name: 'SkyStruct Lite' };
}

function absoluteLogoUrl(): string {
  return typeof window !== 'undefined' ? `${window.location.origin}${PDF_LOGO_PATH}` : PDF_LOGO_PATH;
}

let logoPngPromise: Promise<string> | null = null;
/** The official SVG logo rasterised to a crisp PNG (canvas renderers handle PNG reliably). */
function getLogoPng(): Promise<string> {
  if (!logoPngPromise) {
    logoPngPromise = (async () => {
      try {
        const svg = await (await fetch(PDF_LOGO_PATH)).text();
        const w = 900;
        const h = Math.round(w * LOGO_RATIO);
        const sized = svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`);
        const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
        try {
          const img = await loadImage(url);
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          c.getContext('2d')!.drawImage(img, 0, 0, w, h);
          return c.toDataURL('image/png');
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch {
        return absoluteLogoUrl();
      }
    })();
  }
  return logoPngPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Standard letterhead + base styles ───────────────────────────────────────

export interface PdfHeaderOptions {
  /** e.g. "QUOTATION", "PAYMENT RECEIPT" */
  docType: string;
  /** Right-hand key/value rows (number, date, status…). Values are escaped. */
  meta?: Array<[string, string | number | undefined | null]>;
  org?: PdfOrg;
  /** Optional sub-line under the doc type (e.g. a project name). */
  subtitle?: string;
}

/** CSS for the letterhead and the shared building blocks (prefixed `sd-`). */
export const PDF_BASE_CSS = `
  .sd-head { display: table; width: 100%; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
  .sd-head > div { display: table-cell; vertical-align: middle; }
  .sd-brand { display: table; }
  .sd-brand > .sd-logo, .sd-brand > .sd-org-wrap { display: table-cell; vertical-align: middle; }
  .sd-brand .sd-logo { padding-inline-end: 12px; }
  .sd-brand img { height: 38px; width: auto; display: block; }
  .sd-brand .sd-org-wrap { padding-inline-start: 12px; border-inline-start: 1px solid #e2e8f0; }
  .sd-org { font-size: 12.5px; font-weight: 800; color: #0f172a; line-height: 1.25; }
  .sd-org-line { font-size: 9.5px; color: #64748b; line-height: 1.35; }
  .sd-doc { text-align: end; }
  .sd-doc-type { font-size: 16px; font-weight: 900; color: #1e3a8a; letter-spacing: 1px; text-transform: uppercase; line-height: 1.1; }
  .sd-doc-sub { font-size: 10px; color: #475569; font-weight: 600; margin-top: 2px; }
  .sd-meta { margin-top: 4px; margin-inline-start: auto; border-collapse: collapse; font-size: 9.5px; }
  .sd-meta td { padding: 0.5px 0; line-height: 1.35; }
  .sd-meta td.k { color: #64748b; padding-inline-end: 10px; text-align: end; white-space: nowrap; }
  .sd-meta td.v { color: #0f172a; font-weight: 700; text-align: end; }
  .sd-title { font-size: 10px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: .8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 12px 0 6px; }
  .sd-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; background: #f8fafc; }
  .sd-cols { display: table; width: 100%; table-layout: fixed; border-spacing: 0; }
  .sd-cols > div { display: table-cell; vertical-align: top; }
  .sd-cols > div + div { padding-inline-start: 14px; }
  .sd-label { font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 2px; }
  .sd-strong { font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.3; }
  .sd-muted { font-size: 10px; color: #475569; line-height: 1.4; }
  .sd-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .sd-table th { background: #1e3a8a; color: #ffffff; border: 1px solid #1e3a8a; font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; padding: 7px 8px; text-align: start; }
  .sd-table td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: #1e293b; }
  .sd-table tbody tr:nth-child(even) td { background: #f8fafc; }
  .sd-table .num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .sd-table .ctr { text-align: center; }
  .sd-totals { width: 46%; margin-inline-start: auto; border-collapse: collapse; font-size: 11.5px; margin-top: 12px; }
  .sd-totals td { padding: 5px 8px; }
  .sd-totals td:last-child { text-align: end; font-weight: 700; white-space: nowrap; }
  .sd-totals tr.grand td { background: #1e3a8a; color: #ffffff; border: 1px solid #1e3a8a; font-size: 13.5px; font-weight: 900; padding: 9px 8px; }
  .sd-sign { display: table; width: 100%; table-layout: fixed; margin-top: 36px; }
  .sd-sign > div { display: table-cell; text-align: center; padding: 0 18px; }
  .sd-sign .line { border-bottom: 1px solid #94a3b8; height: 42px; margin-bottom: 6px; }
  .sd-sign .who { font-size: 11px; font-weight: 700; color: #0f172a; }
  .sd-sign .role { font-size: 10px; color: #64748b; }
`;

export function pdfHeaderHtml({ docType, meta = [], org, subtitle }: PdfHeaderOptions): string {
  const o = org || getPdfOrg();
  const contact = [o.phone, o.email].filter(Boolean).map(ltr).join(' &nbsp;•&nbsp; ');
  const rows = meta
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${ltr(v)}</td></tr>`)
    .join('');
  return `
    <div class="sd-head pdf-avoid">
      <div class="sd-brand">
        <div class="sd-logo"><img data-pdf-logo src="${absoluteLogoUrl()}" alt="SkyStruct" /></div>
        <div class="sd-org-wrap">
          <div class="sd-org">${esc(o.name)}</div>
          ${o.address ? `<div class="sd-org-line">${esc(o.address)}</div>` : ''}
          ${contact ? `<div class="sd-org-line">${contact}</div>` : ''}
        </div>
      </div>
      <div class="sd-doc">
        <div class="sd-doc-type">${esc(docType)}</div>
        ${subtitle ? `<div class="sd-doc-sub">${esc(subtitle)}</div>` : ''}
        ${rows ? `<table class="sd-meta">${rows}</table>` : ''}
      </div>
    </div>`;
}

/** Wrap a body in a complete standalone HTML document (also used by on-screen previews). */
export function pdfDocumentHtml({ title, css = '', body }: { title: string; css?: string; body: string }): string {
  const rtl = isRtl(getLang());
  return `<!DOCTYPE html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px ${SIDE_PX}px; background: #ffffff; color: #0f172a;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Tahoma, Arial, sans-serif;
    font-size: 12px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ${PDF_BASE_CSS}
  ${css}
</style>
</head>
<body>${body}</body>
</html>`;
}

// ── Default terms lines (shown at the bottom of every page) ─────────────────

export const PDF_TERMS = {
  quotation:
    'Terms & Conditions: This quotation is valid for 30 days from the issue date. Prices cover only the scope listed; any additional work is quoted separately. Work begins on written acceptance and receipt of the agreed advance.',
  receipt:
    'Terms & Conditions: This receipt confirms payment received against the stated milestone and is subject to realisation of funds. Please quote the receipt number in all correspondence.',
  report:
    'Terms & Conditions: This report records site progress as reported on the stated date. Quantities and progress figures are indicative and subject to joint measurement and verification.',
  certificate:
    'Terms & Conditions: Practical completion is subject to the agreed snag list and defects-liability period. This certificate does not waive any obligations under the contract.',
  voucher:
    'Terms & Conditions: This document records a project transaction for accounting purposes and is subject to verification against supporting invoices and bank records.',
} as const;

// ── Export ──────────────────────────────────────────────────────────────────

export interface ExportPdfOptions {
  /** Full HTML document (use pdfDocumentHtml) — rendered in isolation. */
  html: string;
  filename: string;
  /** Terms / conditions line printed at the bottom of every page. */
  terms?: string;
  /** 'download' saves the .pdf; 'open' opens it in a new tab (print from the PDF viewer). */
  action?: 'download' | 'open';
}

const nextFrame = (w: Window) => new Promise<void>((r) => w.requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForAssets(doc: Document) {
  const imgs = Array.from(doc.images);
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); })
      )
    ),
    wait(6000),
  ]);
  try {
    await Promise.race([(doc as any).fonts?.ready, wait(3000)]);
  } catch {
    /* ignore */
  }
}

/**
 * Move rows / blocks that would be cut by a page edge onto the next page.
 * Table rows get a spacer row + a repeated header row; other blocks get extra top margin.
 * Section headings (keep-with-next) never sit alone at the bottom of a page.
 */
const KEEP_WITH_NEXT = '.sd-title, .sec-title, h1, h2, h3, [data-pdf-keep-next]';
function paginate(doc: Document) {
  const body = doc.body;
  const top = (el: Element) => el.getBoundingClientRect().top - body.getBoundingClientRect().top;
  const nodes = Array.from(
    body.querySelectorAll<HTMLElement>(`tr, img, .pdf-avoid, [data-pdf-avoid], .pdf-break-before, ${KEEP_WITH_NEXT}`)
  );

  for (const el of nodes) {
    if (!el.isConnected || el.closest('thead')) continue;
    const forceBreak = el.classList.contains('pdf-break-before');
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (!forceBreak && r.height >= CONTENT_H_PX * 0.92) continue; // taller than a page: let it flow
    let t = top(el); // measured fresh each time: earlier moves shift everything below
    // Headings also need room for the start (~70px) of whatever follows them.
    let need = r.height;
    if (el.matches(KEEP_WITH_NEXT) && el.nextElementSibling) {
      const next = el.nextElementSibling.getBoundingClientRect();
      need = next.bottom - r.top > 0 ? Math.min(next.bottom - r.top, r.height + 70) : r.height;
    }
    const page = Math.floor(t / CONTENT_H_PX);
    const pageEnd = (page + 1) * CONTENT_H_PX;
    const crosses = t + need > pageEnd + 0.5;
    const needsBreak = forceBreak ? t % CONTENT_H_PX > 1 : crosses;
    if (!needsBreak) continue;

    if (el.tagName === 'TR') {
      const table = el.closest('table');
      const spacer = doc.createElement('tr');
      spacer.setAttribute('data-pdf-spacer', '');
      const td = doc.createElement('td');
      td.colSpan = 99;
      td.style.cssText = `height:${pageEnd - t}px;padding:0;border:0;background:#fff;font-size:0;line-height:0;`;
      spacer.appendChild(td);
      el.parentNode!.insertBefore(spacer, el);
      // Correct for border-collapse / spacing differences.
      const delta = pageEnd - top(el);
      if (Math.abs(delta) > 0.5) td.style.height = `${Math.max(0, pageEnd - t + delta)}px`;
      const head = table?.tHead;
      if (head) {
        Array.from(head.rows).forEach((hr) => {
          const clone = hr.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-pdf-repeat-head', '');
          el.parentNode!.insertBefore(clone, el);
        });
      }
    } else {
      for (let i = 0; i < 4; i++) {
        t = top(el);
        const gap = pageEnd - t;
        if (gap <= 0.5) break;
        const cur = parseFloat(doc.defaultView!.getComputedStyle(el).marginTop) || 0;
        el.style.marginTop = `${cur + gap}px`;
      }
    }
  }
}

function drawFooter(opts: { page: number; pages: number; terms: string; org: string; rtl: boolean }): string {
  const s = RENDER_SCALE;
  const w = PAGE_W_PX * s;
  const h = Math.round(FOOTER_MM * PX_PER_MM * s);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const side = SIDE_PX * s;
  const font = `'Segoe UI', Tahoma, Arial, sans-serif`;
  (ctx as any).direction = opts.rtl ? 'rtl' : 'ltr';

  // rule
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(side, 8 * s);
  ctx.lineTo(w - side, 8 * s);
  ctx.stroke();

  // page number (end side)
  const pageText = tr('Page {{page}} of {{pages}}', { page: opts.page, pages: opts.pages });
  ctx.font = `700 ${9.5 * s}px ${font}`;
  ctx.fillStyle = '#1e3a8a';
  const pageW = ctx.measureText(pageText).width;
  ctx.textAlign = opts.rtl ? 'left' : 'right';
  ctx.fillText(pageText, opts.rtl ? side : w - side, 22 * s);

  // terms (start side, wrapped to 2 lines)
  ctx.font = `${8.5 * s}px ${font}`;
  ctx.fillStyle = '#475569';
  ctx.textAlign = opts.rtl ? 'right' : 'left';
  const maxW = w - side * 2 - pageW - 24 * s;
  const words = opts.terms.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
      if (lines.length === 3) break;
    } else line = test;
  }
  if (lines.length < 3 && line) lines.push(line);
  const x = opts.rtl ? w - side : side;
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, (21 + i * 11.5) * s));

  // generated line
  ctx.font = `${7.5 * s}px ${font}`;
  ctx.fillStyle = '#94a3b8';
  const stamp = new Date().toLocaleDateString(opts.rtl ? 'ar' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.textAlign = opts.rtl ? 'left' : 'right';
  // U+2068/U+2069 isolate each part so mixed Arabic/Latin text keeps its order.
  ctx.fillText(`\u2068${opts.org}\u2069 · \u2068${stamp}\u2069`, opts.rtl ? side : w - side, 34 * s);

  return c.toDataURL('image/png');
}

export async function exportPdf({ html, filename, terms = '', action = 'download' }: ExportPdfOptions): Promise<void> {
  // Open the tab synchronously (inside the click) so pop-up blockers allow it.
  let viewer: Window | null = null;
  if (action === 'open') {
    viewer = window.open('', '_blank');
    try {
      viewer?.document.write(`<p style="font-family:sans-serif;padding:24px;color:#475569">${esc(tr('Preparing PDF…'))}</p>`);
    } catch {
      /* ignore */
    }
  }

  const rtl = isRtl(getLang());
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = `position:fixed;left:-12000px;top:0;width:${PAGE_W_PX}px;height:${PAGE_H_MM * PX_PER_MM}px;border:0;background:#fff;`;
  document.body.appendChild(iframe);

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const doc = iframe.contentDocument!;
    const win = iframe.contentWindow!;
    // Engine overrides: fixed page width/margins; drop decorative fixed-position watermarks.
    const engineCss = `<style>
      /* No scrollbars: classic (Windows) scrollbars take ~17px and shift/crop the capture. */
      html, body { width: ${PAGE_W_PX}px !important; margin: 0 !important; background: #ffffff !important;
        overflow: hidden !important; scrollbar-width: none !important; }
      ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      body { padding: 0 ${SIDE_PX}px 16px !important; box-sizing: border-box !important; }
      .watermark, [data-pdf-hide] { display: none !important; }
    </style>`;
    // Remote web fonts load late and reflow the text after page breaks are measured;
    // every document uses the same local font stack instead.
    const localFonts = html.replace(/@import\s+url\([^)]*fonts\.googleapis[^)]*\)\s*;?/gi, '');
    const withEngine = /<\/head>/i.test(localFonts)
      ? localFonts.replace(/<\/head>/i, `${engineCss}</head>`)
      : engineCss + localFonts;
    doc.open();
    doc.write(withEngine);
    doc.close();

    // Official logo as a rasterised PNG.
    const logo = await getLogoPng();
    doc.querySelectorAll<HTMLImageElement>('img[data-pdf-logo]').forEach((img) => (img.src = logo));
    await waitForAssets(doc);
    await nextFrame(win);

    paginate(doc);
    await nextFrame(win);

    const totalH = Math.ceil(doc.body.scrollHeight);
    iframe.style.height = `${totalH}px`;
    await nextFrame(win);

    const pages = Math.max(1, Math.ceil((totalH - 2) / CONTENT_H_PX));
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const org = getPdfOrg().name;

    for (let p = 0; p < pages; p++) {
      const y = p * CONTENT_H_PX;
      const sliceH = Math.min(CONTENT_H_PX, totalH - y);
      const canvas = await html2canvas(doc.body, {
        scale: RENDER_SCALE,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        x: 0,
        y,
        width: PAGE_W_PX,
        height: sliceH,
        windowWidth: PAGE_W_PX,
        windowHeight: totalH,
        scrollX: 0,
        scrollY: 0,
      });
      if (p > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, MARGIN_TOP_MM, PAGE_W_MM, sliceH / PX_PER_MM, undefined, 'FAST');
      const footer = drawFooter({ page: p + 1, pages, terms: tr(terms), org, rtl });
      pdf.addImage(footer, 'PNG', 0, PAGE_H_MM - FOOTER_MM, PAGE_W_MM, FOOTER_MM, undefined, 'FAST');
    }

    const safeName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    if (action === 'open' && viewer && !viewer.closed) {
      const url = URL.createObjectURL(pdf.output('blob'));
      viewer.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      pdf.save(safeName);
    }
  } catch (err) {
    if (viewer && !viewer.closed) viewer.close();
    throw err;
  } finally {
    iframe.remove();
  }
}

/** File-name friendly slug. */
export const pdfSlug = (s: unknown, fallback = 'document') =>
  (String(s ?? '').trim() || fallback).replace(/[\s\\/:*?"<>|#%&.,;'`~!@$^()[\]{}=+]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || fallback;
