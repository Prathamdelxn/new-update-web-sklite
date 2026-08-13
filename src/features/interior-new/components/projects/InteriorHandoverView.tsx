'use client';

// Port of interior-os-frontend's projects/[projectId]/handover/page.tsx.
// TanStack/sonner/zustand replaced with local useState/useEffect + interiorProjectService.
// Simplified: sky-lite-web's Button primitive only has default/outline variants and
// default/sm/lg sizes, so "ghost"/"icon-sm" from the source were mapped to
// "outline"/"sm". The "[Dev] Use Mock File" mock-upload helper button was dropped
// since it existed only for local dev convenience in the source app.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageCheck, CheckCircle, Loader2, FileText, Plus, X, FileDown, Trash2, Edit, Save } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';

interface InteriorHandoverViewProps {
  projectId: string;
}

export default function InteriorHandoverView({ projectId }: InteriorHandoverViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [handover, setHandover] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('warranty');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isEditingChecklist, setIsEditingChecklist] = useState(false);
  const [editedChecklist, setEditedChecklist] = useState<Array<{ task: string; status: string }>>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const closeModal = () => {
    setIsModalOpen(false);
    setDocName('');
    setDocType('warranty');
    setSelectedFile(null);
  };

  const fetchHandover = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await interiorProjectService.getHandover(projectId);
      if (res.success && res.data) setHandover(res.data);
    } catch (err) {
      console.error('Failed to load handover', err);
      if (showLoading) toast.error('Failed to fetch Handover status');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchHandover();
  }, [projectId]);

  const startEditingChecklist = () => {
    if (!handover) return;
    setEditedChecklist(handover.checklist.map((c: any) => ({ task: c.task, status: c.status })));
    setNewTaskText('');
    setIsEditingChecklist(true);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    if (editedChecklist.some((c) => c.task.toLowerCase() === newTaskText.trim().toLowerCase())) {
      toast.error('Task already exists in checklist');
      return;
    }
    setEditedChecklist([...editedChecklist, { task: newTaskText.trim(), status: 'pending' }]);
    setNewTaskText('');
  };

  const handleDeleteTask = (index: number) => {
    setEditedChecklist(editedChecklist.filter((_, i) => i !== index));
  };

  const handleUpdateTaskText = (index: number, val: string) => {
    const list = [...editedChecklist];
    list[index].task = val;
    setEditedChecklist(list);
  };

  const handleSaveChecklist = async () => {
    if (editedChecklist.length === 0) {
      toast.error('Checklist cannot be empty');
      return;
    }
    try {
      setUpdating(true);
      const res = await interiorProjectService.updateHandover(projectId, { checklist: editedChecklist });
      if (res.success) {
        toast.success('Handover checklist updated successfully!');
        setIsEditingChecklist(false);
        fetchHandover(false);
      }
    } catch (err) {
      console.error('Failed to save checklist', err);
      toast.error('Failed to update checklist');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleCheckitem = async (task: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const prevHandover = { ...handover };
    
    // Optimistic update for instant UI reaction
    setHandover((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map((c: any) =>
          c.task === task ? { ...c, status: nextStatus, completedAt: nextStatus === 'completed' ? new Date().toISOString() : null } : c
        )
      };
    });

    try {
      const res = await interiorProjectService.updateHandover(projectId, { taskName: task, status: nextStatus });
      if (!res.success) {
        setHandover(prevHandover); // Revert on failure
        toast.error('Failed to update checklist status');
      }
    } catch (err) {
      console.error('Checkitem update failed', err);
      setHandover(prevHandover); // Revert on failure
      toast.error('Failed to update checklist status');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) {
      toast.error('Please fill in document description');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadToastId = toast.loading('Uploading file...');
      const uploadRes = await interiorProjectService.uploadHandoverDocumentFile(projectId, formData);
      toast.dismiss(uploadToastId);

      if (!uploadRes.success || !uploadRes.data?.url) {
        throw new Error('File upload failed');
      }

      const uploadedUrl = uploadRes.data.url;
      toast.success('Document uploaded!');

      const res = await interiorProjectService.updateHandover(projectId, {
        documentName: docName,
        documentUrl: uploadedUrl,
        documentType: docType,
      });

      if (res.success) {
        toast.success('Closeout document registered successfully!');
        closeModal();
        fetchHandover(false);
      }
    } catch (err: any) {
      console.error('Document upload failed', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to register document');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this closeout document?',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await interiorProjectService.updateHandover(projectId, { deleteDocumentId: docId });
      if (res.success) {
        toast.success('Document deleted successfully');
        fetchHandover(false);
      }
    } catch (err) {
      console.error('Failed to delete document', err);
      toast.error('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Handover & Closeout Management</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Track warranties catalog registries, operation manuals closeout checklists, and client handover signoffs.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-center items-center p-6 text-center">
          {(() => {
            const checklist = handover?.checklist || [];
            const completed = checklist.filter((t: any) => t.status === 'completed').length;
            const percentage = checklist.length > 0 ? Math.round((completed / checklist.length) * 100) : 0;
            const circumference = 2 * Math.PI * 60;
            const strokeDashoffset = circumference - (percentage / 100) * circumference;
            return (
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="60" stroke="hsl(var(--muted))" strokeWidth="12" fill="transparent" />
                  <circle 
                    cx="72" cy="72" r="60" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
                    {percentage}%
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider mt-0.5">Handover Ready</span>
                </div>
              </div>
            );
          })()}
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="p-5 border-b border-[hsl(var(--border))] pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[hsl(var(--primary))]" />
              Punch List & Handover Checklist
            </CardTitle>
            {!isEditingChecklist && (
              <Button size="sm" variant="outline" onClick={startEditingChecklist}>
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit Checklist
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isEditingChecklist ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new checklist task..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddTask}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {editedChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))]">
                      <Input
                        className="h-8 text-xs font-semibold"
                        value={item.task}
                        onChange={(e) => handleUpdateTaskText(idx, e.target.value)}
                        placeholder="Task description"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-500 hover:text-rose-600 shrink-0"
                        onClick={() => handleDeleteTask(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {editedChecklist.length === 0 && (
                    <div className="text-center py-4 text-xs text-[hsl(var(--muted-foreground))]">Checklist is empty. Add tasks above.</div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                  <Button size="sm" variant="outline" onClick={() => setIsEditingChecklist(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveChecklist} disabled={updating}>
                    {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save Checklist
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {handover?.checklist.map((item: any) => (
                  <div
                    key={item.task}
                    onClick={() => handleToggleCheckitem(item.task, item.status)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer select-none bg-[hsl(var(--card))]"
                  >
                    <div className="flex items-center gap-2.5 font-medium">
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-all',
                          item.status === 'completed' ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white' : 'border-[hsl(var(--border))]'
                        )}
                      >
                        {item.status === 'completed' && <CheckCircle className="w-3 h-3 fill-current" />}
                      </div>
                      <span className={cn('text-xs font-semibold', item.status === 'completed' && 'line-through text-[hsl(var(--muted-foreground))]')}>
                        {item.task}
                      </span>
                    </div>
                    {item.completedAt && (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        Done: {new Date(item.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
                {handover?.checklist.length === 0 && (
                  <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))]">Checklist has no items. Click &quot;Edit Checklist&quot; to define tasks.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-5 border-b border-[hsl(var(--border))] pb-3">
          <CardTitle className="text-sm font-bold">Closeout Document Register (O&M Manuals & Warranties)</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {handover?.documents.length === 0 ? (
            <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))]">
              No closeout manuals or certificates uploaded yet. Click &quot;Add Document&quot; to upload your first certificate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {handover?.documents.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-lg hover:border-[hsl(var(--primary)/0.3)] transition-all bg-[hsl(var(--card))]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{doc.name}</h4>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">{doc.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                      <FileDown className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-100" onClick={() => handleDeleteDocument(doc._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Log Handover closeout document
                </h3>
                <button onClick={closeModal} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Document Description Title</label>
                    <Input required placeholder="e.g. HVAC Compressor Warranty Certificate" value={docName} onChange={(e) => setDocName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Document Category</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="warranty">Warranty Card / Contract</option>
                      <option value="manual">O&M Manual Description</option>
                      <option value="certificate">Handover / NOC Certificate</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block mb-1">Upload Closeout File</label>
                    <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-5 flex flex-col items-center justify-center gap-2 hover:border-[hsl(var(--primary)/0.5)] transition-colors relative cursor-pointer bg-[hsl(var(--background))]">
                      <input
                        type="file"
                        required
                        accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                        }}
                      />
                      <FileDown className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-semibold text-center text-[hsl(var(--foreground))] px-2 truncate w-full">
                        {selectedFile ? selectedFile.name : 'Click or drag closeout file to upload'}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">PDF, Images, or Word files up to 50MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Document
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
