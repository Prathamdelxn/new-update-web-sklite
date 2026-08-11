import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Upper bound for quantity/cost/amount number inputs across the app.
// Comfortably covers any real project's scale while blocking values large
// enough to break number formatting and layout (e.g. 1e21+).
export const MAX_INPUT_VALUE = 999_999_999_999;

export function formatCompact(num: number): string {
  if (num == null || isNaN(num)) return '0';
  return Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
}

export function formatCurrency(num: number, currency: string = '$'): string {
  if (num == null || isNaN(num)) {
    const symbol = currency || '$';
    const separator = symbol.length > 1 ? ' ' : '';
    return `${symbol}${separator}0`;
  }
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const symbol = currency || '$';
  const separator = symbol.length > 1 ? ' ' : '';
  return `${isNegative ? '-' : ''}${symbol}${separator}${formatCompact(absNum)}`;
}

export function formatExact(num: number): string {
  if (num == null || isNaN(num)) return '0';
  return Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
}

export function formatExactCurrency(num: number, currency: string = '$'): string {
  if (num == null || isNaN(num)) {
    const symbol = currency || '$';
    const separator = symbol.length > 1 ? ' ' : '';
    return `${symbol}${separator}0`;
  }
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const symbol = currency || '$';
  const separator = symbol.length > 1 ? ' ' : '';
  return `${isNegative ? '-' : ''}${symbol}${separator}${formatExact(absNum)}`;
}

