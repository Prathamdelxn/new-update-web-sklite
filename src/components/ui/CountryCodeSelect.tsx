'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, ChevronDown, X } from 'lucide-react';
import { CountryInfo } from '@/services/country.service';

interface CountryCodeSelectProps {
  countries: CountryInfo[];
  value: string; // cca2 e.g. "IN"
  onChange: (countryCode: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CountryCodeSelect({
  countries,
  value,
  onChange,
  className = '',
  disabled = false,
}: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(() => {
    return countries.find((c) => c.cca2 === value) || countries[0];
  }, [countries, value]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.trim().toLowerCase().replace(/^\+/, '');
    return countries.filter((c) => {
      const cleanPhone = c.phoneCode.replace(/^\+/, '');
      return (
        c.name.toLowerCase().includes(q) ||
        c.cca2.toLowerCase().includes(q) ||
        c.cca3.toLowerCase().includes(q) ||
        cleanPhone.includes(q)
      );
    });
  }, [countries, search]);

  // Check position to open upwards if close to bottom of screen
  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 260px space below, open upwards
      setOpenUpwards(spaceBelow < 260);
    }
    setIsOpen(!isOpen);
  };

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className="flex h-8.5 w-full items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="text-sm">{selectedCountry?.flag || '🌐'}</span>
          <span className="font-semibold text-slate-900">{selectedCountry?.phoneCode || '+91'}</span>
        </span>
        <ChevronDown className={`size-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Popover Dropdown with Smart Positioning */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 ${
            openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code (+91)..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Countries List */}
          <div className="max-h-48 overflow-y-auto overscroll-contain space-y-0.5 scrollbar-thin">
            {filteredCountries.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching countries found
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.cca2 === value;
                return (
                  <button
                    key={c.cca2}
                    type="button"
                    onClick={() => {
                      onChange(c.cca2);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? 'bg-blue-50 font-semibold text-blue-600'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-sm">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono font-medium text-slate-500">
                        {c.phoneCode}
                      </span>
                      {isSelected && <Check className="size-3.5 text-blue-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
