// =============================================================================
// Sky-Lite Web — Shared Validation Helper Utilities for CRM Module
// =============================================================================

export interface ValidationErrors {
  [key: string]: string | null;
}

/**
 * Validates a lead/customer full name.
 * Must be at least 2 non-whitespace characters.
 */
/**
 * Validates a lead/customer full name.
 * Must contain at least 2 characters, only letters, spaces, dots, hyphens, and apostrophes.
 * CANNOT contain digits/numbers or special symbols.
 */
export function validateName(name?: string): string | null {
  if (!name || !name.trim()) {
    return 'Full name is required';
  }
  const cleaned = name.trim();
  if (cleaned.length < 2) {
    return 'Name must be at least 2 characters long';
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
 * Validates a mobile / phone number.
 * Must contain 10-15 digits (allowing optional leading + and space/hyphen separators).
 * CANNOT contain letters/alphabets.
 */
export function validateMobileNumber(mobile?: string): string | null {
  if (!mobile || !mobile.trim()) {
    return 'Mobile number is required';
  }
  const cleaned = mobile.trim();
  if (/[a-zA-Z]/.test(cleaned)) {
    return 'Mobile number cannot contain letters';
  }
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return 'Please enter a valid mobile number (10 to 15 digits)';
  }
  const phoneRegex = /^\+?[0-9\s-]{10,18}$/;
  if (!phoneRegex.test(cleaned)) {
    return 'Invalid phone number format';
  }
  return null;
}

/**
 * Validates an email address.
 * Optional field, but if provided, must match standard email format.
 */
export function validateEmail(email?: string): string | null {
  if (!email || !email.trim()) {
    return null; // Optional
  }
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return 'Please enter a valid email address';
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
