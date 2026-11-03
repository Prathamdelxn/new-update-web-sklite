import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Upper bound for quantity/cost/amount number inputs across the app.
// Comfortably covers any real project's scale while blocking values large
// enough to break number formatting and layout (e.g. 1e21+).
export const MAX_INPUT_VALUE = 999_999_999_999;

const UNITS = [
  { value: 1.0e12, suffix: 'T' },
  { value: 1.0e9, suffix: 'B' },
  { value: 1.0e6, suffix: 'M' },
  { value: 1.0e3, suffix: 'K' },
];

export function formatCompact(num: number): string {
  if (num == null || isNaN(num)) return '0';
  if (num === 0) return '0';

  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  if (absNum < 1000) return num.toString();

  for (const { value, suffix } of UNITS) {
    if (absNum >= value) {
      const quotient = absNum / value;
      if (quotient >= 1000) {
        return `${sign}999${suffix}+`;
      }
      return sign + quotient.toFixed(2).replace(/\.00$/, '') + suffix;
    }
  }

  return num.toString();
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

export function formatInternational(num: number, minDecimals: number = 0, maxDecimals: number = 2): string {
  if (num == null || isNaN(num)) return '0';
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

/**
 * Formats a number with standard Millions (M), Billions (B), Trillions (T):
 * - If number < threshold (default 1,000,000 / 1 Million):
 *     Formats with international commas (en-US, e.g. 1,500.00, 250,000)
 * - If number >= 1,000,000:
 *     Formats as Millions / Billions / Trillions
 *     e.g. 1,500,000 -> "1.50M" (or "1.50 Million" if fullWord is true)
 *     e.g. 2,312,341,230 -> "2.31B" (or "2.31 Billion")
 *     e.g. 54,108,784,878,487 -> "54.11T" (or "54.11 Trillion")
 */
export function formatMillionBillion(
  num: number,
  options?: {
    threshold?: number;
    decimals?: number;
    fullWord?: boolean;
  }
): string {
  if (num == null || isNaN(num)) return '0';
  if (num === 0) return '0';

  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  const threshold = options?.threshold ?? 1_000_000;
  const decimals = options?.decimals ?? 2;
  const fullWord = options?.fullWord ?? false;

  if (absNum < threshold) {
    return sign + formatInternational(absNum, 0, 2);
  }

  const scales = [
    { value: 1e12, short: 'T', long: 'Trillion' },
    { value: 1e9, short: 'B', long: 'Billion' },
    { value: 1e6, short: 'M', long: 'Million' },
  ];

  for (const { value, short, long } of scales) {
    if (absNum >= value) {
      const quotient = absNum / value;
      if (short === 'T' && quotient >= 1000) {
        return `${sign}>999T`;
      }
      const formattedQuotient = quotient.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      const suffix = fullWord ? ` ${long}` : short;
      return `${sign}${formattedQuotient}${suffix}`;
    }
  }

  return sign + formatInternational(absNum, 0, 2);
}

/**
 * Returns formatted smart currency with Millions / Billions representation,
 * plus exact formatted value for tooltips.
 */
export function formatSmartCurrency(
  num: number,
  currency: string = '$',
  options?: {
    threshold?: number;
    decimals?: number;
    fullWord?: boolean;
  }
): {
  display: string;
  exact: string;
  isLarge: boolean;
  compactText: string;
} {
  const symbol = currency || '$';
  const separator = symbol.length > 1 ? ' ' : '';
  const absNum = Math.abs(num || 0);
  const isLarge = absNum >= (options?.threshold ?? 1_000_000);
  const sign = (num || 0) < 0 ? '-' : '';

  const exactFormatted = `${sign}${symbol}${separator}${formatInternational(absNum, 2, 2)}`;
  const compactText = formatMillionBillion(num, options);
  const display = `${sign}${symbol}${separator}${compactText}`;

  return {
    display,
    exact: exactFormatted,
    isLarge,
    compactText,
  };
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
 * Parses any budget string or value (e.g. '₹5L - ₹10L', '5-10 Lakhs', '₹15,00,000', '1.5 Cr', 'QAR 50k - 100k', 1500000)
 * and returns the maximum numeric budget ceiling.
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
  if (
    lower === 'not specified' ||
    lower === 'pending' ||
    lower === 'not recorded' ||
    lower === 'n/a' ||
    lower === 'none'
  ) {
    return null;
  }

  const hasCroreOverall = /(?:\b|\d)\s*(?:cr|crore|crores)\b/i.test(str);
  const hasLakhOverall = /(?:\b|\d)\s*(?:l|lac|lakh|lacs|lakhs)\b/i.test(str);
  const hasMillionOverall = /(?:\b|\d)\s*(?:m|mn|million|millions)\b/i.test(str);
  const hasKOverall = /(?:\d\s*k\b|(?:\b|\d)\s*(?:thousand|thousands)\b|(?:^|\s)k\b)/i.test(str);

  const parts = str.split(/[-–—~]|(?:\bto\b)/i).map(p => p.trim()).filter(Boolean);
  const parsedValues: number[] = [];

  for (const part of parts) {
    const isCrore = /(?:\b|\d)\s*(?:cr|crore|crores)\b/i.test(part);
    const isLakh = /(?:\b|\d)\s*(?:l|lac|lakh|lacs|lakhs)\b/i.test(part);
    const isMillion = /(?:\b|\d)\s*(?:m|mn|million|millions)\b/i.test(part);
    const isK = /(?:\d\s*k\b|(?:\b|\d)\s*(?:thousand|thousands)\b|(?:^|\s)k\b)/i.test(part);

    const numMatch = part.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      if (!isNaN(num) && num > 0) {
        if (isCrore) {
          parsedValues.push(num * 10_000_000);
        } else if (isMillion) {
          parsedValues.push(num * 1_000_000);
        } else if (isLakh) {
          parsedValues.push(num * 100_000);
        } else if (isK) {
          parsedValues.push(num * 1_000);
        } else {
          if (num < 1000 && hasCroreOverall) {
            parsedValues.push(num * 10_000_000);
          } else if (num < 1000 && hasMillionOverall) {
            parsedValues.push(num * 1_000_000);
          } else if (num < 1000 && hasLakhOverall) {
            parsedValues.push(num * 100_000);
          } else if (num < 1000 && hasKOverall) {
            parsedValues.push(num * 1_000);
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


