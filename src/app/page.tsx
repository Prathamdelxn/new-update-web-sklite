'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { isInteriorSession } from '@/lib/interiorAuth';
import { ArrowRight, ArrowUpRight, Menu, Plus, X } from 'lucide-react';

type Product = 'construction' | 'interior';

/* Palette — taken from the SkyStruct logo (#004799 / #009EE3), on warm paper and ink.
   Interior carries a warm bronze so the two products read apart without leaving the brand. */
const C = {
  ink: '#0B1A2E',
  paper: '#F6F4EF',
  line: '#E3DFD6',
  muted: '#5E6675',
  blue: '#004799',
  sky: '#009EE3',
  bronze: '#9A6A3F',
};

const navLinks = [
  { label: 'Construction', href: '#construction' },
  { label: 'Interior', href: '#interior' },
  { label: 'Platform', href: '#platform' },
  { label: 'FAQ', href: '#faq' },
];

const products: Record<Product, { name: string; label: string; photo: string; tagline: string; accent: string; features: string[]; cards: { title: string; sub: string; dot: string }[] }> = {
  construction: {
    name: 'Construction',
    label: 'For contractors',
    photo: '/construction-auth-bg.jpg',
    accent: C.sky,
    tagline: 'Sites, labour, materials and money — tracked from the same plan.',
    features: [
      'Site survey, plans and drawing approvals with on-plan pins',
      'BOQ approvals with budget-impact checks',
      'Milestones, tasks and Gantt, with Primavera P6 (XER) import',
      'Material requests, purchases, GRN and usage against stock',
      'Geofenced selfie attendance and payroll export',
      'Snags with an escalation matrix, risks and handover',
    ],
    cards: [
      { title: 'Snag closed', sub: 'Tower A · Level 3', dot: '#34D399' },
      { title: '142 on site today', sub: 'Attendance verified', dot: '#7FD3F5' },
    ],
  },
  interior: {
    name: 'Interior',
    label: 'For fit-out firms',
    photo: '/interior-bg.jpg',
    accent: C.bronze,
    tagline: 'From the first client call to the keys — one record the whole way.',
    features: [
      'Sales pipeline from lead to confirmed order',
      'Client requirement forms and approved 2D / 3D drawings, shared by secure link',
      'BOQ and quotation builder with internal approval',
      'RFQs, vendor quote comparison, POs, GRN and vendor payments',
      'WBS with activities, sub-items, milestones and timeline',
      'DPR and weekly reports, RFIs, snags, change and variation orders',
    ],
    cards: [
      { title: 'Quotation approved', sub: 'Option A · QAR 412k', dot: '#34D399' },
      { title: 'Drawing R3 shared', sub: 'Sent to client by link', dot: '#F2C38B' },
    ],
  },
};

const modules = [
  'BOQ', 'Quotations', 'RFQ & vendor comparison', 'Purchase orders', 'Goods receipt', 'Vendor payments',
  'Daily progress reports', 'Weekly reports', 'RFIs', 'Snags on drawings', 'Risks', 'Change orders',
  'Variation orders', 'WBS', 'Gantt timeline', 'Attendance', 'Payroll', 'Materials', 'Escalation matrix',
  'Handover', 'Arabic · RTL', 'Audit trail',
];

const interiorJourney = ['Lead', 'Requirements', 'Site visit', 'Drawings', 'BOQ', 'Quotation', 'Order', 'Execution', 'Handover'];

/* Every "after" maps to a screen that exists today (see the feature notes in each line). */
const beforeAfter: Record<Product, { before: string; after: string }[]> = {
  construction: [
    { before: '“Is the BOQ revision OK?” on WhatsApp', after: 'BOQ revision approved by its assigned approvers' },
    { before: 'budget_final_v3.xlsx', after: 'Budget impact checked before the BOQ is approved' },
    { before: 'Snag photos in an email thread', after: 'Snag with photos, owner and status — Open to Closed' },
    { before: 'Paper attendance register', after: 'Geofenced selfie check-in, exported to payroll' },
  ],
  interior: [
    { before: 'Requirements jotted down on a call', after: 'Client fills in the requirement form from a link' },
    { before: 'final_final_v2.pdf sent on WhatsApp', after: 'Versioned drawing, approved internally, shared by link' },
    { before: 'Quotation built in Excel', after: 'Quotation built from the BOQ, with internal approval' },
    { before: 'Vendor prices across three emails', after: 'RFQ with vendor quotes compared side by side' },
  ],
};

const audiences = [
  { photo: '/tower-site.jpg', product: 'Construction', title: 'Contractors & developers', text: 'Building and civil projects that need labour, materials, BOQ and milestones under control.', tags: ['BOQ approvals', 'Milestones & P6 import', 'Materials'] },
  { photo: '/interior-bg.jpg', product: 'Interior', title: 'Interior & fit-out firms', text: 'Studios that win work through design, then deliver it with their own vendors.', tags: ['Sales pipeline', 'Drawings & quotations', 'Procurement'] },
  { photo: '/construction-auth-bg.jpg', product: 'Both', title: 'Site teams & subcontractors', text: 'People on site who check in, log progress and close snags from their phone.', tags: ['Mobile app', 'Attendance', 'Snags & DPR'] },
];

const steps = [
  { title: 'Create your workspace', text: 'Choose Construction or Interior. Your currency follows the country of your phone number.' },
  { title: 'Invite your team', text: 'Add members and give each one a role — project manager, site engineer, quantity surveyor, subcontractor and more.' },
  { title: 'Set up the project', text: 'Import the BOQ from Excel, upload plans or drawings, and plan milestones — or import a Primavera P6 schedule.' },
  { title: 'Run it from site', text: 'Site teams check in, post daily progress with photos and raise snags from the mobile app.' },
  { title: 'Close out and hand over', text: 'Clear the open snags, complete the handover checklist and keep the full history on record.' },
];

const platform = [
  { title: 'What needs doing', text: 'Each project lists its next steps, overdue first, and opens the exact item.' },
  { title: 'Explained health', text: 'On Track, At Risk or Delayed — with the tasks and risks behind it.' },
  { title: 'English & Arabic', text: 'Full right-to-left Arabic, including reports and exports.' },
  { title: 'Web & mobile', text: 'Office and site work on the same data, in the browser or the app.' },
  { title: 'Roles & permissions', text: 'Organisation and project roles decide who sees, edits and approves.' },
  { title: 'Audit trail', text: 'Who changed what, and when, across the workspace.' },
  { title: 'Any currency', text: 'QAR, AED, SAR, USD, INR and more, per workspace and project.' },
  { title: 'Reports that travel', text: 'PDF and Excel for DPRs, invoices, attendance and payroll.' },
];

const faqs = [
  ['What is the difference between Construction and Interior?', 'Construction is built for contractors managing sites — labour, materials, BOQ, milestones and quality. Interior is built for fit-out firms and adds a sales pipeline, client requirements, drawings, quotations and procurement before the project starts. You choose one when you create your workspace.'],
  ['Can our team use it in Arabic?', 'Yes. Anyone can switch the workspace to Arabic; the layout turns right-to-left and generated reports and exports follow the language.'],
  ['Does it work on site?', 'Yes. There is a mobile app for both products: site teams check in for attendance, post daily progress with photos and raise or close snags. The web app also works on tablets and phones, and updates appear for everyone on the same project.'],
  ['Can subcontractors use it?', 'Yes. Add them to your vendor directory as a supplier or subcontractor. To give them access, invite them as members: Interior has a built-in Sub Contractor role, and in Construction you can create a role with only the permissions they need.'],
  ['How do plans work?', 'Each workspace has a plan that sets how many projects and members it can have. In Construction you can see your plan, any trial end date and current usage under Settings → Plan & Billing. Plan changes are made by the SkyStruct team.'],
  ['Which currencies are supported?', 'Your workspace currency follows your country when you sign up — QAR in Qatar, AED in the UAE, USD in the United States — and can be changed in settings.'],
  ['Can we control who sees what?', 'Yes. Roles control access per module, and each project can give members their own role.'],
];

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Adds .is-in to every .lp-reveal inside root as it scrolls into view. */
function useReveal(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!enabled || !el) return;
    const pending = () => Array.from(el.querySelectorAll<HTMLElement>('.lp-reveal:not(.is-in)'));
    if (reducedMotion() || typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') {
      // Reveal everything now and anything rendered later (e.g. after a toggle)
      const showAll = () => pending().forEach((i) => i.classList.add('is-in'));
      showAll();
      if (typeof MutationObserver === 'undefined') return;
      const mo = new MutationObserver(showAll);
      mo.observe(el, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    el.classList.add('lp-ready');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    pending().forEach((i) => io.observe(i));
    // Elements mounted later (toggles re-render their rows) must be observed too,
    // otherwise they stay hidden.
    const mo = new MutationObserver(() => pending().forEach((i) => io.observe(i)));
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [root, enabled]);
}

/** "QAR 68.6M" → counts 0 → 68.6 once visible, keeping prefix/suffix. */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const m = value.match(/^(\D*)([\d.]+)(.*)$/);
  const target = m ? parseFloat(m[2]) : 0;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const animate = !!m && !reducedMotion() && typeof IntersectionObserver !== 'undefined';
  const [n, setN] = useState(animate ? 0 : target);

  useEffect(() => {
    const el = ref.current;
    if (!animate || !el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setN(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!m) return <span>{value}</span>;
  return <span ref={ref}>{m[1]}{n.toFixed(decimals)}{m[3]}</span>;
}

function Eyebrow({ children, color = C.blue }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="font-label flex items-center gap-2 text-[11px] font-medium" style={{ color }}>
      <span className="h-px w-6" style={{ background: color }} />
      {children}
    </p>
  );
}

function WorkspacePreview({ product }: { product: Product }) {
  const interior = product === 'interior';
  const accent = interior ? C.bronze : C.sky;
  const stats = interior
    ? [['Active leads', '18'], ['Projects', '4'], ['Contract value', 'QAR 6.1M'], ['Overdue', '6']]
    : [['Active sites', '5'], ['Budget', 'QAR 68.6M'], ['On site today', '142'], ['Open snags', '3']];
  const rows = interior
    ? [['Requirements', 72], ['Drawings', 54], ['Quotation', 38]]
    : [['Tower A — structure', 82], ['Villa compound', 64], ['Retail podium', 41]];
  const todo = interior
    ? [['Overdue', 'Log goods receipt — PO-011'], ['Today', 'Answer RFI — video-wall size'], ['This week', 'Approve quotation, option A']]
    : [['Overdue', 'Approve BOQ revision — substructure'], ['Today', 'Close snag — exposed rebar, raft edge'], ['14:30', 'Material delivery, gate 2']];

  return (
    <div className="rounded-[18px] border bg-white text-left shadow-[0_30px_80px_-40px_rgba(0,71,153,0.35)]" style={{ borderColor: C.line }}>
      <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: C.line }}>
        <div className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full" style={{ background: C.line }} />)}</div>
        <span className="font-label text-[10px]" style={{ color: C.muted }}>{interior ? 'Interior workspace' : 'Construction workspace'}</span>
      </div>
      <div className="grid grid-cols-2 border-b sm:grid-cols-4" style={{ borderColor: C.line }}>
        {stats.map(([label, value], i) => (
          <div key={label} className={`px-5 py-4 ${i % 2 ? 'border-l' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`} style={{ borderColor: C.line }}>
            <p className="text-[11px]" style={{ color: C.muted }}>{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight" style={{ color: C.ink }}><CountUp value={value} /></p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-[1.3fr_1fr]">
        <div className="p-5">
          <p className="text-xs font-semibold" style={{ color: C.ink }}>{interior ? 'Pipeline' : 'Progress by site'}</p>
          {rows.map(([name, pct], i) => (
            <div key={name as string} className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px]" style={{ color: C.muted }}><span>{name}</span><span className="tabular-nums">{pct}%</span></div>
              <div className="h-1 rounded-full" style={{ background: '#EEECE6' }}>
                <div className="lp-bar h-full rounded-full" style={{ width: `${pct}%`, background: accent, ...delay(250 + i * 150) }} />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-5 md:border-l md:border-t-0" style={{ borderColor: C.line }}>
          <p className="text-xs font-semibold" style={{ color: C.ink }}>What needs doing</p>
          <ul className="mt-2">
            {todo.map(([when, what], i) => (
              <li key={what} className="flex items-baseline gap-3 border-b py-2.5 text-[12px] last:border-0" style={{ borderColor: C.line }}>
                <span className="font-label w-16 shrink-0 text-[9px]" style={{ color: i === 0 ? '#B4372F' : C.muted }}>{when}</span>
                <span style={{ color: C.ink }}>{what}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* Sample records use the real status values from each construction module. */
function ModuleCard({ n, title, note, children, d }: { n: string; title: string; note: string; children: React.ReactNode; d: number }) {
  return (
    <article className="lp-reveal flex flex-col rounded-[18px] border bg-white p-6 transition-shadow duration-300 hover:shadow-[0_20px_50px_-30px_rgba(0,71,153,0.35)]" style={{ borderColor: C.line, ...delay(d) }}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <span className="font-label text-[10px]" style={{ color: C.sky }}>{n}</span>
      </div>
      <div className="mt-5 flex-1 rounded-xl p-4" style={{ background: '#F8F7F3' }}>{children}</div>
      <p className="mt-4 text-[13.5px] leading-6" style={{ color: C.muted }}>{note}</p>
    </article>
  );
}

function ConstructionModules() {
  const riskImpact = ['Low', 'Medium', 'High', 'Very High'];
  const riskProb = ['High', 'Medium', 'Low'];
  // counts per [probability][impact]
  const riskCounts = [[0, 1, 2, 1], [1, 2, 1, 0], [2, 1, 0, 0]];
  const heat = (p: number, i: number) => {
    const score = (2 - p) + i; // 0..5
    return ['#E7F4EC', '#EEF3D9', '#FBEFD2', '#F9DEC9', '#F6CBC4', '#F0B1AA'][score];
  };
  return (
    <div className="mt-14 grid gap-4 md:grid-cols-2">
      <ModuleCard n="01" title="Snags & issues" d={0} note="Photo evidence, an owner and a due date on every snag — and an escalation matrix for the ones that go overdue.">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['Open', 5, '#B4372F'], ['In Progress', 2, '#B7791F'], ['Resolved', 12, C.sky], ['Closed', 9, '#2F855A']].map(([label, count, color]) => (
            <div key={label as string} className="rounded-lg bg-white px-1 py-3">
              <p className="text-2xl font-semibold tabular-nums" style={{ color: color as string }}><CountUp value={String(count)} /></p>
              <p className="mt-0.5 text-[10.5px]" style={{ color: C.muted }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12px]">
          <span className="size-1.5 rounded-full bg-[#B4372F]" /><span className="flex-1 truncate">Exposed rebar at raft edge — Block B</span><span className="font-label text-[9px]" style={{ color: '#B4372F' }}>Escalated</span>
        </div>
      </ModuleCard>

      <ModuleCard n="02" title="BOQ & budget" d={100} note="Each BOQ revision goes to its assigned approvers, with the budget impact shown before anyone signs off.">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px]" style={{ color: C.muted }}>Approved BOQ</p>
          <span className="font-label rounded-full bg-[#E7F4EC] px-2 py-0.5 text-[9px] text-[#2F855A]">Approved</span>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"><CountUp value="QAR 24.8M" /></p>
        {[['Substructure', 38], ['Superstructure', 44], ['MEP & finishes', 18]].map(([name, pct], i) => (
          <div key={name as string} className="mt-3">
            <div className="mb-1 flex justify-between text-[11px]" style={{ color: C.muted }}><span>{name}</span><span className="tabular-nums">{pct}%</span></div>
            <div className="h-1 rounded-full bg-white"><div className="lp-bar h-full rounded-full" style={{ width: `${pct}%`, background: C.blue, ...delay(200 + i * 120) }} /></div>
          </div>
        ))}
      </ModuleCard>

      <ModuleCard n="03" title="Risk register" d={0} note="Rate every risk by probability and impact, assign an owner and track it from Active to Resolved.">
        <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1 text-[10px]">
          {riskProb.map((p, pi) => (
            <div key={p} className="contents">
              <span className="pe-1.5 self-center text-end" style={{ color: C.muted }}>{p}</span>
              {riskImpact.map((imp, ii) => (
                <div key={imp} className="grid h-9 place-items-center rounded-md text-[12px] font-semibold tabular-nums" style={{ background: heat(pi, ii), color: C.ink }}>
                  {riskCounts[pi][ii] || ''}
                </div>
              ))}
            </div>
          ))}
          <span />
          {riskImpact.map((imp) => <span key={imp} className="pt-1 text-center" style={{ color: C.muted }}>{imp}</span>)}
        </div>
        <p className="mt-2 flex justify-between text-[10px]" style={{ color: C.muted }}><span>Probability ↑</span><span>Impact →</span></p>
      </ModuleCard>

      <ModuleCard n="04" title="Material requests" d={100} note="Site raises a request, the office approves it and it is marked fulfilled on delivery — with usage logged against stock.">
        <div className="rounded-lg bg-white px-3 py-2.5 text-[12px]">
          <div className="flex justify-between"><span className="font-medium">Cement OPC 53</span><span className="tabular-nums" style={{ color: C.muted }}>200 bags</span></div>
          <p className="mt-0.5 text-[11px]" style={{ color: C.muted }}>Requested by site engineer · Tower A</p>
        </div>
        <ol className="mt-4 flex items-center">
          {['Pending', 'Approved', 'Fulfilled'].map((s, i) => (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <span className="flex flex-col items-center gap-1.5">
                <span className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: i < 2 ? C.blue : '#C9D3DF' }}>{i + 1}</span>
                <span className="text-[10.5px]" style={{ color: i < 2 ? C.ink : C.muted }}>{s}</span>
              </span>
              {i < 2 && <span className="mx-2 mb-5 h-px flex-1" style={{ background: i < 1 ? C.blue : '#C9D3DF' }} />}
            </li>
          ))}
        </ol>
      </ModuleCard>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [preview, setPreview] = useState<Product>('construction');
  const [ba, setBa] = useState<Product>('construction');

  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior' ||
    isInteriorSession();
  const showPage = !(loading || user || isInterior);

  useReveal(rootRef, showPage);

  useEffect(() => {
    if (!loading && (user || isInteriorSession())) {
      router.push(isInterior ? '/interior-new' : '/construction-dashboard');
    }
  }, [loading, router, user, isInterior]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showPage) {
    return (
      <div className="lp-grain flex min-h-screen items-center justify-center px-4" style={{ background: C.ink }}>
        <img src="/SS-Logo-White.svg" alt="SkyStruct" className="h-20 w-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="min-h-screen overflow-x-hidden text-[15px] leading-relaxed" style={{ background: C.paper, color: C.ink }}>
      {/* Header */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled ? 'border-b backdrop-blur-md' : 'border-b border-transparent'}`}
        style={scrolled ? { background: 'rgba(246,244,239,.88)', borderColor: C.line } : undefined}>
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="SkyStruct home" onClick={(e) => {
            e.preventDefault();
            setMenuOpen(false);
            window.history.replaceState(null, '', '/');
            window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
          }}><img src="/SS-Logo-2025-Colour.svg" alt="SkyStruct" className="h-10 w-auto" /></Link>
          <nav className="hidden items-center gap-9 md:flex">
            {navLinks.map((l) => <a key={l.href} href={l.href} className="text-sm transition-colors hover:text-[#004799]" style={{ color: C.muted }}>{l.label}</a>)}
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/login" className="text-sm font-medium transition-colors hover:text-[#004799]">Sign in</Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#003578]" style={{ background: C.blue }}>
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 md:hidden" aria-label="Toggle navigation">{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        {menuOpen && (
          <div className="border-t px-5 pb-5 md:hidden" style={{ background: C.paper, borderColor: C.line }}>
            {navLinks.map((l) => <a key={l.href} onClick={() => setMenuOpen(false)} href={l.href} className="block border-b py-3.5 text-sm" style={{ borderColor: C.line }}>{l.label}</a>)}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/login" className="rounded-full border py-2.5 text-center text-sm font-medium" style={{ borderColor: C.ink }}>Sign in</Link>
              <Link href="/register" className="rounded-full py-2.5 text-center text-sm font-medium text-white" style={{ background: C.blue }}>Get started</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-5 pb-12 pt-36 sm:px-8 lg:pt-44">
          <div className="lp-glow lp-drift -right-40 top-10 size-[38rem]" />
          <div className="relative mx-auto max-w-[1200px]">
            <div className="lp-rise" style={delay(0)}><Eyebrow>Project management for the built environment</Eyebrow></div>
            <div className="mt-7 grid items-end gap-10 lg:grid-cols-[1.35fr_1fr]">
              <h1 className="font-display text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[5.25rem]">
                <span className="lp-rise" style={delay(80)}>Build it. <span style={{ color: C.blue }}>Fit it out.</span></span>
                <span className="lp-rise" style={delay(220)}>Run it from one place.</span>
              </h1>
              <div className="lp-rise lg:pb-3" style={delay(380)}>
                <p className="max-w-md text-[17px] leading-7" style={{ color: C.muted }}>
                  SkyStruct gives contractors and interior fit-out firms a workspace made for how they actually work — on site, in the office and with the client.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <Link href="/register" className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#003578]" style={{ background: C.blue }}>
                    Create your workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a href="#products" className="text-sm font-medium underline decoration-1 underline-offset-[6px] transition-colors hover:text-[#004799]" style={{ textDecorationColor: C.line }}>See both products</a>
                </div>
              </div>
            </div>

            {/* Two photos = two products, with live-looking glass cards */}
            <div className="mt-16 grid gap-4 sm:grid-cols-2">
              {(['construction', 'interior'] as Product[]).map((p, idx) => (
                <a key={p} href={`#${p}`} className="lp-reveal group relative block aspect-[4/3] overflow-hidden rounded-[18px] lg:aspect-[16/10]" style={delay(idx * 120)}>
                  <img src={products[p].photo} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A2E]/85 via-[#0B1A2E]/10 to-[#0B1A2E]/20" />
                  {products[p].cards.map((card, ci) => (
                    <div key={card.title}
                      className={`lp-glass lp-float absolute rounded-xl px-3.5 py-2.5 text-white ${ci === 0 ? 'left-5 top-5' : 'right-5 top-[38%] hidden sm:block'}`}
                      style={{ '--fd': `${ci * 1.6 + idx * 0.8}s` } as CSSProperties}>
                      <p className="flex items-center gap-2 text-[13px] font-semibold"><span className="size-1.5 rounded-full" style={{ background: card.dot }} />{card.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/70">{card.sub}</p>
                    </div>
                  ))}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white">
                    <div>
                      <p className="font-label text-[10px] text-white/70">{products[p].label}</p>
                      <p className="font-display mt-1 text-4xl">{products[p].name}</p>
                    </div>
                    <span className="grid size-10 place-items-center rounded-full border border-white/40 transition-colors group-hover:bg-white group-hover:text-[#0B1A2E]"><ArrowUpRight className="size-4" /></span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Module marquee */}
        <section aria-label="Modules" className="lp-reveal py-6">
          <div className="lp-marquee">
            <div className="lp-marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {modules.map((m) => (
                    <li key={m} className="flex items-center whitespace-nowrap px-5 text-sm font-medium" style={{ color: C.muted }}>
                      <span className="me-5 size-1 rounded-full" style={{ background: C.sky }} />{m}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* Before → after */}
        <section className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <Eyebrow>Why teams switch</Eyebrow>
                <h2 className="font-display mt-5 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">Out of chats and spreadsheets. <span style={{ color: C.blue }}>Into one record.</span></h2>
              </div>
              <div className="flex w-fit rounded-full border p-1" style={{ borderColor: C.line, background: 'white' }}>
                {(['construction', 'interior'] as Product[]).map((p) => (
                  <button key={p} type="button" onClick={() => setBa(p)}
                    className="rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300"
                    style={ba === p ? { background: C.ink, color: 'white' } : { color: C.muted }}>
                    {products[p].name}
                  </button>
                ))}
              </div>
            </div>
            <div key={ba} className="mt-12 overflow-hidden rounded-[18px] border bg-white" style={{ borderColor: C.line }}>
              <div className="hidden grid-cols-[1fr_auto_1.2fr] border-b px-6 py-3 sm:grid" style={{ borderColor: C.line }}>
                <span className="font-label text-[10px]" style={{ color: C.muted }}>Today</span>
                <span className="w-10" />
                <span className="font-label text-[10px]" style={{ color: products[ba].accent }}>With SkyStruct {products[ba].name}</span>
              </div>
              {beforeAfter[ba].map((row, i) => (
                <div key={row.before} className="lp-reveal grid items-center gap-3 border-b px-6 py-5 last:border-0 sm:grid-cols-[1fr_auto_1.2fr] sm:gap-0" style={{ borderColor: C.line, ...delay(i * 90) }}>
                  <p className="text-[14px] line-through decoration-[#C9C3B6]" style={{ color: C.muted }}>{row.before}</p>
                  <ArrowRight className="hidden size-4 justify-self-center sm:block sm:w-10" style={{ color: C.line }} />
                  <p className="flex items-center gap-2.5 text-[14.5px] font-medium">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full text-white" style={{ background: products[ba].accent }}>
                      <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>
                    </span>
                    {row.after}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live preview */}
        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <Eyebrow>Inside the workspace</Eyebrow>
                <h2 className="font-display mt-5 max-w-xl text-4xl leading-[1.1] sm:text-5xl">Open a project. Know what to do next.</h2>
              </div>
              <div className="flex w-fit rounded-full border p-1" style={{ borderColor: C.line, background: 'white' }}>
                {(['construction', 'interior'] as Product[]).map((p) => (
                  <button key={p} type="button" onClick={() => setPreview(p)}
                    className="rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300"
                    style={preview === p ? { background: C.ink, color: 'white' } : { color: C.muted }}>
                    {products[p].name}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative mt-10">
              <div className="lp-glow lp-drift -inset-x-16 -inset-y-20" />
              <div className="lp-reveal relative" style={delay(100)}>
                <WorkspacePreview key={preview} product={preview} />
              </div>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="px-5 pb-24 pt-4 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal">
              <Eyebrow>Who it&apos;s for</Eyebrow>
              <h2 className="font-display mt-5 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">Built for the people who deliver the work.</h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {audiences.map((a, i) => (
                <article key={a.title} className="lp-reveal group overflow-hidden rounded-[18px] border bg-white" style={{ borderColor: C.line, ...delay(i * 110) }}>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img src={a.photo} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]" />
                    <span className="lp-glass font-label absolute left-4 top-4 rounded-full px-2.5 py-1 text-[9.5px] text-white">{a.product}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold tracking-tight">{a.title}</h3>
                    <p className="mt-2 text-[14px] leading-6" style={{ color: C.muted }}>{a.text}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {a.tags.map((t) => <span key={t} className="rounded-full border px-2.5 py-1 text-[11.5px]" style={{ borderColor: C.line, color: C.ink }}>{t}</span>)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="products" className="border-t px-5 py-24 sm:px-8" style={{ borderColor: C.line }}>
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal">
              <Eyebrow>Two products, one platform</Eyebrow>
              <h2 className="font-display mt-5 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">Choose the workspace that fits your work.</h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-[18px] border lg:grid-cols-2" style={{ borderColor: C.line, background: C.line }}>
              {(['construction', 'interior'] as Product[]).map((p, idx) => {
                const prod = products[p];
                return (
                  <article key={p} id={p === 'construction' ? 'construction' : undefined} className="lp-reveal flex flex-col bg-white p-8 sm:p-11" style={delay(idx * 120)}>
                    <p className="font-label text-[11px]" style={{ color: prod.accent }}>{prod.label}</p>
                    <h3 className="font-display mt-3 text-5xl">{prod.name}</h3>
                    <p className="mt-3 max-w-sm" style={{ color: C.muted }}>{prod.tagline}</p>
                    <ul className="mt-8 flex-1">
                      {prod.features.map((f, i) => (
                        <li key={f} className="group flex gap-4 border-t py-3.5 text-[14px] transition-colors hover:bg-[#FAF9F6]" style={{ borderColor: C.line }}>
                          <span className="font-label w-5 shrink-0 pt-0.5 text-[10px] transition-colors" style={{ color: C.muted }}>{String(i + 1).padStart(2, '0')}</span>
                          <span className="transition-transform duration-300 group-hover:translate-x-1">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={`/register?type=${p}`} className="group mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#0B1A2E] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#0B1A2E] hover:text-white">
                      Start with {prod.name} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interior journey */}
        <section id="interior" className="px-5 py-24 sm:px-8" style={{ background: '#EFEAE1' }}>
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <Eyebrow color={C.bronze}>Interior</Eyebrow>
                <h2 className="font-display mt-5 text-4xl leading-[1.1] sm:text-5xl">From first call to handover, <span style={{ color: C.bronze }}>without switching tools.</span></h2>
              </div>
              <p className="self-end text-[16px] leading-7" style={{ color: C.muted }}>
                Each lead moves through the stages your studio already follows. When the client confirms, it becomes a project with its drawings, BOQ and order already attached — nothing to re-enter.
              </p>
            </div>
            <ol className="mt-14 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] border sm:grid-cols-9" style={{ borderColor: '#DCD3C4', background: '#DCD3C4' }}>
              {interiorJourney.map((step, i) => (
                <li key={step} className="lp-reveal flex flex-col justify-between gap-6 p-4" style={{ background: i >= 7 ? C.ink : '#F7F3EC', color: i >= 7 ? 'white' : C.ink, ...delay(i * 70) }}>
                  <span className="font-label text-[10px]" style={{ color: i >= 7 ? 'rgba(255,255,255,.6)' : C.bronze }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[13px] font-medium leading-tight">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Construction */}
        <section className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal">
              <Eyebrow color={C.sky}>Construction</Eyebrow>
              <h2 className="font-display mt-5 max-w-3xl text-4xl leading-[1.1] sm:text-5xl">Site, materials, quality and money — <span style={{ color: C.blue }}>connected.</span></h2>
            </div>
            <ConstructionModules />
          </div>
        </section>

        {/* Platform — dark, grain, curved horizon */}
        <section id="platform" className="lp-grain lp-horizon rounded-b-[48px] px-5 pb-28 pt-28 text-white sm:px-8 md:rounded-b-[96px] md:pt-32" style={{ background: C.ink }}>
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal">
              <Eyebrow color={C.sky}>In both workspaces</Eyebrow>
              <h2 className="font-display mt-5 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">The essentials are already built in.</h2>
            </div>
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {platform.map((item, i) => (
                <article key={item.title} className="lp-reveal rounded-2xl border border-white/10 bg-white/[.03] p-7 transition-colors duration-300 hover:border-[#009EE3]/40 hover:bg-white/[.06]" style={delay((i % 4) * 90)}>
                  <h3 className="text-[15px] font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-6 text-white/60">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How to get started */}
        <section className="px-5 pb-8 pt-24 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="lp-reveal">
              <Eyebrow>How to get started</Eyebrow>
              <h2 className="font-display mt-5 max-w-2xl text-4xl leading-[1.1] sm:text-5xl">From sign-up to handover in five steps.</h2>
            </div>
            <ol className="relative mt-14 grid gap-8 md:grid-cols-5 md:gap-5">
              <span aria-hidden className="absolute left-0 right-0 top-[19px] hidden h-px md:block" style={{ background: C.line }} />
              {steps.map((s, i) => (
                <li key={s.title} className="lp-reveal relative" style={delay(i * 100)}>
                  <span className="relative grid size-10 place-items-center rounded-full border bg-white text-sm font-semibold tabular-nums" style={{ borderColor: i === 0 ? C.blue : C.line, color: i === 0 ? 'white' : C.blue, background: i === 0 ? C.blue : 'white' }}>{i + 1}</span>
                  <h3 className="mt-5 text-[15.5px] font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-6" style={{ color: C.muted }}>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div className="lp-reveal">
              <Eyebrow>Questions</Eyebrow>
              <h2 className="font-display mt-5 text-4xl leading-[1.1] sm:text-5xl">Good to know<br />before you start.</h2>
            </div>
            <div className="lp-reveal border-b" style={{ borderColor: C.line, ...delay(120) }}>
              {faqs.map(([q, a], i) => (
                <div key={q} className="border-t" style={{ borderColor: C.line }}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between gap-6 py-6 text-start text-[16px] font-medium">
                    <span>{q}</span>
                    <Plus className={`size-4 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`} style={{ color: C.blue }} />
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-6 leading-7" style={{ color: C.muted }}>{a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — brand blue, grain, drifting glow */}
        <section className="px-5 pb-24 sm:px-8">
          <div className="lp-reveal lp-grain relative mx-auto max-w-[1200px] overflow-hidden rounded-[24px] px-7 py-16 text-white sm:px-14 sm:py-20" style={{ background: C.blue }}>
            <div className="lp-glow lp-drift -right-24 -top-40 size-[34rem]" style={{ background: 'radial-gradient(closest-side, rgba(0,158,227,.55), transparent)' }} />
            <div className="lp-glow lp-drift -bottom-48 -left-24 size-[30rem]" style={{ background: 'radial-gradient(closest-side, rgba(6,29,61,.6), transparent)', animationDelay: '-6s' }} />
            <div className="relative grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
              <h2 className="font-display text-5xl leading-[1] sm:text-6xl">Set up your workspace<span style={{ color: '#7FD3F5' }}> today.</span></h2>
              <div>
                <p className="text-white/75">Pick Construction or Interior, invite your team and start your first project.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/register?type=construction" className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium transition-colors hover:bg-[#E6F5FC]" style={{ color: C.blue }}>Construction <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
                  <Link href="/register?type=interior" className="group inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10">Interior <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-5 pt-14 sm:px-8" style={{ borderColor: C.line }}>
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 pb-12 md:grid-cols-[1.6fr_repeat(3,1fr)]">
            <div className="max-w-xs">
              <img src="/SS-Logo-2025-Colour.svg" alt="SkyStruct" className="h-11 w-auto" />
              <p className="mt-5 text-sm leading-6" style={{ color: C.muted }}>Project management for construction contractors and interior fit-out firms.</p>
            </div>
            {([
              ['Products', [['Construction', '#construction'], ['Interior', '#interior'], ['Compare', '#products']]],
              ['Explore', [['Platform', '#platform'], ['FAQ', '#faq']]],
              ['Account', [['Create workspace', '/register'], ['Sign in', '/login'], ['Reset password', '/reset-password']]],
            ] as [string, string[][]][]).map(([title, links]) => (
              <div key={title}>
                <p className="font-label text-[10px]" style={{ color: C.muted }}>{title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {links.map(([label, href]) => (
                    <li key={label}>{href.startsWith('#') ? <a href={href} className="hover:text-[#004799]">{label}</a> : <Link href={href} className="hover:text-[#004799]">{label}</Link>}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t py-6 text-xs" style={{ borderColor: C.line, color: C.muted }}>
            <span>© {new Date().getFullYear()} SkyStruct. All rights reserved.</span>
            <span>English · العربية</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
