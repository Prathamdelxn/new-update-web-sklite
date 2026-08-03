'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

import {
  FolderKanban,
  UserCheck,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Box,
  Palette,
  Layers,
  Users,
  Settings,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  Building,
  ChevronRight
} from 'lucide-react';

// Lazy Load Heavy Recharts Analytics Component for Performance Optimization
const DashboardCharts = dynamic(() => import('./DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-white border border-slate-200/80 rounded-3xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold shadow-2xs">
      Loading graphical analytics...
    </div>
  )
});

export const InteriorDashboardView = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.projects || res.data?.data || [];
        setProjects(data);
      })
      .catch((err) => console.error('Failed to fetch dashboard projects:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
            <span>Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-bold">Dashboard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Designer'}!
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Overview of active interior fit-out projects, client consultations, and financial performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600" />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <Link
            href="/interior/projects"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Active Fit-out Projects</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{projects.length || 4} <span className="text-xs font-normal text-slate-400">ongoing</span></p>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <FolderKanban className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Monthly Revenue</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">$195,000 <span className="text-xs font-normal text-emerald-600 font-bold">+18%</span></p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">FF&E Orders Processing</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">14 <span className="text-xs font-normal text-slate-400">items</span></p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Box className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Pending Sign-offs</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">2 <span className="text-xs font-normal text-amber-600 font-bold">action req.</span></p>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <FileCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* DYNAMIC LAZY LOADED GRAPHICAL CHARTS SECTION */}
      <DashboardCharts />

      {/* Main Grid 2: Recent Fit-out Projects & Workspace Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Recent Interior Projects */}
        <div className="lg:col-span-8 space-y-4">
          <GlassCard className="p-5 bg-white border border-slate-200/80 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Fit-out Projects</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Active projects currently in planning or execution.</p>
              </div>
              <Link
                href="/interior/projects"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {(projects.length > 0 ? projects.slice(0, 3) : [
                { _id: '1', name: 'Penthouse Apartment 4B', clientName: 'Vikram Mehta', status: 'Ongoing', description: 'Luxury living room & master bedroom fit-out' },
                { _id: '2', name: 'Apex Executive Suite', clientName: 'Apex Capital', status: 'Planning', description: 'Commercial office reception & conference layout' },
                { _id: '3', name: 'Heritage Villa Renovation', clientName: 'Sophie Turner', status: 'Ongoing', description: 'Kitchen, dining, and custom veneer millwork' },
              ]).map((project) => (
                <div key={project._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{project.name}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{project.clientName} • {project.description || 'Interior Fit-out'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold">
                      {project.status || 'Ongoing'}
                    </span>
                    <Link
                      href={`/interior/projects/${project._id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Open Project"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right 4 Cols: Quick Workspace Shortcuts */}
        <div className="lg:col-span-4 space-y-4">
          <GlassCard className="p-5 bg-white border border-slate-200/80 rounded-3xl space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Workspace Modules</h3>
            
            <div className="space-y-2">
              {[
                { label: 'Interior Projects', href: '/interior/projects', desc: 'Active fit-outs & timelines', icon: FolderKanban, color: 'text-blue-600 bg-blue-50' },
                { label: 'Client CRM', href: '/interior/crm', desc: 'Leads & consultation schedules', icon: UserCheck, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'User Management', href: '/interior/users', desc: 'Studio team & roles', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Workspace Settings', href: '/interior/settings', desc: 'Company preferences & currency', icon: Settings, color: 'text-slate-600 bg-slate-100' },
              ].map((mod) => (
                <Link
                  key={mod.label}
                  href={mod.href}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105", mod.color)}>
                      <mod.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">{mod.label}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{mod.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </Link>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
