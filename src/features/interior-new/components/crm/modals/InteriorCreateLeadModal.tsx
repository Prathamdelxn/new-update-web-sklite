'use client';

// Port of src/components/modals/CreateLeadModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Building, Activity, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import {
  validateName,
  validateMobileNumber,
  validateEmail,
  validateLeadSource,
  validatePropertyType,
  validateProjectLocation,
  LEAD_SOURCES,
  PROPERTY_TYPES,
  ValidationErrors,
} from '@/lib/crmValidation';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users?: any[];
}

export const InteriorCreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

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
      setTouched({});
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

  const validateField = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'name':
        return validateName(value);
      case 'mobileNumber':
        return validateMobileNumber(value);
      case 'email':
        return validateEmail(value);
      case 'leadSource':
        return validateLeadSource(value);
      case 'propertyType':
        return validatePropertyType(value);
      case 'projectLocation':
        return validateProjectLocation(value);
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If the field has already been touched or currently has an error, validate live
    if (touched[name] || errors[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      mobileNumber: validateMobileNumber(formData.mobileNumber),
      email: validateEmail(formData.email),
      leadSource: validateLeadSource(formData.leadSource),
      propertyType: validatePropertyType(formData.propertyType),
      projectLocation: validateProjectLocation(formData.projectLocation),
    };
    setErrors(newErrors);
    setTouched({
      name: true,
      mobileNumber: true,
      email: true,
      leadSource: true,
      propertyType: true,
      projectLocation: true,
    });
    return !Object.values(newErrors).some((err) => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the validation errors before creating the lead');
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
        projectLocation: formData.projectLocation.trim(),
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
          className="relative w-full max-w-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
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
            <form id="interior-lead-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <User size={14} className="text-[hsl(var(--muted-foreground))]" /> Full Name *
                    </label>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {formData.name.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={50}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., Rajesh Sharma"
                    required
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Mobile */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Phone size={14} className="text-[hsl(var(--muted-foreground))]" /> Mobile Number *
                    </label>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      10-15 digits
                    </span>
                  </div>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={16}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.mobileNumber
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., +91 9876543210"
                    required
                  />
                  {errors.mobileNumber && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.mobileNumber}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Mail size={14} className="text-[hsl(var(--muted-foreground))]" /> Email Address
                    </label>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Optional (max 100)
                    </span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={100}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., client@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Lead Source */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Activity size={14} className="text-[hsl(var(--muted-foreground))]" /> Lead Source *
                  </label>
                  <select
                    name="leadSource"
                    value={formData.leadSource}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.leadSource
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                  >
                    {LEAD_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                  {errors.leadSource && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.leadSource}
                    </p>
                  )}
                </div>

                {/* Property Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Building size={14} className="text-[hsl(var(--muted-foreground))]" /> Property Type *
                  </label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.propertyType
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.propertyType && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.propertyType}
                    </p>
                  )}
                </div>

                {/* Project Location */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <MapPin size={14} className="text-[hsl(var(--muted-foreground))]" /> Project Location *
                    </label>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {formData.projectLocation.length}/150
                    </span>
                  </div>
                  <input
                    type="text"
                    name="projectLocation"
                    value={formData.projectLocation}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={150}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.projectLocation
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                    placeholder="e.g., Hiranandani Estate, Thane"
                    required
                  />
                  {errors.projectLocation && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      {errors.projectLocation}
                    </p>
                  )}
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
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

