'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Search, MoreVertical, ChevronRight,
  Layers, Eye, Pencil, Trash2, 
  Image as ImageIcon, FileText, 
  Ruler, DollarSign, Clock, Tag,
  FolderOpen, Filter, ChevronDown, Check, X,
  LayoutGrid, List
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useAuth } from '@/providers/AuthContext';
import { hasAnyRolePermission } from '@/lib/permissions';
import { TemplateModal } from '@/features/templates/components/TemplateModal';
import { TemplateDetailModal } from '@/features/templates/components/TemplateDetailModal';
import { Pagination, usePagination } from '@/components/shared/Pagination';

export const TemplateList = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'budget' | 'days'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
  const [templateMenuId, setTemplateMenuId] = useState<string | null>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const toast = useToast();
  const { confirm } = useConfirm();
  // Template Management is org-wide: the global role or any project role counts
  const { user } = useAuth();
  const canCreate = hasAnyRolePermission(user, 'template:create');
  const canUpdate = hasAnyRolePermission(user, 'template:update');
  const canDelete = hasAnyRolePermission(user, 'template:delete');

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(Array.isArray(response.data) ? response.data : response.data?.templates ?? []);
    } catch {
      toast.error('Failed to load project templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setTemplateMenuId(null);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute category counts for filter dropdown
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: templates.length };
    templates.forEach((t) => {
      const catName = t.category?.name || (typeof t.category === 'string' ? t.category : null) || 'General';
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return counts;
  }, [templates]);

  const categoryOptions = useMemo(() => {
    return Object.keys(categoryCounts).sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));
  }, [categoryCounts]);

  // Filter and sort templates
  const processedTemplates = useMemo(() => {
    let result = templates.filter((t) => {
      const matchesSearch =
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category?.name && t.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const catName = t.category?.name || (typeof t.category === 'string' ? t.category : null) || 'General';
      const matchesCategory = categoryFilter === 'All' || catName === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'budget') return (b.maxBudget || b.minBudget || 0) - (a.maxBudget || a.minBudget || 0);
      if (sortBy === 'days') return (a.estimatedDays || 9999) - (b.estimatedDays || 9999);
      // default newest first
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return result;
  }, [templates, searchQuery, categoryFilter, sortBy]);

  const { currentPage, totalPages, paginated: pagedTemplates, setCurrentPage } = usePagination(processedTemplates, 9);

  const handleDelete = async (e: React.MouseEvent, templateId: string, name: string) => {
    e.stopPropagation();
    setTemplateMenuId(null);
    const ok = await confirm({
      title: 'Delete Template',
      message: `Delete template "${name}"? This cannot be undone.`,
      confirmText: 'Delete Template',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/templates/${templateId}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const openEdit = (template: any) => {
    setTemplateMenuId(null);
    setEditingTemplate(template);
  };

  return (
    <SkeletonLoader loading={loading} preset={viewMode === 'table' ? 'list' : 'card-grid'}>
      <div className="space-y-3.5">
        {/* ── Toolbar: Search, Filters, Sort & Action ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates, categories or scopes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls: Filter Button, Sort & Create Action */}
            <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
              {/* Category Filter Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                    categoryFilter !== 'All'
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                  )}
                >
                  <Filter className={cn("w-3.5 h-3.5", categoryFilter !== 'All' ? "text-blue-600" : "text-slate-500")} />
                  <span>{categoryFilter === 'All' ? 'Filter Category' : categoryFilter}</span>
                  {categoryFilter !== 'All' && categoryCounts[categoryFilter] !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-200/80 text-blue-800 tabular-nums">
                      {categoryCounts[categoryFilter]}
                    </span>
                  )}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-slate-400", isFilterOpen && "rotate-180")} />
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 sm:right-auto sm:left-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-30 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Filter by Category
                      </span>
                      {categoryFilter !== 'All' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('All');
                            setIsFilterOpen(false);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {categoryOptions.map((cat) => {
                      const isSelected = categoryFilter === cat;
                      const count = categoryCounts[cat] ?? 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(cat);
                            setIsFilterOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer",
                            isSelected
                              ? "bg-blue-50/80 text-blue-700 font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={cn("w-3.5 h-3.5 flex items-center justify-center shrink-0", isSelected ? "text-blue-600" : "opacity-0")}>
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{cat}</span>
                          </div>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[10px] tabular-nums shrink-0 ml-2",
                            isSelected ? "bg-blue-200/70 text-blue-800 font-bold" : "bg-slate-100 text-slate-500 font-semibold"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="name">Sort: Template Name</option>
                <option value="budget">Sort: Budget (High-Low)</option>
                <option value="days">Sort: Duration (Shortest)</option>
              </select>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    viewMode === 'grid'
                      ? "bg-white text-blue-600 border border-slate-300 shadow-2xs"
                      : "text-slate-400 hover:text-slate-700"
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    viewMode === 'table'
                      ? "bg-white text-blue-600 border border-slate-300 shadow-2xs"
                      : "text-slate-400 hover:text-slate-700"
                  )}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Create Template Button */}
              {canCreate && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Template</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Content: Grid or Table View ── */}
        {processedTemplates.length > 0 ? (
          viewMode === 'grid' ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagedTemplates.map((template) => {
                const coverImage = template.images?.[0];
                
                // Format budget range
                const minBudget = template.minBudget ? formatCurrency(template.minBudget) : null;
                const maxBudget = template.maxBudget ? formatCurrency(template.maxBudget) : null;
                const budgetDisplay = minBudget && maxBudget 
                  ? `${minBudget} - ${maxBudget}`
                  : minBudget || maxBudget || null;
                
                const hasDescription = !!template.description && template.description.trim().length > 2;

                return (
                  <div
                    key={template._id}
                    className="group relative bg-white rounded-xl border border-slate-300 hover:border-blue-400 hover:shadow-sm transition-all duration-200 flex flex-col h-full overflow-hidden shadow-2xs cursor-pointer"
                    onClick={() => setViewTemplateId(template._id)}
                  >
                    {/* Top Accent Stripe on hover */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Cover Banner */}
                    <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 shrink-0">
                      {coverImage ? (
                        <img loading="lazy" decoding="async"
                          src={coverImage}
                          alt={template.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-blue-300">
                          <Layers className="w-9 h-9 stroke-[1.5]" />
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Template Spec</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />

                      {/* Category badge */}
                      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/95 backdrop-blur-xs text-blue-700 text-[10.5px] font-bold rounded-md border border-slate-200/80 shadow-2xs">
                        <FolderOpen className="w-3 h-3 text-blue-600" />
                        {template.category?.name || 'General'}
                      </span>

                      {/* Menu Button */}
                      <div
                        className="absolute top-2.5 right-2.5 z-10"
                        ref={templateMenuId === template._id ? templateMenuRef : null}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateMenuId(templateMenuId === template._id ? null : template._id);
                          }}
                          className="p-1.5 bg-white/95 backdrop-blur-xs hover:bg-white text-slate-700 rounded-lg border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        {templateMenuId === template._id && (
                          <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-slate-200 shadow-lg z-50 py-1.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={(e) => { e.stopPropagation(); setTemplateMenuId(null); setViewTemplateId(template._id); }}
                              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              View Details
                            </button>
                            {canUpdate && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openEdit(template); }}
                                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                Edit Template
                              </button>
                            )}
                            {canDelete && (
                              <>
                                <div className="border-t border-slate-100 my-1 mx-2" />
                                <button
                                  onClick={(e) => handleDelete(e, template._id, template.name)}
                                  className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Title over banner overlay */}
                      <h4 className="absolute bottom-2.5 left-3 right-3 text-[14px] capitalize font-bold text-white line-clamp-1 tracking-tight drop-shadow-sm">
                        {template.name}
                      </h4>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 flex flex-col flex-1">
                      {/* Stat pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {budgetDisplay && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200/80">
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                            {budgetDisplay}
                          </span>
                        )}
                        {template.area && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200/80">
                            <Ruler className="w-3 h-3 text-amber-600" />
                            {template.area.toLocaleString()} ft²
                          </span>
                        )}
                        {template.estimatedDays && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200/80">
                            <Clock className="w-3 h-3 text-blue-600" />
                            {template.estimatedDays}d
                          </span>
                        )}
                        {template.projectType && !template.area && !template.estimatedDays && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200/80 capitalize">
                            <Tag className="w-3 h-3 text-slate-500" />
                            {template.projectType}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {hasDescription && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-2 font-normal">
                          {template.description}
                        </p>
                      )}

                      <div className="flex-1 min-h-[8px]" />

                      {/* Footer */}
                      <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2.5">
                          {template.images?.length > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-slate-500 text-[11px]">
                              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                              {template.images.length}
                            </span>
                          )}
                          {template.files?.length > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-slate-500 text-[11px]">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              {template.files.length}
                            </span>
                          )}
                          {template.views && (
                            <span className="flex items-center gap-1 font-semibold text-slate-500 text-[11px]">
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              {template.views}
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewTemplateId(template._id); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 text-xs font-bold transition-all group/btn cursor-pointer"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Table View ── */
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Template</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Budget Range</th>
                      <th className="py-3 px-4">Specifications</th>
                      <th className="py-3 px-4">Files / Media</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pagedTemplates.map((template) => {
                      const minBudget = template.minBudget ? formatCurrency(template.minBudget) : null;
                      const maxBudget = template.maxBudget ? formatCurrency(template.maxBudget) : null;
                      const budgetDisplay = minBudget && maxBudget ? `${minBudget} - ${maxBudget}` : minBudget || maxBudget || '—';
                      return (
                        <tr
                          key={template._id}
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={() => setViewTemplateId(template._id)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-150 overflow-hidden flex items-center justify-center shrink-0">
                                {template.images?.[0] ? (
                                  <img loading="lazy" decoding="async" src={template.images[0]} alt={template.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Layers className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div className="min-w-0 max-w-xs">
                                <h5 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {template.name}
                                </h5>
                                <p className="text-[10px] font-semibold text-slate-400 truncate">
                                  {template.description || 'Standard Template'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-blue-700 px-2 py-0.5 rounded text-[10.5px] font-bold border border-slate-200/80">
                              <FolderOpen className="w-3 h-3 text-blue-600" />
                              {template.category?.name || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {minBudget || maxBudget ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200/80">
                                <DollarSign className="w-3 h-3 text-emerald-600" />
                                {budgetDisplay}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {template.area && (
                                <span className="text-[11px] font-bold text-slate-700">
                                  {template.area.toLocaleString()} ft²
                                </span>
                              )}
                              {template.estimatedDays && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                  {template.estimatedDays}d
                                </span>
                              )}
                              {!template.area && !template.estimatedDays && (
                                <span className="text-slate-400 font-medium">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                              {template.images?.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
                                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                  {template.images.length}
                                </span>
                              )}
                              {template.files?.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  {template.files.length}
                                </span>
                              )}
                              {!template.images?.length && !template.files?.length && (
                                <span className="text-slate-400 font-medium">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewTemplateId(template._id)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canUpdate && (
                                <button
                                  onClick={() => openEdit(template)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Template"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => handleDelete(e, template._id, template.name)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* ── Empty State ── */
          <div className="col-span-full py-16 px-6 bg-white rounded-xl border border-slate-300 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <Layers className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery || categoryFilter !== 'All' ? 'No matching templates found' : 'No templates created yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery || categoryFilter !== 'All'
                ? 'Try modifying your search keywords or resetting category filters.'
                : 'Start standardizing your projects by creating your first reusable template.'}
            </p>
            
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

        {/* Modals */}
        <TemplateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={fetchTemplates}
        />

        <TemplateModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => { fetchTemplates(); setEditingTemplate(null); }}
          initialData={editingTemplate}
          templateId={editingTemplate?._id}
        />

        <TemplateDetailModal
          isOpen={!!viewTemplateId}
          onClose={() => setViewTemplateId(null)}
          templateId={viewTemplateId}
          onEdit={canUpdate ? (t) => { setViewTemplateId(null); setEditingTemplate(t); } : undefined}
        />
      </div>
    </SkeletonLoader>
  );
};
