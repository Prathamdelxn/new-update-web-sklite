'use client';

// =============================================================================
// Sky-Lite Web — Global Currency Hook
// Reactively consumes the organization's currency and formatting settings.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getInteriorUser } from '@/lib/interiorAuth';
import { formatCurrency as baseFormatCurrency, formatExactCurrency as baseFormatExactCurrency } from '@/lib/utils';
import { findCountry } from '@/services/country.service';

export interface CurrencyConfig {
  currencyCode: string;
  currencySymbol: string;
  country: string;
  timezone: string;
  dateFormat: string;
}

const DEFAULT_CURRENCY: CurrencyConfig = {
  currencyCode: 'INR',
  currencySymbol: '₹',
  country: 'India',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
};

const SYMBOL_MAP: Record<string, string> = {
  INR: '₹',
  AED: 'AED',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'SAR',
  QAR: 'QAR',
  OMR: 'OMR',
  KWD: 'KWD',
  BHD: 'BHD',
  SGD: 'S$',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
};

function getActiveCurrencyConfig(): CurrencyConfig {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;

  try {
    const rawOrg = localStorage.getItem('interiorOrganization');
    const rawUser = localStorage.getItem('interiorUser');

    let org = null;
    let user = null;

    if (rawOrg) {
      try { org = JSON.parse(rawOrg); } catch {}
    }
    if (rawUser) {
      try { user = JSON.parse(rawUser); } catch {}
    }

    const orgSettings = org?.settings || user?.organization?.settings || user?.settings;
    const orgAddress = org?.address || user?.organization?.address || user?.address;

    const code = (orgSettings?.currency || 'INR').toUpperCase();
    const countryName = orgAddress?.country || 'India';
    const matched = findCountry(countryName) || findCountry(code);
    const symbol = orgSettings?.currencySymbol || SYMBOL_MAP[code] || matched?.currencySymbol || (code === 'QAR' ? 'QAR' : '$');
    const timezone = orgSettings?.timezone || matched?.primaryTimezone || 'Asia/Kolkata';
    const dateFormat = orgSettings?.dateFormat || 'DD/MM/YYYY';

    if (code !== 'INR' || countryName !== 'India') {
      return {
        currencyCode: code,
        currencySymbol: symbol,
        country: countryName,
        timezone,
        dateFormat,
      };
    }
  } catch {}

  return DEFAULT_CURRENCY;
}

export function useCurrency() {
  const [config, setConfig] = useState<CurrencyConfig>(getActiveCurrencyConfig);

  const refreshCurrency = useCallback(() => {
    setConfig(getActiveCurrencyConfig());
  }, []);

  useEffect(() => {
    // Listen to custom organization update event
    const handleOrgUpdate = () => {
      refreshCurrency();
    };

    window.addEventListener('interior-org-updated', handleOrgUpdate);
    window.addEventListener('storage', handleOrgUpdate);

    return () => {
      window.removeEventListener('interior-org-updated', handleOrgUpdate);
      window.removeEventListener('storage', handleOrgUpdate);
    };
  }, [refreshCurrency]);

  const formatPrice = useCallback(
    (amount: number) => {
      return baseFormatCurrency(amount, config.currencySymbol);
    },
    [config.currencySymbol]
  );

  const formatExactPrice = useCallback(
    (amount: number) => {
      return baseFormatExactCurrency(amount, config.currencySymbol);
    },
    [config.currencySymbol]
  );

  return {
    ...config,
    formatCurrency: formatPrice,
    formatExactCurrency: formatExactPrice,
    refreshCurrency,
  };
}
