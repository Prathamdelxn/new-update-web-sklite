'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  HardHat,
  Layers3,
  Menu,
  MessageSquareQuote,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';

const navLinks = [
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Why SKYLITE', href: '#results' },
];

const features = [
  { icon: Layers3, title: 'One view of every project', text: 'Plans, progress, budgets and teams—connected across your whole portfolio.', tint: 'bg-sky-100 text-sky-700' },
  { icon: CircleDollarSign, title: 'Control every rupee', text: 'Keep BOQs, commitments and approvals clear long before costs become surprises.', tint: 'bg-emerald-100 text-emerald-700' },
  { icon: ClipboardCheck, title: 'Quality without the chase', text: 'Turn site observations into accountable actions with a complete close-out trail.', tint: 'bg-violet-100 text-violet-700' },
  { icon: FileCheck2, title: 'Drawings people trust', text: 'Make sure every team is always working from the latest approved document.', tint: 'bg-amber-100 text-amber-700' },
];

const steps = [
  ['01', 'Set up your workspace', 'Add your organisation, projects and people in one guided flow.'],
  ['02', 'Bring your site online', 'Start from a template or configure the workflow your team already uses.'],
  ['03', 'Make better calls daily', 'See the exact work, risk and spend that needs attention—before it escalates.'],
];

const operatingAreas = [
  {
    eyebrow: 'Project command centre',
    title: 'See the whole job without losing the detail.',
    description: 'A portfolio view for leadership and practical, project-level views for the people making progress happen on site.',
    points: ['Live progress and milestone visibility', 'Clear ownership across every workstream', 'Daily priorities surfaced automatically'],
    accent: 'bg-cyan-300',
  },
  {
    eyebrow: 'Commercial confidence',
    title: 'Keep scope, cost and approvals connected.',
    description: 'Give your commercial team one reliable source for budgets, BOQs, revisions and approvals—without endless version hunting.',
    points: ['Budget versus actual at a glance', 'Approval history on every important decision', 'Material and procurement requests in context'],
    accent: 'bg-emerald-300',
  },
  {
    eyebrow: 'Site quality and handover',
    title: 'Close the loop on every observation.',
    description: 'Capture issues in the field, assign the next action, and bring handover closer with a complete record of what was done.',
    points: ['Mobile-ready snag and inspection workflows', 'Photo and document evidence on each item', 'A traceable close-out record for every handover'],
    accent: 'bg-violet-300',
  },
];

const faqs = [
  ['How quickly can our team get started?', 'Most teams create their workspace, invite their core group and launch their first project in a single working session. Templates make it even faster.'],
  ['Can SKYLITE work across multiple projects?', 'Yes. Your workspace gives leadership a portfolio-level view while each project team gets a focused space for its own documents, progress and workflows.'],
  ['Will site teams need extensive training?', 'No. The experience is designed around clear next actions, simple updates and familiar construction workflows, so adoption feels natural for office and site teams.'],
  ['Can we control who sees sensitive information?', 'Yes. Role-based access lets you give people the right level of visibility and responsibility without exposing the rest of the workspace.'],
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [loading, router, user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading || user) {
    return <div className="grid min-h-screen place-items-center bg-[#07172b] text-2xl font-bold tracking-normal text-white">SKY<span className="text-cyan-300">LITE</span></div>;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-900">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/10 bg-[#07172b]/90 shadow-xl shadow-slate-950/15 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white" aria-label="SKYLITE home">
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-300 text-sm text-[#08203b] font-extrabold">S</span> SKY<span className="text-cyan-300">LITE</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-slate-300 transition hover:text-white">{link.label}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">Sign in</Link>
            <Link href="/register" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#07203c] transition hover:-translate-y-0.5 hover:bg-cyan-200">Start free <ArrowRight className="ml-1 inline size-3.5" /></Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 text-white md:hidden" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="border-t border-white/10 bg-[#07172b] px-5 pb-5 pt-2 md:hidden">
          {navLinks.map((link) => <a onClick={() => setMenuOpen(false)} key={link.href} href={link.href} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">{link.label}</a>)}
          <div className="mt-2 grid grid-cols-2 gap-2"><Link href="/login" className="rounded-lg border border-white/15 py-2.5 text-center text-sm font-semibold text-white">Sign in</Link><Link href="/register" className="rounded-lg bg-cyan-300 py-2.5 text-center text-sm font-bold text-[#07203c]">Start free</Link></div>
        </div>}
      </header>

      <main>
        <section className="relative isolate bg-[#07172b] px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
          <div className="absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(148,205,224,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,205,224,.08)_1px,transparent_1px)] [background-size:52px_52px]" />
          <div className="absolute -right-32 top-24 -z-10 size-[36rem] rounded-full bg-cyan-400/15 blur-[130px]" />
          <div className="absolute -left-40 bottom-0 -z-10 size-[28rem] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              {/* <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-cyan-100"><Sparkles className="size-3.5 text-cyan-300" /> BUILT FOR MODERN CONSTRUCTION TEAMS</div> */}
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-7xl">Your project site,<br /><span className="text-cyan-300">finally in sync.</span></h1>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Replace fragmented spreadsheets, chats and follow-ups with a single operating system that keeps every project moving forward.</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-bold text-[#06203c] shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200">Build your workspace <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>
                <a href="#platform" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Explore the platform <ChevronRight className="size-4" /></a>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-400"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-cyan-300" /> No credit card needed</span><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-cyan-300" /> Ready in minutes</span><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-cyan-300" /> Built for growing teams</span></div>
            </div>

            <div className="relative mx-auto mt-16 max-w-6xl rounded-2xl border border-white/15 bg-white/[.06] p-2 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-3">
              <div className="overflow-hidden rounded-xl bg-[#f4f8fc] p-3 sm:p-5">
                <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-rose-400" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-emerald-400" /><span className="ml-3 hidden rounded-md bg-slate-200 px-12 py-1 text-[10px] text-slate-400 sm:block">workspace.skylite.com / overview</span></div><div className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-cyan-300">LIVE WORKSPACE</div></div>
                <div className="grid gap-4 lg:grid-cols-[176px_1fr]">
                  <aside className="hidden rounded-xl bg-[#0c2440] p-4 text-slate-300 lg:block"><p className="mb-7 text-sm font-bold tracking-tight text-white">SKY<span className="text-cyan-300">LITE</span></p>{['Overview', 'Projects', 'Workflows', 'Documents', 'Team'].map((item, index) => <div key={item} className={`mb-1 rounded-lg px-3 py-2 text-xs ${index === 0 ? 'bg-cyan-300 font-bold text-[#0c2440]' : ''}`}>{item}</div>)}<div className="mt-12 rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-[10px] text-slate-400">Monthly health</p><p className="mt-1 text-xl font-bold text-white">86<span className="text-sm text-cyan-300">/100</span></p></div></aside>
                  <div className="min-w-0"><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wednesday, 16 July</p><h2 className="mt-1 text-lg font-bold tracking-tight text-[#102947] sm:text-2xl">Good morning, Ananya</h2></div><button className="rounded-lg bg-[#0c2440] px-3 py-2 text-[10px] font-bold text-white"><Plus className="mr-1 inline size-3" /> New project</button></div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['12', 'Active projects', 'text-cyan-700'], ['₹48.2M', 'Managed budget', 'text-emerald-700'], ['08', 'Needs attention', 'text-amber-700'], ['94%', 'On-time tasks', 'text-violet-700']].map(([value, label, color]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold sm:text-xl ${color}`}>{value}</p></div>)}</div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[1.45fr_1fr]"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#102947]">Project progress</p><span className="text-[10px] text-slate-400">View all</span></div>{[['Marina Tower', '82', 'bg-cyan-500'], ['Cedar Residences', '67', 'bg-blue-500'], ['District One Retail', '43', 'bg-violet-500']].map(([name, pct, color]) => <div key={name} className="mt-4"><div className="mb-1 flex justify-between text-[10px] font-medium text-slate-500"><span>{name}</span><span>{pct}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div></div>)}</div><div className="rounded-xl bg-[#0c2440] p-4"><p className="text-xs font-bold text-white">Today&apos;s focus</p>{['2 drawings waiting approval', 'Material delivery at 14:30', 'Site inspection: Tower 2'].map((item, i) => <div key={item} className="mt-3 flex gap-2 text-[10px] leading-4 text-slate-300"><span className={`mt-0.5 size-2 shrink-0 rounded-full ${i === 0 ? 'bg-amber-300' : 'bg-cyan-300'}`} />{item}</div>)}<div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-cyan-300">Open daily plan <ArrowRight className="size-3" /></div></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="results" className="border-y border-slate-200 bg-white px-5 py-7 sm:px-8"><div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-slate-200 md:grid-cols-4">{[['10×', 'faster approvals'], ['360°', 'project visibility'], ['100%', 'traceable decisions'], ['1 place', 'for site operations']].map(([number, label]) => <div key={label} className="px-4 text-center"><p className="text-xl font-bold tracking-tight text-[#0b2949] sm:text-2xl">{number}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p></div>)}</div></section>

        <section id="platform" className="px-5 py-24 sm:px-8 lg:py-32"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">The SKYLITE advantage</p><h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-[#0b2949] sm:text-4xl">Less chasing.<br />More building.</h2><p className="mt-5 max-w-md leading-7 text-slate-600">Give each person a clear next step and your leadership team a clear line of sight—without forcing your sites to change the way they work.</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0b5f86] hover:text-cyan-700">See what your team can do <ArrowRight className="size-4" /></Link></div><div className="grid gap-4 sm:grid-cols-2">{features.map((feature) => <article key={feature.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-slate-200/60"><div className={`grid size-10 place-items-center rounded-xl ${feature.tint}`}><feature.icon className="size-5" /></div><h3 className="mt-5 text-base font-bold tracking-tight text-[#0b2949]">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p></article>)}</div></div></div></section>

        <section className="border-y border-slate-200 bg-white px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">Designed around real project work</p><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0b2949] sm:text-4xl">Every team gets the clarity it needs.</h2><p className="mt-5 leading-7 text-slate-600">SKYLITE connects the daily work happening in the field to the decisions being made in the office—so everyone can move with more confidence.</p></div>
            <div className="mt-16 space-y-5">{operatingAreas.map((area, index) => <article key={area.eyebrow} className={`grid overflow-hidden rounded-3xl border border-slate-200 ${index % 2 === 0 ? 'lg:grid-cols-[1.1fr_.9fr]' : 'lg:grid-cols-[.9fr_1.1fr]'}`}>
              <div className={`p-8 sm:p-10 ${index % 2 === 0 ? 'order-1 bg-[#0b2949] text-white' : 'order-2 bg-[#eef8fb] text-[#0b2949]'}`}><p className={`text-xs font-bold uppercase tracking-[.18em] ${index % 2 === 0 ? 'text-cyan-300' : 'text-cyan-700'}`}>{area.eyebrow}</p><h3 className="mt-4 max-w-md text-2xl font-extrabold leading-tight tracking-tight">{area.title}</h3><p className={`mt-5 max-w-md leading-7 ${index % 2 === 0 ? 'text-slate-300' : 'text-slate-600'}`}>{area.description}</p></div>
              <div className={`order-2 flex items-center p-8 sm:p-10 ${index % 2 === 0 ? 'bg-[#f4f9fb]' : 'order-1 bg-[#0b2949]'}`}><div className="w-full space-y-4">{area.points.map((point, pointIndex) => <div key={point} className={`flex items-start gap-3 rounded-xl p-4 ${index % 2 === 0 ? 'bg-white shadow-sm' : 'border border-white/10 bg-white/5 text-white'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-[#0b2949] ${area.accent}`}>0{pointIndex + 1}</span><p className={`pt-0.5 text-sm font-semibold ${index % 2 === 0 ? 'text-[#173a57]' : 'text-slate-200'}`}>{point}</p></div>)}</div></div>
            </article>)}</div>
          </div>
        </section>

        <section id="workflow" className="bg-[#eaf5fa] px-5 py-24 sm:px-8 lg:py-32"><div className="mx-auto max-w-7xl"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">A clearer way to run work</p><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0b2949] sm:text-4xl">From setup to site-ready in three steps.</h2><p className="mt-5 leading-7 text-slate-600">A focused launch process means your team sees value from day one, then grows into the platform as each project needs more structure.</p></div><div className="mt-14 grid gap-5 lg:grid-cols-3">{steps.map(([number, title, text], index) => <article key={number} className="relative overflow-hidden rounded-2xl border border-[#cfe4ed] bg-white p-7"><span className="text-6xl font-bold tracking-tight text-cyan-100">{number}</span><div className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-[#0b2949] text-xs font-bold text-cyan-300">{index + 1}</div><h3 className="mt-8 text-xl font-bold tracking-tight text-[#0b2949]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

        <section className="bg-white px-5 py-24 sm:px-8 lg:py-32"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">Built for the way teams actually work</p><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0b2949] sm:text-4xl">A system people want to come back to.</h2><p className="mt-5 max-w-md leading-7 text-slate-600">Construction software only works when it works in the real world—across site meetings, approvals, changing priorities and handovers. That&apos;s what SKYLITE is made for.</p><div className="mt-7 flex items-center gap-3"><div className="flex -space-x-2">{['A', 'R', 'N', 'K'].map((initial, index) => <span key={initial} className={`grid size-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white ${['bg-cyan-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-500'][index]}`}>{initial}</span>)}</div><p className="text-xs font-semibold text-slate-500">Designed for project owners, site teams and partners.</p></div></div><blockquote className="relative rounded-3xl bg-[#0b2949] p-8 text-white sm:p-10"><MessageSquareQuote className="size-9 text-cyan-300" /><p className="mt-6 text-2xl font-bold leading-9 tracking-[-.03em] sm:text-3xl">“We stopped asking where things were and started making decisions from the same picture. The difference on site was immediate.”</p><footer className="mt-8 border-t border-white/10 pt-5"><p className="font-bold text-cyan-300">Project Director</p><p className="mt-1 text-sm text-slate-400">Multi-project construction team</p></footer></blockquote></div></section>

        <section className="px-5 py-24 sm:px-8 lg:py-32"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">Questions, answered</p><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0b2949] sm:text-4xl">Everything you need to know to get going.</h2><p className="mt-5 max-w-md leading-7 text-slate-600">Start small, bring your team in, and scale your workflows as your organisation grows.</p><Link href="/register" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0b5f86] hover:text-cyan-700">Create your free workspace <ArrowRight className="size-4" /></Link></div><div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">{faqs.map(([question, answer], index) => <div key={question}><button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left text-sm font-bold text-[#0b2949] sm:px-7"><span>{question}</span><Plus className={`size-4 shrink-0 text-cyan-700 transition-transform ${openFaq === index ? 'rotate-45' : ''}`} /></button>{openFaq === index && <p className="px-6 pb-6 text-sm leading-6 text-slate-600 sm:px-7">{answer}</p>}</div>)}</div></div></section>

        <section className="px-5 py-24 sm:px-8"><div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0b2949] px-7 py-14 text-center sm:px-12 sm:py-20"><div className="absolute -right-20 -top-28 size-80 rounded-full bg-cyan-400/15 blur-3xl" /><div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-blue-500/20 blur-3xl" /><div className="relative"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-cyan-300 text-[#0b2949]"><HardHat className="size-6" /></div><h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Build a calmer, more predictable project operation.</h2><p className="mx-auto mt-5 max-w-xl text-slate-300">Start with the work your team is doing today. SKYLITE gives it structure, visibility and momentum.</p><Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-bold text-[#08203b] transition hover:-translate-y-0.5 hover:bg-cyan-200">Get started free <ArrowRight className="size-4" /></Link></div></div></section>
      </main>

      <footer className="bg-[#07172b] px-5 pt-16 text-slate-300 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
            <div className="max-w-xs">
              <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white" aria-label="SKYLITE home"><span className="grid size-8 place-items-center rounded-lg bg-cyan-300 text-sm text-[#08203b] font-extrabold">S</span> SKY<span className="text-cyan-300">LITE</span></Link>
              <p className="mt-5 text-sm leading-6 text-slate-400">A clearer operating system for construction teams that want every project, person and decision moving in the same direction.</p>
              <Link href="/register" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200">Start your free workspace <ArrowRight className="size-4" /></Link>
            </div>
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Platform</p><ul className="mt-5 space-y-3 text-sm"><li><a href="#platform" className="transition hover:text-white">Project overview</a></li><li><a href="#platform" className="transition hover:text-white">Budget and BOQ</a></li><li><a href="#platform" className="transition hover:text-white">Quality workflows</a></li><li><a href="#platform" className="transition hover:text-white">Documents and approvals</a></li></ul></div>
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Explore</p><ul className="mt-5 space-y-3 text-sm"><li><a href="#workflow" className="transition hover:text-white">How it works</a></li><li><a href="#results" className="transition hover:text-white">Why SKYLITE</a></li><li><a href="#platform" className="transition hover:text-white">For project teams</a></li><li><a href="#workflow" className="transition hover:text-white">Getting started</a></li></ul></div>
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Account</p><ul className="mt-5 space-y-3 text-sm"><li><Link href="/register" className="transition hover:text-white">Create account</Link></li><li><Link href="/login" className="transition hover:text-white">Sign in</Link></li><li><Link href="/reset-password" className="transition hover:text-white">Reset password</Link></li></ul></div>
          </div>
          <div className="flex flex-col gap-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Copyright {new Date().getFullYear()} SKYLITE. Built for teams that build.</p><div className="flex gap-5"><a href="#platform" className="transition hover:text-slate-300">Privacy</a><a href="#platform" className="transition hover:text-slate-300">Terms</a><span className="inline-flex items-center gap-1.5 text-slate-400"><span className="size-1.5 rounded-full bg-emerald-400" /> All systems operational</span></div></div>
        </div>
      </footer>
    </div>
  );
}
