'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  type: 'Issue' | 'Snag';
  existingIssue?: any;
}

const CATEGORIES = ['Technical', 'Resource', 'Financial', 'Site', 'Client', 'Third Party', 'Other'];

export const IssueModal: React.FC<IssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  type,
  existingIssue,
}) => {
  const isEdit = !!existingIssue;
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Technical',
    assignedTo: '',
  });

  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && existingIssue) {
      setFormData({
        title: existingIssue.title || '',
        description: existingIssue.description || '',
        priority: existingIssue.priority || 'Medium',
        category: existingIssue.category || 'Technical',
        assignedTo: existingIssue.assignedTo?._id || existingIssue.assignedTo || '',
      });
      setFiles([]);
    } else {
      setFormData({ title: '', description: '', priority: 'Medium', category: 'Technical', assignedTo: '' });
      setFiles([]);
    }

    api.get(`/users?projectId=${projectId}`)
      .then(res => {
        const rawUsers: any[] = Array.isArray(res.data) ? res.data : [];
        setUsers(rawUsers);
      })
      .catch(() => console.error('Error fetching project members'));
  }, [isOpen, projectId, existingIssue?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        uploadedUrls = await Promise.all(files.map(f => uploadToCloudinary(f)));
      }

      if (type === 'Snag') {
        const snagPayload = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assignedTo: formData.assignedTo || undefined,
          ...(uploadedUrls.length > 0 && { images: uploadedUrls }),
        };

        if (isEdit) {
          await api.patch(`/snags/${existingIssue._id}`, snagPayload);
          toast.success(`Snag updated successfully!`);
        } else {
          await api.post(`/projects/${projectId}/snags`, snagPayload);
          toast.success(`Snag reported successfully!`);
        }
      } else {
        const issuePayload = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          assignedTo: formData.assignedTo || undefined,
          ...(uploadedUrls.length > 0 && { images: uploadedUrls }),
        };

        if (isEdit) {
          await api.patch(`/issues/${existingIssue._id}`, issuePayload);
          toast.success(`Issue updated successfully!`);
        } else {
          await api.post(`/projects/${projectId}/issues`, issuePayload);
          toast.success(`Issue reported successfully!`);
        }
      }
      onSuccess();
      onClose();
      setFormData({ title: '', description: '', priority: 'Medium', category: 'Technical', assignedTo: '' });
      setFiles([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'report'} ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg relative z-10 max-h-[90vh] flex flex-col"
          >
            <GlassCard className="border-gray-200 flex flex-col overflow-hidden h-full" gradient>
              
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100/50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 sm:p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">{isEdit ? `Edit ${type}` : `Report New ${type}`}</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Project Tracking & Accountability</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="issue-form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 ml-1">Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                      placeholder={`e.g. ${type === 'Issue' ? 'Delayed material arrival' : 'Cracks in pillar #4'}`}
                    />
                  </div>


                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 ml-1">Assign To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                    >
                      <option value="">Select Assignee (Optional)</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 ml-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all resize-none"
                      placeholder="Detail the issue and impact..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 ml-1">Attach Photos</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setFiles(Array.from(e.target.files));
                        }
                      }}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                    />
                    {files.length > 0 && (
                      <p className="text-xs text-slate-500 ml-1">{files.length} file(s) selected</p>
                    )}
                  </div>

                </form>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-6 border-t border-gray-100/50 bg-gray-50/50 shrink-0 flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="issue-form"
                  disabled={isLoading}
                  className="flex-[2] py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>{isEdit ? 'Saving...' : 'Reporting...'}</span>
                    </>
                  ) : (
                    <span>{isEdit ? `Save ${type}` : `Report ${type}`}</span>
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
