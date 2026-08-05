'use client';

// =============================================================================
// Sky-Lite Web — Interior-New Projects List
// Port of interior-os-frontend's (dashboard)/projects/page.tsx, backed by the
// interior-os backend via interiorApiClient instead of TanStack Query.
// =============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  Users,
  MoreHorizontal,
  ArrowUpRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { cn } from '@/lib/utils';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';

const healthConfig = {
  'on-track': { label: 'On Track', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  'at-risk': { label: 'At Risk', color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
  delayed: { label: 'Delayed', color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
};

const emptyFormData = {
  name: '',
  client: '',
  type: 'General',
  startDate: '',
  endDate: '',
  budgetAmount: '',
  description: '',
  city: '',
  address: '',
  templateId: '',
};

export default function InteriorNewProjectsView() {
  const toast = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);

  const loadProjects = useCallback(async () => {
    try {
      const res = await interiorApiClient.get('/projects');
      setProjects(res.data?.success && res.data?.data ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load interior-os projects', err);
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadProjects(),
      interiorApiClient
        .get('/templates')
        .then((res) => setTemplates(res.data?.success && res.data?.data?.templates ? res.data.data.templates : []))
        .catch(() => setTemplates([])),
    ]).finally(() => setLoading(false));
  }, [loadProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const payload = {
        name: formData.name,
        client: formData.client,
        type: formData.type,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date().toISOString().split('T')[0],
        budget: { amount: parseFloat(formData.budgetAmount) || 0, currency: 'INR' },
        location: { city: formData.city, address: formData.address },
        description: formData.description,
        templateId: formData.templateId || undefined,
      };

      await interiorApiClient.post('/projects', payload);
      toast.success('Project created successfully!');
      setIsDialogOpen(false);
      setFormData(emptyFormData);
      await loadProjects();
    } catch (err) {
      console.error('Failed to create project', err);
      toast.error('Failed to create project');
    } finally {
      setCreateLoading(false);
    }
  };

  const formatBudget = (amount: number) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
    return `₹ ${(amount / 100000).toFixed(2)} Lakh`;
  };

  const filteredProjects = projects.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const openProject = (project: any) => {
    const id = project.id || project._id;
    if (!id) {
      toast.error('This project has no id and cannot be opened.');
      return;
    }
    router.push(`/interior-new/projects/${id}`);
  };

  if (loading) {
    return (
      <div className="interior-os-theme flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="interior-os-theme p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Projects</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Manage and monitor all your active projects</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Search projects..." icon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </Button>
          <div className="flex items-center rounded-lg border border-[hsl(var(--border))] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4">
          <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Projects Found</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Create your first fit-out project to get started.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((project: any, i: number) => {
            const healthType = project.health || 'on-track';
            const health = healthConfig[healthType as keyof typeof healthConfig] || healthConfig['on-track'];
            return (
              <motion.div key={project.id || project._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => openProject(project)}>
                <Card className="group hover:shadow-lg hover:border-[hsl(var(--primary)/0.3)] transition-all duration-300 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{project.code}</span>
                          <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full', health.bgColor, health.textColor)}>{health.label}</span>
                        </div>
                        <h3 className="text-base font-semibold text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">{project.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{project.client}</p>
                      </div>
                      <button className="p-1 rounded-md hover:bg-[hsl(var(--muted))] transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Progress</span>
                        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">{project.progress || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-full', health.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress || 0}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {project.location?.city || 'Unknown Location'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        {project.teamSize || 1} members
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-[hsl(var(--foreground))]">{formatBudget(project.budget?.amount)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-[hsl(var(--muted-foreground))]">{project.openSnags || 0} snags</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span className="text-[hsl(var(--muted-foreground))]">{project.openRFIs || 0} RFIs</span>
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]">Budget</th>
                  <th className="text-left py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]">Team</th>
                  <th className="text-right py-3 px-4 font-medium text-[hsl(var(--muted-foreground))]" />
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project: any) => {
                  const healthType = project.health || 'on-track';
                  const health = healthConfig[healthType as keyof typeof healthConfig] || healthConfig['on-track'];
                  return (
                    <tr key={project.id || project._id} className="border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer" onClick={() => openProject(project)}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[hsl(var(--foreground))]">{project.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{project.code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{project.client}</td>
                      <td className="py-3 px-4">
                        <span className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full', health.bgColor, health.textColor)}>{health.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', health.color)} style={{ width: `${project.progress || 0}%` }} />
                          </div>
                          <span className="text-xs font-medium">{project.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{formatBudget(project.budget?.amount)}</td>
                      <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {project.teamSize || 1}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="p-1 rounded-md hover:bg-[hsl(var(--muted))]">
                          <MoreHorizontal className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          {projects.filter((p: any) => p.health === 'on-track' || !p.health).length} on track
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          {projects.filter((p: any) => p.health === 'at-risk').length} at risk
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-red-500" />
          {projects.filter((p: any) => p.health === 'delayed').length} delayed
        </span>
      </div>

      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg overflow-hidden border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Create New Project</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Define your project parameters</p>
                </div>
                <button onClick={() => setIsDialogOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject}>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Project Name</label>
                      <Input required placeholder="e.g. DLF Cyber Park Tower C" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Client Name</label>
                      <Input required placeholder="e.g. DLF Limited" value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Project Type</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Commercial Office">Commercial Office</option>
                        <option value="Residential">Residential</option>
                        <option value="Tech Office">Tech Office</option>
                        <option value="Co-working Space">Co-working Space</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Interior Template (Optional)</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        value={formData.templateId}
                        onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                      >
                        <option value="">No Template (Create Empty Project)</option>
                        {templates.map((t: any) => (
                          <option key={t._id} value={t._id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Start Date</label>
                      <Input required type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">End Date</label>
                      <Input required type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Budget (INR)</label>
                      <Input required type="number" placeholder="e.g. 15000000" value={formData.budgetAmount} onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">City</label>
                      <Input placeholder="e.g. Gurugram" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Site Address</label>
                    <Input placeholder="e.g. Phase 3, Sector 24" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Project Description</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      placeholder="Specify fit-out details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading}>
                    {createLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create Project
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
