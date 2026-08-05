'use client';

// Port of src/components/modals/CreateLeadModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Building, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InteriorCreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    leadSource: 'Phone Call',
    propertyType: 'Flat',
    projectLocation: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobileNumber) {
      toast.error('Name and Mobile Number are required');
      return;
    }

    try {
      setIsSubmitting(true);
      await interiorCrmService.createCustomer(formData);
      toast.success('Lead created successfully!');
      onSuccess();
      onClose();
      setFormData({
        name: '',
        mobileNumber: '',
        email: '',
        leadSource: 'Phone Call',
        propertyType: 'Flat',
        projectLocation: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[hsl(var(--card))] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.5)]">
            <div>
              <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Add New Lead</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Enter the basic details of the new prospect.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">
            <form id="interior-lead-form" onSubmit={handleSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <User size={14} className="text-[hsl(var(--muted-foreground))]" /> Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Mobile */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Phone size={14} className="text-[hsl(var(--muted-foreground))]" /> Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    required
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                    placeholder="e.g., +91 9876543210"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Mail size={14} className="text-[hsl(var(--muted-foreground))]" /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                    placeholder="e.g., john@example.com"
                  />
                </div>

                {/* Lead Source */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Activity size={14} className="text-[hsl(var(--muted-foreground))]" /> Lead Source
                  </label>
                  <select
                    name="leadSource"
                    value={formData.leadSource}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all appearance-none"
                  >
                    {["Phone Call", "Walk-in", "Referral", "Existing Customer", "Builder Reference", "Architect Reference", "Society Reference", "Social Media", "Other"].map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                {/* Property Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Building size={14} className="text-[hsl(var(--muted-foreground))]" /> Property Type
                  </label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all appearance-none"
                  >
                    {["Flat", "Villa", "Office", "Shop", "Other"].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Project Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <MapPin size={14} className="text-[hsl(var(--muted-foreground))]" /> Project Location
                  </label>
                  <input
                    type="text"
                    name="projectLocation"
                    value={formData.projectLocation}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                    placeholder="e.g., Hiranandani Estate, Thane"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3 bg-[hsl(var(--muted)/0.5)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="interior-lead-form"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
