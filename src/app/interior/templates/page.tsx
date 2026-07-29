'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

import {
  Layers,
  Plus,
  Search,
  Filter,
  Copy,
  Edit3,
  Trash2,
  CheckCircle2,
  FolderOpen,
  X,
  Send,
  Home,
  Palette,
  Box,
  Building,
  Sparkles,
  ArrowRight,
  FolderPlus,
  Check,
  Edit2
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  roomCount: number;
  boqItemsCount: number;
  badgeColor: string;
  lastUpdated: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templateCount: number;
}

const INITIAL_TEMPLATES: Template[] = [
  {
    id: '1',
    title: '3BHK Luxury Residential Blueprint',
    category: 'Residential',
    description: 'Complete master suite, living room, modular kitchen, and dining layout specification with pre-filled BOQ items.',
    roomCount: 6,
    boqItemsCount: 42,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    lastUpdated: 'Jul 25, 2026'
  },
  {
    id: '2',
    title: 'Executive Corporate Office Fit-out',
    category: 'Commercial',
    description: 'Reception desk joinery, glass partition specs, boardrooms, workstation power grids, and acoustic wall panels.',
    roomCount: 8,
    boqItemsCount: 65,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    lastUpdated: 'Jul 20, 2026'
  },
  {
    id: '3',
    title: 'FF&E Furniture & Lighting Schedule',
    category: 'Procurement',
    description: 'Standardized procurement checklist for custom sofas, accent chairs, chandeliers, and veneered cabinetry.',
    roomCount: 4,
    boqItemsCount: 28,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lastUpdated: 'Jul 18, 2026'
  },
  {
    id: '4',
    title: 'Material & Swatch Approval Form',
    category: 'Material Sign-offs',
    description: 'Client sign-off document template for wood veneers, Italian marble, fabric swatches, and Asian Paints codes.',
    roomCount: 5,
    boqItemsCount: 18,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    lastUpdated: 'Jul 15, 2026'
  }
];

const INITIAL_CATEGORIES: TemplateCategory[] = [
  { id: '1', name: 'Residential', description: 'Villas, penthouses, and private home fit-outs', templateCount: 12 },
  { id: '2', name: 'Commercial', description: 'Corporate offices, co-working, and retail', templateCount: 8 },
  { id: '3', name: 'Procurement', description: 'Furniture, fixtures, & equipment schedules', templateCount: 6 },
  { id: '4', name: 'Material Sign-offs', description: 'Client veneer, marble, & paint approvals', templateCount: 4 },
];

export default function InteriorTemplatesPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'templates' | 'categories'>('templates');
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [categories, setCategories] = useState<TemplateCategory[]>(INITIAL_CATEGORIES);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State for Template
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Residential');
  const [description, setDescription] = useState('');
  const [roomCount, setRoomCount] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a template title.');

    setIsSubmitting(true);
    setTimeout(() => {
      const newTemplate: Template = {
        id: String(Date.now()),
        title: title.trim(),
        category,
        description: description.trim() || 'Custom interior workflow blueprint.',
        roomCount: Number(roomCount) || 4,
        boqItemsCount: Math.floor(Math.random() * 20) + 20,
        badgeColor: category === 'Residential' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      setTemplates([newTemplate, ...templates]);
      setIsSubmitting(false);
      setIsTemplateModalOpen(false);
      setTitle('');
      setDescription('');
      toast.success(`Template "${newTemplate.title}" created successfully!`);
    }, 500);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return toast.error('Please enter a category name.');

    const newCategory: TemplateCategory = {
      id: String(Date.now()),
      name: catName.trim(),
      description: catDesc.trim() || 'Custom category for organizing templates.',
      templateCount: 0
    };

    setCategories([...categories, newCategory]);
    setIsCategoryModalOpen(false);
    setCatName('');
    setCatDesc('');
    toast.success(`Category "${newCategory.name}" created!`);
  };

  const handleUseTemplate = (templateTitle: string) => {
    toast.success(`Blueprint "${templateTitle}" loaded into new project workspace!`);
  };

  const handleDeleteTemplate = (id: string, templateTitle: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success(`Template "${templateTitle}" deleted.`);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setCategories(categories.filter(c => c.id !== id));
    toast.success(`Category "${name}" deleted.`);
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-4 pb-12">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
              <span>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-bold">Template Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Template Management
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage reusable interior blueprints, category specifications, and BOQ templates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {activeTab === 'templates' ? (
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                <Plus className="w-4 h-4" /> Create Template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                <FolderPlus className="w-4 h-4" /> Add Category
              </button>
            )}
          </div>
        </div>

        {/* Stat Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Total Templates</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{templates.length} <span className="text-xs font-normal text-slate-400">blueprints</span></p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Categories Defined</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{categories.length} <span className="text-xs font-normal text-slate-400">categories</span></p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Times Applied</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">48 <span className="text-xs font-normal text-emerald-600 font-bold">projects</span></p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Copy className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition",
                activeTab === 'templates' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Templates Catalog ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition",
                activeTab === 'categories' ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Categories ({categories.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'templates' ? "Search templates..." : "Search categories..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            {activeTab === 'templates' && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium outline-none focus:border-blue-600 transition"
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* TAB 1: TEMPLATES CATALOG */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.length === 0 ? (
              <div className="md:col-span-2 py-16 text-center bg-white border border-slate-200/80 rounded-3xl p-6">
                <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No templates found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filter selection.</p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <GlassCard key={template.id} className="p-6 bg-white border border-slate-200/80 rounded-3xl space-y-4 shadow-xs hover:border-blue-300 transition duration-200 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", template.badgeColor)}>
                        {template.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Updated {template.lastUpdated}</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{template.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{template.description}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-blue-600" /> {template.roomCount} Rooms/Zones
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-indigo-600" /> {template.boqItemsCount} BOQ Items
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template.title)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl transition"
                    >
                      Apply Template <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id, template.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* TAB 2: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCategories.map((cat) => (
              <GlassCard key={cat.id} className="p-5 bg-white border border-slate-200/80 rounded-3xl space-y-3 shadow-xs hover:border-indigo-300 transition duration-200 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{cat.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{cat.templateCount} Templates</span>
                  <span className="text-indigo-600 font-bold">Active</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* CREATE TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create Workflow Template</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template Title</label>
                <input
                  type="text"
                  placeholder="e.g. Luxury Apartment 3BHK Blueprint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                >
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe included rooms, veneers, and BOQ items..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  <Send className="w-4 h-4" /> Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Template Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hospitality & Retail"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Scope Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe category purpose..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  <Send className="w-4 h-4" /> Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
