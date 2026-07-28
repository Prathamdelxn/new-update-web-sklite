'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Briefcase, AlertTriangle, ShieldAlert, FileText, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: 'project' | 'issue' | 'risk' | 'template';
  _id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const typeConfig = {
  project: { icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Project' },
  issue: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Issue' },
  risk: { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', label: 'Risk' },
  template: { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Template' },
};

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [projRes, templateRes] = await Promise.allSettled([
          api.get('/projects'),
          api.get('/templates'),
        ]);

        const q = query.toLowerCase();
        const matches: SearchResult[] = [];

        if (projRes.status === 'fulfilled') {
          projRes.value.data.forEach((p: any) => {
            if (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
              matches.push({ type: 'project', _id: p._id, title: p.name, subtitle: p.status, href: `/projects/${p._id}` });
            }
          });
        }

        if (templateRes.status === 'fulfilled') {
          templateRes.value.data.forEach((t: any) => {
            if (t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
              matches.push({ type: 'template', _id: t._id, title: t.name, subtitle: t.category, href: `/templates` });
            }
          });
        }

        setResults(matches.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center w-64 lg:w-80">
      <div className={cn(
        'w-full flex items-center bg-gray-50 border rounded-xl px-3 py-1.5 transition-all',
        open ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20'
      )}>
        {loading ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" /> : <Search className="w-4 h-4 text-slate-400 shrink-0" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search projects, templates..."
          className="bg-transparent border-none outline-none text-sm text-gray-900 px-2 w-full placeholder:text-slate-400"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="p-0.5 text-slate-400 hover:text-gray-900 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No results for "{query}"</p>
            </div>
          ) : (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{results.length} result{results.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {results.map(result => {
                  const cfg = typeConfig[result.type];
                  return (
                    <button
                      key={result._id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className={cn('p-2 rounded-lg shrink-0', cfg.bg)}>
                        <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
                        {result.subtitle && <p className="text-[10px] text-slate-500 truncate">{cfg.label} · {result.subtitle}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
