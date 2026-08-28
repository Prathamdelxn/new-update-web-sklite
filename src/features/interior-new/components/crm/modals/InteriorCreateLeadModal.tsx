'use client';

// Port of src/components/modals/CreateLeadModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Building, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateName, validateMobileNumber, validateEmail, ValidationErrors } from '@/lib/crmValidation';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'User';
  return `${name} (${u.role?.name || u.role || 'Member'})`;
}

export const InteriorCreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  users = [],
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    leadSource: 'Phone Call',
    propertyType: 'Flat',
    projectLocation: '',
  });

  React.useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setFormData({
        name: '',
        mobileNumber: '',
        email: '',
        leadSource: 'Phone Call',
        propertyType: 'Flat',
        projectLocation: '',
      });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      mobileNumber: validateMobileNumber(formData.mobileNumber),
      email: validateEmail(formData.email),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((err) => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: formData.name.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim() || undefined,
        leadSource: formData.leadSource,
        propertyType: formData.propertyType,
        projectLocation: formData.projectLocation.trim() || undefined,
      };

      await interiorCrmService.createCustomer(payload);
      toast.success('Lead created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.5)]">
            <div>
              <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Add New Lead</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Enter prospect details to start tracking in the CRM pipeline.
              </p>
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
            <form id="interior-lead-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <User size={14} className="text-[hsl(var(--muted-foreground))]" /> Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., Rajesh Sharma"
                    required
                  />
                  {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name}</p>}
                </div>

                {/* Mobile */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Phone size={14} className="text-[hsl(var(--muted-foreground))]" /> Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.mobileNumber
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., 9876543210"
                    required
                  />
                  {errors.mobileNumber && (
                    <p className="text-xs text-red-500 font-medium mt-1">{errors.mobileNumber}</p>
                  )}
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
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., client@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email}</p>}
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {[
                      'Phone Call',
                      'Walk-in',
                      'Referral',
                      'Existing Customer',
                      'Builder Reference',
                      'Architect Reference',
                      'Society Reference',
                      'Social Media',
                      'Other',
                    ].map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {['Flat', 'Villa', 'Office', 'Shop', 'Other'].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
