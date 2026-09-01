'use client';

// =============================================================================
// Sky-Lite Web — Interior-New Executive Dashboard
// Close port of interior-os-frontend's (dashboard)/dashboard/page.tsx, backed
// by the interior-os backend via interiorApiClient instead of Zustand/TanStack
// Query (sky-lite-web doesn't carry those deps).
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  AlertTriangle,
  Bug,
  MessageSquare,
  Clock,
  ShoppingCart,
  Loader2,
  Database,
  RefreshCw,
  BarChart3,
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
import interiorApiClient from '@/services/interiorApi.client';
import { getInteriorUser } from '@/lib/interiorAuth';

interface DashboardData {
  kpis: {
    activeProjects: number;
    delayedProjects: number;
    totalLeads: number;
    newLeads: number;
    activeLeads: number;
    wonLeads: number;
    openSnags: number;
    openRFIs: number;
    criticalRisks: number;
    procurementPending: number;
  };
  leadsPipeline?: Array<{ stage: string; count: number }>;
  progressTrend: Array<{ month: string; planned: number; actual: number }>;
  projectHealth: Array<{ name: string; value: number; color: string }>;
  procurementData: Array<{ status: string; count: number }>;
  topProjects: Array<{ id: string; name: string; progress: number; health: 'green' | 'yellow' | 'red' }>;
  recentActivities: Array<{ action: string; project: string; time: string; type: string }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function InteriorNewDashboardView() {
  const toast = useToast();
  const user = getInteriorUser();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await interiorApiClient.get('/dashboard');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to load interior-os dashboard', err);
      setData(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await interiorApiClient.post('/dashboard/seed');
      if (res.data?.success) {
        toast.success('Demo portfolio seeded successfully!');
        await loadDashboard();
      } else {
        toast.error('Failed to seed demo portfolio');
      }
    } catch (err) {
      console.error('Seeding failed', err);
      toast.error('Seeding API request failed');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="interior-os-theme flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  const isEmpty = !data || (data.kpis.activeProjects === 0 && (data.kpis.totalLeads || 0) === 0);

  const kpiCards = [
    { title: 'Total Leads', value: data?.kpis.totalLeads || 0, icon: Users, color: 'hsl(217.2, 91.2%, 59.8%)', bgColor: 'hsl(217.2, 91.2%, 59.8% / 0.1)' },
    { title: 'New Leads', value: data?.kpis.newLeads || 0, icon: UserCheck, color: 'hsl(271.5, 81.3%, 55.9%)', bgColor: 'hsl(271.5, 81.3%, 55.9% / 0.1)' },
    { title: 'Active Pipeline', value: data?.kpis.activeLeads || 0, icon: TrendingUp, color: 'hsl(38, 92%, 50%)', bgColor: 'hsl(38, 92%, 50% / 0.1)' },
    { title: 'Won Projects', value: data?.kpis.wonLeads || 0, icon: CheckCircle2, color: 'hsl(142.1, 76.2%, 36.3%)', bgColor: 'hsl(142.1, 76.2%, 36.3% / 0.1)' },
    { title: 'Active Projects', value: data?.kpis.activeProjects || 0, icon: FolderKanban, color: 'hsl(var(--chart-1))', bgColor: 'hsl(var(--chart-1) / 0.1)' },
    { title: 'Open Snags', value: data?.kpis.openSnags || 0, icon: Bug, color: 'hsl(var(--destructive))', bgColor: 'hsl(var(--destructive) / 0.1)' },
  ];

  return (
    <div className="interior-os-theme p-6 lg:p-8 space-y-8 gradient-mesh min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Good {getGreeting()}, {user?.firstName || 'there'}
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Here&apos;s the live status of your organizational fit-out portfolio today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Refresh
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-12 text-center space-y-6 shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] text-2xl font-bold">
              🏢
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Active Projects</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
                Your workspace is empty. Click below to generate a complete portfolio of projects with WBS trees, tasks, snags, RFIs, and procurement records!
              </p>
            </div>
            <Button onClick={handleSeedData} disabled={seeding} size="lg">
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating Demo Data...
                </>
              ) : (
                'Seed Demo Portfolio Data'
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {kpiCards.map((kpi) => (
                <motion.div key={kpi.title} variants={itemVariants}>
                  <Card className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.bgColor }}>
                          <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{kpi.value}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{kpi.title}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold">Progress Trend</CardTitle>
                    <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]" />
                        Planned
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]" />
                        Actual
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.progressTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <defs>
                            <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Area type="monotone" dataKey="planned" stroke="hsl(221.2, 83.2%, 53.3%)" fill="url(#plannedGradient)" strokeWidth={2} />
                          <Area type="monotone" dataKey="actual" stroke="hsl(142.1, 76.2%, 36.3%)" fill="url(#actualGradient)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Project Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data?.projectHealth} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                            {data?.projectHealth.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {data?.projectHealth.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[hsl(var(--muted-foreground))]">{item.name}</span>
                          </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      CRM Lead Pipeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.leadsPipeline || []} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="stage" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(217.2, 91.2%, 59.8%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      Procurement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.procurementData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="status" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Top Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data?.topProjects.map((project) => (
                        <div key={project.id}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate max-w-[180px]">{project.name}</p>
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{project.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${project.progress}%`,
                                backgroundColor:
                                  project.health === 'green' ? 'hsl(142.1, 76.2%, 36.3%)' : project.health === 'yellow' ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84.2%, 60.2%)',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data?.recentActivities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              activity.type === 'success'
                                ? 'bg-[hsl(var(--success))]'
                                : activity.type === 'warning'
                                ? 'bg-[hsl(var(--warning))]'
                                : activity.type === 'error'
                                ? 'bg-[hsl(var(--destructive))]'
                                : 'bg-[hsl(var(--chart-1))]'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-[hsl(var(--foreground))] truncate" title={activity.action}>{activity.action}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                              {activity.project} · {activity.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
