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

/**
 * Parses any budget string or value (e.g. '₹5L - ₹10L', '5-10 Lakhs', '₹15,00,000', '1.5 Cr', 1500000)
 * and returns the maximum numeric budget ceiling in standard currency units (INR).
 */
export function parseMaxBudget(budget: any): number | null {
  if (budget == null) return null;
  if (typeof budget === 'number') return budget > 0 ? budget : null;
  if (typeof budget === 'object' && budget.amount && typeof budget.amount === 'number') {
    return budget.amount > 0 ? budget.amount : null;
  }
  
  const str = String(budget).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (lower === 'not specified' || lower === 'pending' || lower === 'not recorded' || lower === 'n/a') {
    return null;
  }

  const hasCroreOverall = /cr(?:ore)?s?/i.test(str);
  const hasLakhOverall = /l(?:ac|akh)?s?/i.test(str);
  const hasKOverall = /\b(?:k|thousand)\b/i.test(str);

  const parts = str.split(/[-–—]|(?:\bto\b)/i).map(p => p.trim()).filter(Boolean);
  const parsedValues: number[] = [];

  for (const part of parts) {
    const isCrore = /cr(?:ore)?s?/i.test(part) || (hasCroreOverall && !/l(?:ac|akh)?s?/i.test(part));
    const isLakh = /l(?:ac|akh)?s?/i.test(part) || (hasLakhOverall && !/cr(?:ore)?s?/i.test(part));
    const isK = /\b(?:k|thousand)\b/i.test(part) || (hasKOverall && !isCrore && !isLakh);

    const numMatch = part.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      if (!isNaN(num) && num > 0) {
        if (isCrore) {
          parsedValues.push(num * 10_000_000);
        } else if (isLakh) {
          parsedValues.push(num * 100_000);
        } else if (isK) {
          parsedValues.push(num * 1_000);
        } else {
          if (num < 500 && hasCroreOverall) {
            parsedValues.push(num * 10_000_000);
          } else if (num < 500 && hasLakhOverall) {
            parsedValues.push(num * 100_000);
          } else {
            parsedValues.push(num);
          }
        }
      }
    }
  }

  if (parsedValues.length === 0) return null;
  return Math.max(...parsedValues);
}


