// =============================================================================
// Sky-Lite Web — Country & Currency Service
// Reliable ISO dial codes, currencies, symbols, and timezones for 250+ countries.
// =============================================================================

import localCountriesData from '@/data/countries.json';

export interface CountryInfo {
  name: string;
  cca2: string;            // ISO 2-letter code (e.g. "IN", "AE", "US")
  cca3: string;            // ISO 3-letter code (e.g. "IND", "ARE", "USA")
  phoneCode: string;       // Calling code (e.g. "+91", "+971", "+1", "+44")
  flag: string;            // Emoji flag (e.g. "🇮🇳", "🇦🇪", "🇺🇸")
  currencyCode: string;    // e.g. "INR", "AED", "USD", "EUR", "GBP", "SAR"
  currencyName: string;    // e.g. "Indian Rupee", "UAE Dirham", "US Dollar"
  currencySymbol: string;  // e.g. "₹", "AED", "$", "€", "£", "﷼"
  timezones: string[];
  primaryTimezone: string;
}

export const PRIORITY_COUNTRY_CODES = ['IN', 'AE', 'US', 'GB', 'SA', 'DE', 'SG', 'CA', 'AU', 'QA'];

// Complete dial code & timezone dictionary for accurate lookups
const COUNTRY_DIAL_CODES: Record<string, { phoneCode: string; timezone: string; symbol?: string }> = {
  IN: { phoneCode: '+91', timezone: 'Asia/Kolkata', symbol: '₹' },
  AE: { phoneCode: '+971', timezone: 'Asia/Dubai', symbol: 'AED' },
  US: { phoneCode: '+1', timezone: 'America/New_York', symbol: '$' },
  GB: { phoneCode: '+44', timezone: 'Europe/London', symbol: '£' },
  SA: { phoneCode: '+966', timezone: 'Asia/Riyadh', symbol: 'SAR' },
  QA: { phoneCode: '+974', timezone: 'Asia/Qatar', symbol: 'QAR' },
  OM: { phoneCode: '+968', timezone: 'Asia/Muscat', symbol: 'OMR' },
  KW: { phoneCode: '+965', timezone: 'Asia/Kuwait', symbol: 'KWD' },
  BH: { phoneCode: '+973', timezone: 'Asia/Bahrain', symbol: 'BHD' },
  SG: { phoneCode: '+65', timezone: 'Asia/Singapore', symbol: 'S$' },
  CA: { phoneCode: '+1', timezone: 'America/Toronto', symbol: 'C$' },
  AU: { phoneCode: '+61', timezone: 'Australia/Sydney', symbol: 'A$' },
  DE: { phoneCode: '+49', timezone: 'Europe/Berlin', symbol: '€' },
  FR: { phoneCode: '+33', timezone: 'Europe/Paris', symbol: '€' },
  IT: { phoneCode: '+39', timezone: 'Europe/Rome', symbol: '€' },
  ES: { phoneCode: '+34', timezone: 'Europe/Madrid', symbol: '€' },
  NL: { phoneCode: '+31', timezone: 'Europe/Amsterdam', symbol: '€' },
  NZ: { phoneCode: '+64', timezone: 'Pacific/Auckland', symbol: 'NZ$' },
  MY: { phoneCode: '+60', timezone: 'Asia/Kuala_Lumpur', symbol: 'RM' },
  ID: { phoneCode: '+62', timezone: 'Asia/Jakarta', symbol: 'Rp' },
  TH: { phoneCode: '+66', timezone: 'Asia/Bangkok', symbol: '฿' },
  VN: { phoneCode: '+84', timezone: 'Asia/Ho_Chi_Minh', symbol: '₫' },
  PH: { phoneCode: '+63', timezone: 'Asia/Manila', symbol: '₱' },
  JP: { phoneCode: '+81', timezone: 'Asia/Tokyo', symbol: '¥' },
  KR: { phoneCode: '+82', timezone: 'Asia/Seoul', symbol: '₩' },
  CN: { phoneCode: '+86', timezone: 'Asia/Shanghai', symbol: '¥' },
  HK: { phoneCode: '+852', timezone: 'Asia/Hong_Kong', symbol: 'HK$' },
  TW: { phoneCode: '+886', timezone: 'Asia/Taipei', symbol: 'NT$' },
  BD: { phoneCode: '+880', timezone: 'Asia/Dhaka', symbol: '৳' },
  PK: { phoneCode: '+92', timezone: 'Asia/Karachi', symbol: '₨' },
  LK: { phoneCode: '+94', timezone: 'Asia/Colombo', symbol: 'Rs' },
  NP: { phoneCode: '+977', timezone: 'Asia/Kathmandu', symbol: '₨' },
  EG: { phoneCode: '+20', timezone: 'Africa/Cairo', symbol: 'EGP' },
  ZA: { phoneCode: '+27', timezone: 'Africa/Johannesburg', symbol: 'R' },
  NG: { phoneCode: '+234', timezone: 'Africa/Lagos', symbol: '₦' },
  KE: { phoneCode: '+254', timezone: 'Africa/Nairobi', symbol: 'KSh' },
  BR: { phoneCode: '+55', timezone: 'America/Sao_Paulo', symbol: 'R$' },
  MX: { phoneCode: '+52', timezone: 'America/Mexico_City', symbol: '$' },
  AR: { phoneCode: '+54', timezone: 'America/Argentina/Buenos_Aires', symbol: '$' },
  CL: { phoneCode: '+56', timezone: 'America/Santiago', symbol: '$' },
  CO: { phoneCode: '+57', timezone: 'America/Bogota', symbol: '$' },
  PE: { phoneCode: '+51', timezone: 'America/Lima', symbol: 'S/' },
  CH: { phoneCode: '+41', timezone: 'Europe/Zurich', symbol: 'CHF' },
  SE: { phoneCode: '+46', timezone: 'Europe/Stockholm', symbol: 'kr' },
  NO: { phoneCode: '+47', timezone: 'Europe/Oslo', symbol: 'kr' },
  DK: { phoneCode: '+45', timezone: 'Europe/Copenhagen', symbol: 'kr' },
  FI: { phoneCode: '+358', timezone: 'Europe/Helsinki', symbol: '€' },
  PL: { phoneCode: '+48', timezone: 'Europe/Warsaw', symbol: 'zł' },
  TR: { phoneCode: '+90', timezone: 'Europe/Istanbul', symbol: '₺' },
  RU: { phoneCode: '+7', timezone: 'Europe/Moscow', symbol: '₽' },
  IL: { phoneCode: '+972', timezone: 'Asia/Jerusalem', symbol: '₪' },
  JO: { phoneCode: '+962', timezone: 'Asia/Amman', symbol: 'JOD' },
  LB: { phoneCode: '+961', timezone: 'Asia/Beirut', symbol: 'LBP' },
  IE: { phoneCode: '+353', timezone: 'Europe/Dublin', symbol: '€' },
  PT: { phoneCode: '+351', timezone: 'Europe/Lisbon', symbol: '€' },
  GR: { phoneCode: '+30', timezone: 'Europe/Athens', symbol: '€' },
  BE: { phoneCode: '+32', timezone: 'Europe/Brussels', symbol: '€' },
  AT: { phoneCode: '+43', timezone: 'Europe/Vienna', symbol: '€' },
};

// In-memory cache for countries list
let cachedCountries: CountryInfo[] | null = null;

function normalizeLocalDataset(): CountryInfo[] {
  return (localCountriesData as any[]).map((c) => {
    const meta = COUNTRY_DIAL_CODES[c.cca2] || {};
    const phoneCode = c.phoneCode
      ? (c.phoneCode.startsWith('+') ? c.phoneCode : `+${c.phoneCode}`)
      : (meta.phoneCode || '+1');

    return {
      name: c.name || '',
      cca2: c.cca2 || '',
      cca3: c.cca3 || c.cca2 || '',
      phoneCode,
      flag: c.flag || '🌐',
      currencyCode: c.currencyCode || 'USD',
      currencyName: c.currencyName || 'US Dollar',
      currencySymbol: meta.symbol || c.currencySymbol || '$',
      timezones: [meta.timezone || 'UTC'],
      primaryTimezone: meta.timezone || 'UTC',
    };
  });
}

export async function fetchGlobalCountries(): Promise<CountryInfo[]> {
  if (cachedCountries && cachedCountries.length > 0) {
    return cachedCountries;
  }

  try {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,currencies,flag,idd,timezones', {
      next: { revalidate: 86400 },
    });

    if (!res.ok) throw new Error('Failed to fetch from API');

    const data = await res.json();
    const parsed: CountryInfo[] = data
      .filter((c: any) => c?.name?.common && c?.cca2)
      .map((c: any) => {
        const currencyKey = c.currencies ? Object.keys(c.currencies)[0] : '';
        const currency = currencyKey ? c.currencies[currencyKey] : null;

        const root = c.idd?.root || '';
        const suffixes = c.idd?.suffixes || [];
        const phoneCode = suffixes.length === 1 ? `${root}${suffixes[0]}` : root || COUNTRY_DIAL_CODES[c.cca2]?.phoneCode || '+1';

        const meta = COUNTRY_DIAL_CODES[c.cca2];
        const timezones = Array.isArray(c.timezones) && c.timezones.length > 0 ? c.timezones : [meta?.timezone || 'UTC'];
        const primaryTimezone = meta?.timezone || timezones[0] || 'UTC';

        return {
          name: c.name.common,
          cca2: c.cca2,
          cca3: c.cca3 || c.cca2,
          phoneCode,
          flag: c.flag || '🌐',
          currencyCode: currencyKey || 'USD',
          currencyName: currency?.name || 'US Dollar',
          currencySymbol: meta?.symbol || currency?.symbol || '$',
          timezones,
          primaryTimezone,
        };
      });

    // Sort India & UAE first, then all alphabetically
    parsed.sort((a, b) => {
      if (a.cca2 === 'IN') return -1;
      if (b.cca2 === 'IN') return 1;
      if (a.cca2 === 'AE') return -1;
      if (b.cca2 === 'AE') return 1;
      return a.name.localeCompare(b.name);
    });

    cachedCountries = parsed;
    return parsed;
  } catch {
    const local = normalizeLocalDataset();
    local.sort((a, b) => {
      if (a.cca2 === 'IN') return -1;
      if (b.cca2 === 'IN') return 1;
      if (a.cca2 === 'AE') return -1;
      if (b.cca2 === 'AE') return 1;
      return a.name.localeCompare(b.name);
    });
    cachedCountries = local;
    return local;
  }
}

export function getLocalCountries(): CountryInfo[] {
  if (cachedCountries && cachedCountries.length > 0) return cachedCountries;
  const local = normalizeLocalDataset();
  local.sort((a, b) => {
    if (a.cca2 === 'IN') return -1;
    if (b.cca2 === 'IN') return 1;
    if (a.cca2 === 'AE') return -1;
    if (b.cca2 === 'AE') return 1;
    return a.name.localeCompare(b.name);
  });
  cachedCountries = local;
  return local;
}

export function findCountry(query: string, countriesList?: CountryInfo[]): CountryInfo | null {
  if (!query) return null;
  const list = countriesList || getLocalCountries();
  const q = query.trim().toLowerCase();
  return (
    list.find(
      (c) =>
        c.cca2.toLowerCase() === q ||
        c.cca3.toLowerCase() === q ||
        c.name.toLowerCase() === q ||
        c.name.toLowerCase().includes(q)
    ) || null
  );
}
