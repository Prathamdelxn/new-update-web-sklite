
// 'use client';

// import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   Plus, Search, MoreVertical, ChevronRight,
//   Layers, Layout, Eye, Pencil, Trash2, 
//   Image as ImageIcon, FileText, 
//   Ruler, DollarSign, Clock, Tag,
//   Calendar, Grid3x3, FolderOpen
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import api from '@/services/api.client';
// import { useToast } from '@/providers/ToastContext';
// import { TemplateModal } from '@/features/templates/components/TemplateModal';
// import { TemplateDetailModal } from '@/features/templates/components/TemplateDetailModal';
// import { Pagination, usePagination } from '@/components/shared/Pagination';

// export const TemplateList = () => {
//   const [templates, setTemplates] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isCreateOpen, setIsCreateOpen] = useState(false);
//   const [editingTemplate, setEditingTemplate] = useState<any>(null);
//   const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
//   const [templateMenuId, setTemplateMenuId] = useState<string | null>(null);
//   const templateMenuRef = useRef<HTMLDivElement>(null);

//   const toast = useToast();

//   const fetchTemplates = async () => {
//     try {
//       const response = await api.get('/templates');
//       setTemplates(Array.isArray(response.data) ? response.data : response.data?.templates ?? []);
//     } catch {
//       toast.error('Failed to load project templates');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchTemplates(); }, []);

//   useEffect(() => {
//     if (!templateMenuId) return;
//     const close = (e: MouseEvent) => {
//       if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
//         setTemplateMenuId(null);
//       }
//     };
//     document.addEventListener('mousedown', close);
//     return () => document.removeEventListener('mousedown', close);
//   }, [templateMenuId]);

//   const filteredTemplates = templates.filter(t =>
//     t.name?.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const { currentPage, totalPages, paginated: pagedTemplates, setCurrentPage } = usePagination(filteredTemplates, 8);

//   const handleDelete = async (e: React.MouseEvent, templateId: string, name: string) => {
//     e.stopPropagation();
//     setTemplateMenuId(null);
//     if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return;
//     try {
//       await api.delete(`/templates/${templateId}`);
//       toast.success('Template deleted');
//       fetchTemplates();
//     } catch {
//       toast.error('Failed to delete template');
//     }
//   };

//   const openEdit = (template: any) => {
//     setTemplateMenuId(null);
//     setEditingTemplate(template);
//   };

//   return (
//     <SkeletonLoader loading={loading} preset="card-grid">
//       <div className="space-y-8">

//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div className="space-y-1">
//            <div className="relative">
//               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search templates..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-96 bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
//               />
//             </div>
//           </div>
//           <div className="flex items-center gap-4">
            
//             <button
//               onClick={() => setIsCreateOpen(true)}
//               className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/25"
//             >
//               <Plus className="w-4 h-4" />
//               New Template
//             </button>
//           </div>
//         </div>

//         {/* Cards Grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
//           {pagedTemplates.map((template) => {
//             const coverImage = template.images?.[0];
            
//             return (
//               <div 
//                 key={template._id} 
//                 className="group relative bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
//                 onClick={() => setViewTemplateId(template._id)}
//               >
//                 {/* Menu Button */}
//                 <div
//                   className="absolute top-3 right-3 z-10"
//                   ref={templateMenuId === template._id ? templateMenuRef : null}
//                   onClick={(e) => e.stopPropagation()}
//                 >
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setTemplateMenuId(templateMenuId === template._id ? null : template._id);
//                     }}
//                     className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md"
//                   >
//                     <MoreVertical className="w-4 h-4 text-gray-600" />
//                   </button>

//                   {templateMenuId === template._id && (
//                     <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
//                       <button
//                         onClick={(e) => { e.stopPropagation(); setTemplateMenuId(null); setViewTemplateId(template._id); }}
//                         className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
//                       >
//                         <Eye className="w-4 h-4 text-gray-400" />
//                         View Details
//                       </button>
//                       <button
//                         onClick={(e) => { e.stopPropagation(); openEdit(template); }}
//                         className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
//                       >
//                         <Pencil className="w-4 h-4 text-gray-400" />
//                         Edit Template
//                       </button>
//                       <div className="border-t border-gray-100 my-1 mx-3" />
//                       <button
//                         onClick={(e) => handleDelete(e, template._id, template.name)}
//                         className="w-full px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                         Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>

//                 {/* Content */}
//                 <div className="p-4">
//                   {/* Tags */}
//                   <div className="flex items-center gap-2 mb-3">
//                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-100">
//                       <FolderOpen className="w-3 h-3" />
//                       {template.category?.name || 'General'}
//                     </span>
                   
//                   </div>

//                   {/* Title */}
//                   <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 tracking-tight">
//                     {template.name}
//                   </h4>

                 

//                   {/* Thumbnail + Metrics */}
//                   <div className="mt-4 flex items-start gap-3.5">
//                     {coverImage ? (
//                       <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
//                         <img
//                           src={coverImage}
//                           alt={template.name}
//                           className="w-full h-full object-cover"
//                         />
//                       </div>
//                     ) : (
//                       <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200 flex-shrink-0">
//                         <Layers className="w-6 h-6 text-gray-400" />
//                       </div>
//                     )}
                    
//                     <div className="flex-1 min-w-0 grid grid-cols-2 gap-y-1.5 gap-x-2">
//                       {(template.minBudget || template.maxBudget) && (
//                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
//                           <DollarSign className="w-3.5 h-3.5 text-gray-400" />
//                           <span>${((template.minBudget || 0) / 1000).toFixed(0)}k</span>
//                         </div>
//                       )}
//                       {template.area && (
//                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
//                           <Ruler className="w-3.5 h-3.5 text-gray-400" />
//                           <span>{template.area.toLocaleString()} ft²</span>
//                         </div>
//                       )}
//                       {template.estimatedDays && (
//                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
//                           <Clock className="w-3.5 h-3.5 text-gray-400" />
//                           <span>{template.estimatedDays} days</span>
//                         </div>
//                       )}
//                       {template.projectType && (
//                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
//                           <Tag className="w-3.5 h-3.5 text-gray-400" />
//                           <span className="capitalize truncate">{template.projectType}</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//  {/* Description */}
//                   <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mt-1.5 max-h-[42px]">
//                     {template.description || 'No description provided for this template.'}
//                   </p>
//                   {/* Divider */}
//                   <div className="my-3 border-t border-gray-100" />

//                   {/* Footer */}
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-3 text-xs text-gray-500">
//                       {template.images?.length > 0 && (
//                         <span className="flex items-center gap-1 font-medium">
//                           <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
//                           {template.images.length}
//                         </span>
//                       )}
//                       {template.files?.length > 0 && (
//                         <span className="flex items-center gap-1 font-medium">
//                           <FileText className="w-3.5 h-3.5 text-gray-400" />
//                           {template.files.length}
//                         </span>
//                       )}
//                       {template.views && (
//                         <span className="flex items-center gap-1 font-medium">
//                           <Eye className="w-3.5 h-3.5 text-gray-400" />
//                           {template.views}
//                         </span>
//                       )}
//                     </div>
//                     <button
//                       onClick={(e) => { e.stopPropagation(); setViewTemplateId(template._id); }}
//                       className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group/btn"
//                     >
//                       View Details
//                       <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}

//           {/* Empty State */}
//           {filteredTemplates.length === 0 && (
//             <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
//               <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
//                 <Layout className="w-10 h-10 text-gray-400" />
//               </div>
//               <h3 className="text-xl font-bold text-gray-700">No templates found</h3>
//               <p className="text-sm text-gray-400 mt-1.5 max-w-sm">
//                 Get started by creating your first project template
//               </p>
//               <button
//                 onClick={() => setIsCreateOpen(true)}
//                 className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
//               >
//                 <Plus className="w-4 h-4" />
//                 Create Template
//               </button>
//             </div>
//           )}
//         </div>

//         <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

//         {/* Modals */}
//         <TemplateModal
//           isOpen={isCreateOpen}
//           onClose={() => setIsCreateOpen(false)}
//           onSuccess={fetchTemplates}
//         />

//         <TemplateModal
//           isOpen={!!editingTemplate}
//           onClose={() => setEditingTemplate(null)}
//           onSuccess={() => { fetchTemplates(); setEditingTemplate(null); }}
//           initialData={editingTemplate}
//           templateId={editingTemplate?._id}
//         />

//         <TemplateDetailModal
//           isOpen={!!viewTemplateId}
//           onClose={() => setViewTemplateId(null)}
//           templateId={viewTemplateId}
//           onEdit={(t) => { setViewTemplateId(null); setEditingTemplate(t); }}
//         />
//       </div>
//     </SkeletonLoader>
//   );
// };
'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, MoreVertical, ChevronRight,
  Layers, Layout, Eye, Pencil, Trash2, 
  Image as ImageIcon, FileText, 
  Ruler, DollarSign, Clock, Tag,
  Calendar, Grid3x3, FolderOpen
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { TemplateModal } from '@/features/templates/components/TemplateModal';
import { TemplateDetailModal } from '@/features/templates/components/TemplateDetailModal';
import { Pagination, usePagination } from '@/components/shared/Pagination';

export const TemplateList = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
  const [templateMenuId, setTemplateMenuId] = useState<string | null>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const toast = useToast();

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

  useEffect(() => {
    if (!templateMenuId) return;
    const close = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setTemplateMenuId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [templateMenuId]);

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { currentPage, totalPages, paginated: pagedTemplates, setCurrentPage } = usePagination(filteredTemplates, 8);

  const handleDelete = async (e: React.MouseEvent, templateId: string, name: string) => {
    e.stopPropagation();
    setTemplateMenuId(null);
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return;
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
    <SkeletonLoader loading={loading} preset="card-grid">
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
           <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-96 bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/25"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pagedTemplates.map((template) => {
            const coverImage = template.images?.[0];
            
            // Format budget range
            const minBudget = template.minBudget ? formatCurrency(template.minBudget) : null;
            const maxBudget = template.maxBudget ? formatCurrency(template.maxBudget) : null;
            const budgetDisplay = minBudget && maxBudget 
              ? `${minBudget} - ${maxBudget}`
              : minBudget || maxBudget || null;
            
            return (
              <div 
                key={template._id} 
                className="group relative bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => setViewTemplateId(template._id)}
              >
                {/* Menu Button */}
                <div
                  className="absolute top-3 right-3 z-10"
                  ref={templateMenuId === template._id ? templateMenuRef : null}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateMenuId(templateMenuId === template._id ? null : template._id);
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>

                  {templateMenuId === template._id && (
                    <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); setTemplateMenuId(null); setViewTemplateId(template._id); }}
                        className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                        View Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(template); }}
                        className="w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-gray-400" />
                        Edit Template
                      </button>
                      <div className="border-t border-gray-100 my-1 mx-3" />
                      <button
                        onClick={(e) => handleDelete(e, template._id, template.name)}
                        className="w-full px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Tags */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-100">
                      <FolderOpen className="w-3 h-3" />
                      {template.category?.name || 'General'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base capitalize font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 tracking-tight">
                    {template.name}
                  </h4>

                

                  {/* Thumbnail + Metrics */}
                  <div className="mt-4 flex items-start gap-3.5">
                    {coverImage ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
                        <img
                          src={coverImage}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200 flex-shrink-0">
                        <Layers className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-y-1.5 gap-x-2">
                      {/* Budget - Full width row */}
                      {budgetDisplay && (
                        <div className="col-span-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <span>{budgetDisplay}</span>
                        </div>
                      )}
                      
                      {/* Area */}
                      {template.area && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <Ruler className="w-3.5 h-3.5 text-gray-400" />
                          <span>{template.area.toLocaleString()} ft²</span>
                        </div>
                      )}
                      
                      {/* Days */}
                      {template.estimatedDays && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{template.estimatedDays} days</span>
                        </div>
                      )}
                      
                      {/* Project Type - Only if no area or days to fill the grid */}
                      {template.projectType && !template.area && !template.estimatedDays && (
                        <div className="col-span-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          <span className="capitalize truncate">{template.projectType}</span>
                        </div>
                      )}
                    </div>
                  </div>
  {/* Description */}
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mt-1.5 ">
                    {template.description || 'No description provided for this template.'}
                  </p>
                  {/* Divider */}
                  <div className=" pb-3 border-t border-gray-100" />

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {template.images?.length > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                          {template.images.length}
                        </span>
                      )}
                      {template.files?.length > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          {template.files.length}
                        </span>
                      )}
                      {template.views && (
                        <span className="flex items-center gap-1 font-medium">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                          {template.views}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewTemplateId(template._id); }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group/btn"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Layout className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">No templates found</h3>
              <p className="text-sm text-gray-400 mt-1.5 max-w-sm">
                Get started by creating your first project template
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
          )}
        </div>

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
          onEdit={(t) => { setViewTemplateId(null); setEditingTemplate(t); }}
        />
      </div>
    </SkeletonLoader>
  );
};