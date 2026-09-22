// =============================================================================
// Sky-Lite Web — Shared Validation Helper Utilities for CRM Module
// Industry-standard validation rules for Lead Management
// =============================================================================

export interface ValidationErrors {
  [key: string]: string | null;
}

export const LEAD_SOURCES = [
  'Phone Call',
  'Walk-in',
  'Referral',
  'Existing Customer',
  'Builder Reference',
  'Architect Reference',
  'Society Reference',
  'Social Media',
  'Other',
] as const;

export const PROPERTY_TYPES = ['Flat', 'Villa', 'Office', 'Shop', 'Other'] as const;

/**
 * Validates a lead/customer full name according to industry standards.
 * - Required
 * - 2 to 50 characters
 * - Only alphabets, spaces, dots, hyphens, and apostrophes
 * - Cannot contain numbers or special symbols
 */
export function validateName(name?: string, minLength = 2, maxLength = 50): string | null {
  if (!name || !name.trim()) {
    return 'Full name is required';
  }
  const cleaned = name.trim();
  if (cleaned.length < minLength) {
    return `Full name must be at least ${minLength} characters long`;
  }
  if (cleaned.length > maxLength) {
    return `Full name cannot exceed ${maxLength} characters (currently ${cleaned.length})`;
  }
  if (/\d/.test(cleaned)) {
    return 'Full name cannot contain numbers';
  }
  const nameRegex = /^[a-zA-Z\s'.-]+$/;
  if (!nameRegex.test(cleaned)) {
    return 'Full name can only contain letters, spaces, hyphens, and dots';
  }
  return null;
}

/**
 * Validates a mobile / phone number according to ITU-T E.164 standards.
 * - Required (when isRequired=true)
 * - 10 to 15 digits
 * - Allows optional leading + and space/hyphen separators
 * - Cannot contain letters or invalid symbols
 */
export function validateMobileNumber(mobile?: string, isRequired = true): string | null {
  if (!mobile || !mobile.trim()) {
    return isRequired ? 'Mobile number is required' : null;
  }
  const cleaned = mobile.trim();
  if (/[a-zA-Z]/.test(cleaned)) {
    return 'Mobile number cannot contain letters';
  }
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return `Mobile number must be at least 10 digits (currently ${digitsOnly.length})`;
  }
  if (digitsOnly.length > 15) {
    return `Mobile number cannot exceed 15 digits (currently ${digitsOnly.length})`;
  }
  const phoneRegex = /^\+?[0-9\s-]{10,18}$/;
  if (!phoneRegex.test(cleaned)) {
    return 'Please enter a valid phone number format (e.g., +91 9876543210)';
  }
  return null;
}

/**
 * Validates an alternate contact number.
 * Optional field, but if provided, must match phone standards.
 */
export function validateAlternateNumber(mobile?: string): string | null {
  if (!mobile || !mobile.trim()) {
    return null; // Optional
  }
  return validateMobileNumber(mobile, false);
}

/**
 * Validates an email address according to RFC 5322 standards.
 * - Optional, but if provided must be valid
 * - Max 100 characters
 */
export function validateEmail(email?: string, maxLength = 100): string | null {
  if (!email || !email.trim()) {
    return null; // Optional
  }
  const cleaned = email.trim();
  if (cleaned.length > maxLength) {
    return `Email address cannot exceed ${maxLength} characters`;
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    return 'Please enter a valid email address (e.g., name@example.com)';
  }
  return null;
}

/**
 * Validates project location / address string.
 * - Required (when isRequired=true)
 * - 3 to 150 characters
 * - Must contain meaningful text (at least one alphanumeric character)
 */
export function validateProjectLocation(
  location?: string,
  isRequired = true,
  minLength = 3,
  maxLength = 150
): string | null {
  if (!location || !location.trim()) {
    return isRequired ? 'Project location is required' : null;
  }
  const cleaned = location.trim();
  if (cleaned.length < minLength) {
    return `Project location must be at least ${minLength} characters long`;
  }
  if (cleaned.length > maxLength) {
    return `Project location cannot exceed ${maxLength} characters (currently ${cleaned.length})`;
  }
  if (!/[a-zA-Z0-9]/.test(cleaned)) {
    return 'Please enter a valid location name';
  }
  return null;
}

/**
 * Validates lead source selection against standard enum list.
 */
export function validateLeadSource(source?: string): string | null {
  if (!source || !source.trim()) {
    return 'Lead source is required';
  }
  if (!LEAD_SOURCES.includes(source as any)) {
    return 'Please select a valid lead source';
  }
  return null;
}

/**
 * Validates property type selection against standard enum list.
 */
export function validatePropertyType(type?: string): string | null {
  if (!type || !type.trim()) {
    return 'Property type is required';
  }
  if (!PROPERTY_TYPES.includes(type as any)) {
    return 'Please select a valid property type';
  }
  return null;
}

/**
 * Validates a required text field is non-empty.
 */
export function validateNonEmpty(value?: string, fieldName = 'This field'): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates a text field with custom length bounds.
 */
export function validateTextLength(
  value?: string,
  fieldName = 'This field',
  options: { required?: boolean; minLength?: number; maxLength?: number } = {}
): string | null {
  const { required = false, minLength = 0, maxLength = 500 } = options;
  if (!value || !value.trim()) {
    return required ? `${fieldName} is required` : null;
  }
  const cleaned = value.trim();
  if (minLength > 0 && cleaned.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  if (maxLength > 0 && cleaned.length > maxLength) {
    return `${fieldName} cannot exceed ${maxLength} characters (currently ${cleaned.length})`;
  }
  return null;
}

/**
 * Validates a strictly positive numeric field (> 0).
 */
export function validatePositiveNumber(value?: number | string, fieldName = 'Value'): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return `${fieldName} must be a positive number greater than 0`;
  }
  return null;
}

/**
 * Validates a non-negative numeric field (>= 0).
 */
export function validateNonNegativeNumber(value?: number | string, fieldName = 'Value'): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || num < 0) {
    return `${fieldName} cannot be negative`;
  }
  return null;
}

/**
 * Validates a required date string.
 */
export function validateRequiredDate(dateStr?: string, fieldName = 'Date'): string | null {
  if (!dateStr || !dateStr.trim()) {
    return `${fieldName} is required`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  return null;
}

/**
 * Returns local date-time string formatted for <input type="datetime-local" /> (YYYY-MM-DDTHH:mm).
 */
export function getMinDateTimeLocal(date = new Date()): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Validates a required date-time string and ensures it is in the future (not in the past).
 * Allows a 1-minute margin for form completion.
 */
export function validateFutureDate(dateStr?: string, fieldName = 'Date', allowMarginMinutes = 1): string | null {
  const reqErr = validateRequiredDate(dateStr, fieldName);
  if (reqErr) return reqErr;

  const d = new Date(dateStr!);
  const minAllowed = Date.now() - allowMarginMinutes * 60 * 1000;
  if (d.getTime() < minAllowed) {
    return `${fieldName} cannot be in the past`;
  }
  return null;
}


