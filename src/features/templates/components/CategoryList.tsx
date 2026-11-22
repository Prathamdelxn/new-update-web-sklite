'use client';
import { tr } from '@/i18n';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  FolderTree,
  Search,
  CheckCircle2,
  FolderOpen,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useAuth } from '@/providers/AuthContext';
import { hasAnyRolePermission } from '@/lib/permissions';

export const CategoryList = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const toast = useToast();
  const { confirm } = useConfirm();
  // Category Management is org-wide: the global role or any project role counts
  const { user } = useAuth();
  const canCreate = hasAnyRolePermission(user, 'category:create');
  const canUpdate = hasAnyRolePermission(user, 'category:update');
  const canDelete = hasAnyRolePermission(user, 'category:delete');
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/template-categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error(tr("Failed to load template categories"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      await api.post('/template-categories', { name });
      setNewName('');
      setShowCreate(false);
      setLastAdded(name);
      setTimeout(() => setLastAdded(null), 3000);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Failed to create category"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    setIsUpdating(true);
    try {
      await api.patch(`/template-categories/${id}`, { name: editingName.trim() });
      toast.success(tr("Category updated"));
      setEditingId(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Failed to update"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: tr("Delete Category"),
      message: tr("Are you sure? This will delete all templates associated with this category."),
      confirmText: tr("Delete Category"),
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/template-categories/${id}`);
      toast.success(tr("Category deleted"));
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Failed to delete category"));
    }
  };

  const startEditing = (cat: any) => {
    setEditingId(cat._id);
    setEditingName(cat.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const filtered = useMemo(() => {
    return categories.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  const newNameTrimmed = newName.trim();
  const alreadyExists = categories.some(
    (c) => c.name.toLowerCase() === newNameTrimmed.toLowerCase()
  );

  return (
    <SkeletonLoader loading={loading} preset={viewMode === 'table' ? 'list' : 'card-grid'}>
      <div className="space-y-3.5">
        {/* ── Toolbar: Search & Action ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr("Search categories by name...")}
                className="w-full ps-9 pe-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls: View Switcher & Action */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
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
                  title={tr("Grid view")}
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
                  title={tr("Table view")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {canCreate && (
                <button
                  onClick={() => { setShowCreate(true); setNewName(''); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{tr("New Category")}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Inline Create Form ── */}
        {showCreate && (
          <div className="bg-white border border-blue-300 rounded-xl p-3.5 shadow-2xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && newNameTrimmed && !alreadyExists) handleCreate(); 
                    if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
                  }}
                  placeholder={tr("Enter category name (e.g. Residential Villa, Commercial Fit-Out)...")}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {newNameTrimmed && alreadyExists && (
                  <p className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {tr("Category already exists")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !newNameTrimmed || alreadyExists}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>{tr("Save")}</span>
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Success Toast Notification Strip ── */}
        {lastAdded && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold w-fit animate-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>{tr("Category ")}<strong className="text-emerald-800">"{tr(lastAdded)}"</strong>{tr(" added successfully")}</span>
          </div>
        )}

        {/* ── Content: Grid or Table View ── */}
        {filtered.length > 0 ? (
          viewMode === 'grid' ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filtered.map((cat) => (
                <div 
                  key={cat._id} 
                  className="group relative bg-white rounded-xl border border-slate-300 hover:border-blue-400 hover:shadow-sm transition-all duration-200 p-3.5 shadow-2xs overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Accent Stripe on hover */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 start-0" />

                  <div>
                    {/* Header Row: Icon + Name + Actions */}
                    <div className="flex items-center gap-2.5">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                      </div>
                      
                      {/* Category Name */}
                      {editingId === cat._id ? (
                        <input
                          autoFocus
                          className="flex-1 bg-white border border-blue-400 rounded-lg py-1 px-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(cat._id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                            {tr(cat.name)}
                          </h4>
                          <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                            {tr("Template Classification")}
                          </p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {editingId === cat._id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(cat._id)}
                              disabled={isUpdating}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                            >
                              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {canUpdate && (
                              <button
                                onClick={() => startEditing(cat)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title={tr("Edit Category")}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(cat._id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title={tr("Delete Category")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Meta Row */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200/60">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {cat.templateCount || 0}{tr(" Templates")}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {tr("Category")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Table View ── */
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">{tr("Category")}</th>
                      <th className="py-3 px-4">{tr("Templates Linked")}</th>
                      <th className="py-3 px-4">{tr("Classification")}</th>
                      <th className="py-3 px-4 text-end">{tr("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filtered.map((cat) => (
                      <tr key={cat._id} className="hover:bg-blue-50/30 transition-colors group">
                        {/* Name Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
                              <FolderOpen className="w-4 h-4 text-blue-600" />
                            </div>
                            {editingId === cat._id ? (
                              <input
                                autoFocus
                                className="flex-1 max-w-xs bg-white border border-blue-400 rounded-lg py-1 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdate(cat._id);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                            ) : (
                              <div>
                                <h5 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {tr(cat.name)}
                                </h5>
                                <p className="text-[10px] font-medium text-slate-400">
                                  {tr("Category ID: ")}{cat._id?.slice(-6) || '—'}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Count Column */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200/60">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {cat.templateCount || 0}{tr(" Templates")}
                          </span>
                        </td>

                        {/* Classification Column */}
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-semibold text-slate-600">
                            {tr("Project Template Specification")}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === cat._id ? (
                              <>
                                <button
                                  onClick={() => handleUpdate(cat._id)}
                                  disabled={isUpdating}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                  title={tr("Save")}
                                >
                                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title={tr("Cancel")}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                {canUpdate && (
                                  <button
                                    onClick={() => startEditing(cat)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title={tr("Edit Category")}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(cat._id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title={tr("Delete Category")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* ── Empty State ── */
          <div className="col-span-full py-16 px-6 bg-white rounded-xl border border-slate-300 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <FolderTree className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {search ? tr("No categories found") : tr("No categories created yet")}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {search 
                ? tr("No categories match \"{{search}}\". Try searching for another keyword.", { search: search }) 
                : tr("Organize your templates by creating your first template category.")}
            </p>
            
          </div>
        )}
      </div>
    </SkeletonLoader>
  );
};
