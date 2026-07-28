// 'use client';

// import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

// import React, { useState, useEffect } from 'react';
// import {
//   Plus,
//   Edit2,
//   Trash2,
//   Check,
//   X,
//   Folder,
//   Loader2,
//   AlertTriangle,
//   ChevronRight,
//   Layers,
//   Search,
//   CheckCircle2,
// } from 'lucide-react';
// import { GlassCard } from '@/components/ui/GlassCard';
// import api from '@/services/api.client';
// import { useToast } from '@/providers/ToastContext';

// export const CategoryList = () => {
//   const [categories, setCategories] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isCreating, setIsCreating] = useState(false);
//   const [search, setSearch] = useState('');
//   const [showCreate, setShowCreate] = useState(false);
//   const [newName, setNewName] = useState('');
//   const [lastAdded, setLastAdded] = useState<string | null>(null);
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [editingName, setEditingName] = useState('');
//   const [isUpdating, setIsUpdating] = useState(false);

//   const toast = useToast();

//   const fetchCategories = async () => {
//     try {
//       const response = await api.get('/template-categories');
//       setCategories(response.data);
//     } catch (error) {
//       console.error('Error fetching categories:', error);
//       toast.error('Failed to load template categories');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const handleCreate = async () => {
//     const name = newName.trim();
//     if (!name) return;
//     setIsCreating(true);
//     try {
//       await api.post('/template-categories', { name });
//       setNewName('');
//       setShowCreate(false);
//       setLastAdded(name);
//       setTimeout(() => setLastAdded(null), 3000);
//       fetchCategories();
//     } catch (error: any) {
//       toast.error(error.response?.data?.message || 'Failed to create category');
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   const handleUpdate = async (id: string) => {
//     if (!editingName.trim()) return;
//     setIsUpdating(true);
//     try {
//       await api.patch(`/template-categories/${id}`, { name: editingName });
//       toast.success('Category updated!');
//       setEditingId(null);
//       fetchCategories();
//     } catch (error: any) {
//       toast.error(error.response?.data?.message || 'Failed to update');
//     } finally {
//       setIsUpdating(false);
//     }
//   };

//   const handleDelete = async (id: string) => {
//     if (!window.confirm('Are you sure? This will delete all templates in this category.')) return;
//     try {
//       await api.delete(`/template-categories/${id}`);
//       toast.success('Category deleted');
//       fetchCategories();
//     } catch (error: any) {
//       toast.error(error.response?.data?.message || 'Failed to delete');
//     }
//   };

//   const startEditing = (cat: any) => {
//     setEditingId(cat._id);
//     setEditingName(cat.name);
//   };

//   // Loading state handled by Skeleton wrapper

//   const filtered = categories.filter((c) =>
//     c.name.toLowerCase().includes(search.toLowerCase())
//   );
//   const newNameTrimmed = newName.trim();
//   const alreadyExists = categories.some(
//     (c) => c.name.toLowerCase() === newNameTrimmed.toLowerCase()
//   );

//   return (
//     <SkeletonLoader loading={loading} preset="list">
//       <div className="space-y-6">
//         {/* Toolbar — search left, add button right */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div className="relative flex-1 max-w-md group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
//           <input
//             type="text"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search categories..."
//             className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
//           />
//         </div>
//         <button
//           onClick={() => { setShowCreate(true); setNewName(''); }}
//           className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
//         >
//           <Plus className="w-4 h-4" />
//           <span>Add Category</span>
//         </button>
//       </div>

//       {/* Inline create form */}
//       {showCreate && (
//         <div className="flex items-center gap-3">
//           <input
//             autoFocus
//             type="text"
//             value={newName}
//             onChange={(e) => setNewName(e.target.value)}
//             onKeyDown={(e) => { if (e.key === 'Enter' && newNameTrimmed && !alreadyExists) handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setNewName(''); } }}
//             placeholder="Category name..."
//             className="flex-1 max-w-md bg-white border border-blue-300 rounded-2xl py-3 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
//           />
//           <button
//             onClick={handleCreate}
//             disabled={isCreating || !newNameTrimmed || alreadyExists}
//             className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-2xl enabled:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
//           >
//             {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
//             Save
//           </button>
//           <button
//             onClick={() => { setShowCreate(false); setNewName(''); }}
//             className="p-3 rounded-2xl border border-gray-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
//           >
//             <X className="w-4 h-4" />
//           </button>
//           {newNameTrimmed && alreadyExists && (
//             <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
//               <AlertTriangle className="w-3.5 h-3.5" />
//               Already exists
//             </span>
//           )}
//         </div>
//       )}

//       {/* Feedback strip */}
//       {lastAdded && (
//         <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium w-fit">
//           <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
//           Category <span className="font-bold">"{lastAdded}"</span> added
//         </div>
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         {filtered.map((cat) => (
//           <GlassCard key={cat._id} className="p-6 border-gray-200 group hover:border-blue-500/50 transition-all" gradient>
//             <div className="flex items-center justify-between mb-4">
//               <div className="p-3 rounded-2xl bg-blue-100 border border-blue-200">
//                 <Folder className="w-6 h-6 text-blue-600" />
//               </div>
//               <div className="flex items-center space-x-1">
//                 {editingId === cat._id ? (
//                   <>
//                     <button
//                       onClick={() => handleUpdate(cat._id)}
//                       disabled={isUpdating}
//                       className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
//                     >
//                       <Check className="w-4 h-4" />
//                     </button>
//                     <button
//                       onClick={() => setEditingId(null)}
//                       className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   </>
//                 ) : (
//                   <>
//                     <button
//                       onClick={() => startEditing(cat)}
//                       className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
//                     >
//                       <Edit2 className="w-4 h-4" />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(cat._id)}
//                       className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
//                     >
//                       <Trash2 className="w-4 h-4" />
//                     </button>
//                   </>
//                 )}
//               </div>
//             </div>

//             {editingId === cat._id ? (
//               <input
//                 autoFocus
//                 className="w-full bg-white border border-blue-200 rounded-lg py-1 px-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
//                 value={editingName}
//                 onChange={(e) => setEditingName(e.target.value)}
//                 onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat._id)}
//               />
//             ) : (
//               <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{cat.name}</h4>
//             )}
//             <div className="mt-4 flex items-center justify-between">
//               <div className="flex items-center space-x-1.5">
//                 <Layers className="w-3 h-3 text-slate-400" />
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.templateCount || 0} Blueprints</span>
//               </div>
//               <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
//             </div>
//           </GlassCard>
//         ))}

//         {filtered.length === 0 && (
//           <div className="col-span-full py-20 text-center">
//             <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
//             <p className="text-slate-500 italic">
//               {search ? `No categories match "${search}"` : 'No categories defined yet.'}
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//     </SkeletonLoader>
//   );
// };'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Folder,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Layers,
  Search,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

export const CategoryList = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const toast = useToast();

  const fetchCategories = async () => {
    try {
      const response = await api.get('/template-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load template categories');
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
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    setIsUpdating(true);
    try {
      await api.patch(`/template-categories/${id}`, { name: editingName });
      toast.success('Category updated!');
      setEditingId(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete all templates in this category.')) return;
    try {
      await api.delete(`/template-categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
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

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const newNameTrimmed = newName.trim();
  const alreadyExists = categories.some(
    (c) => c.name.toLowerCase() === newNameTrimmed.toLowerCase()
  );

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
           <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-96 bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            
            <button
              onClick={() => { setShowCreate(true); setNewName(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/25"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && newNameTrimmed && !alreadyExists) handleCreate(); 
                    if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
                  }}
                  placeholder="Enter category name..."
                  className="w-full bg-white border border-blue-300 rounded-xl py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {newNameTrimmed && alreadyExists && (
                  <p className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Category already exists
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !newNameTrimmed || alreadyExists}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl enabled:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success toast strip */}
        {lastAdded && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium w-fit animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Category <span className="font-bold">"{lastAdded}"</span> added successfully
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((cat) => (
            <div 
              key={cat._id} 
              className="group relative bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-4">
                {/* Icon + Name + Actions in one row */}
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  
                  {/* Category Name */}
                  {editingId === cat._id ? (
                    <input
                      autoFocus
                      className="flex-1 bg-white border border-blue-300 rounded-lg py-1.5 px-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(cat._id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                  ) : (
                    <h4 className="flex-1 text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                      {cat.name}
                    </h4>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {editingId === cat._id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(cat._id)}
                          disabled={isUpdating}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

               
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Folder className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">
                {search ? 'No categories found' : 'No categories yet'}
              </h3>
              <p className="text-sm text-gray-400 mt-1.5 max-w-sm">
                {search 
                  ? `No categories match "${search}"` 
                  : 'Create your first category to organize templates'
                }
              </p>
              {!search && (
                <button
                  onClick={() => { setShowCreate(true); setNewName(''); }}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
                >
                  <Plus className="w-4 h-4" />
                  Create Category
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </SkeletonLoader>
  );
};