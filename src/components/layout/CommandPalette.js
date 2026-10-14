"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, FolderKanban, CheckSquare, Users,
  ChartColumnIncreasing, Settings, CreditCard, LayoutDashboard, ArrowRight,
  Command, Hash, Loader2, FileText, X
} from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, href: '/dashboard', section: 'Navigate' },
  { id: 'projects', label: 'Go to Projects', icon: FolderKanban, href: '/dashboard/projects', section: 'Navigate' },
  { id: 'tasks', label: 'Go to My Tasks', icon: CheckSquare, href: '/dashboard/tasks', section: 'Navigate' },
  { id: 'team', label: 'Go to Team', icon: Users, href: '/dashboard/team', section: 'Navigate' },

  { id: 'settings', label: 'Account Settings', icon: Settings, href: '/dashboard/settings', section: 'Navigate' },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard, href: '/dashboard/billing', section: 'Navigate' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeout = useRef(null);
  const router = useRouter();

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSearchResults(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (query.trim().length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSearchResults(data.results);
      } catch {
        setSearchResults(null);
      }
      setSearching(false);
    }, 250);

    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  // Build flat item list for keyboard nav
  const getAllItems = useCallback(() => {
    const items = [];

    if (searchResults) {
      const { projects = [], tasks = [], members = [] } = searchResults;
      projects.forEach(p => items.push({ type: 'project', data: p, href: `/dashboard/projects/${p._id}` }));
      tasks.forEach(t => items.push({ type: 'task', data: t, href: `/dashboard/projects/${t.project?._id || t.project}` }));
      members.forEach(m => items.push({ type: 'member', data: m }));
    } else {
      const filtered = QUICK_ACTIONS.filter(a =>
        !query || a.label.toLowerCase().includes(query.toLowerCase())
      );
      filtered.forEach(a => items.push({ type: 'action', data: a, href: a.href }));
    }

    return items;
  }, [searchResults, query]);

  const items = getAllItems();

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item?.href) {
        router.push(item.href);
        setIsOpen(false);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(0);
  }, [query, searchResults]);

  const handleSelect = (item) => {
    if (item.href) {
      router.push(item.href);
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800">
          <Search className="h-5 w-5 text-surface-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, or type a command..."
            className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 text-sm outline-none"
          />
          {searching && <Loader2 className="h-4 w-4 text-surface-500 animate-spin shrink-0" />}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {items.length === 0 && query.length >= 2 && !searching ? (
            <div className="text-center py-10 px-4">
              <Search className="h-8 w-8 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">No results for &quot;{query}&quot;</p>
              <p className="text-surface-600 text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {/* Search Results Mode */}
              {searchResults ? (
                <>
                  {searchResults.projects?.length > 0 && (
                    <SectionHeader label="Projects" />
                  )}
                  {searchResults.projects?.map((p, i) => {
                    const itemIndex = i;
                    return (
                      <CommandItem
                        key={p._id}
                        active={activeIndex === itemIndex}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => handleSelect({ href: `/dashboard/projects/${p._id}` })}
                      >
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.color || '#3b82f6' }}>
                          <FolderKanban className="h-4 w-4 text-surface-100" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-surface-100 truncate">{p.name}</p>
                          <p className="text-xs text-surface-500 capitalize">{p.status}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-surface-600 opacity-0 group-hover:opacity-100" />
                      </CommandItem>
                    );
                  })}

                  {searchResults.tasks?.length > 0 && (
                    <SectionHeader label="Tasks" />
                  )}
                  {searchResults.tasks?.map((t, i) => {
                    const itemIndex = (searchResults.projects?.length || 0) + i;
                    return (
                      <CommandItem
                        key={t._id}
                        active={activeIndex === itemIndex}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => handleSelect({ href: `/dashboard/projects/${t.project?._id || t.project}` })}
                      >
                        <CheckSquare className="h-4 w-4 text-surface-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-surface-100 truncate">{t.title}</p>
                          <p className="text-xs text-surface-500">{t.project?.name} · {t.status}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                          t.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                          t.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-surface-800 text-surface-400'
                        }`}>
                          {t.priority}
                        </span>
                      </CommandItem>
                    );
                  })}

                  {searchResults.members?.length > 0 && (
                    <SectionHeader label="People" />
                  )}
                  {searchResults.members?.map((m, i) => {
                    const itemIndex = (searchResults.projects?.length || 0) + (searchResults.tasks?.length || 0) + i;
                    return (
                      <CommandItem
                        key={m._id}
                        active={activeIndex === itemIndex}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => {}}
                      >
                        <div className="h-8 w-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-medium text-surface-100 shrink-0 overflow-hidden">
                          {m.avatar ? <img src={m.avatar} className="h-8 w-8 rounded-full object-cover" alt="" /> : m.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-surface-100">{m.name}</p>
                          <p className="text-xs text-surface-500">@{m.username}</p>
                        </div>
                      </CommandItem>
                    );
                  })}
                </>
              ) : (
                /* Quick Actions Mode */
                <>
                  <SectionHeader label="Quick Actions" />
                  {items.map((item, i) => {
                    const action = item.data;
                    const Icon = action.icon;
                    return (
                      <CommandItem
                        key={action.id}
                        active={activeIndex === i}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => handleSelect(item)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-surface-400" />
                        </div>
                        <span className="text-sm text-surface-200 flex-1">{action.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-surface-600 opacity-0 group-hover:opacity-100" />
                      </CommandItem>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-surface-800 text-[11px] text-surface-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-surface-800 px-1 py-0.5 rounded font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-surface-800 px-1 py-0.5 rounded font-mono">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-surface-800 px-1 py-0.5 rounded font-mono">esc</kbd> close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
      {label}
    </div>
  );
}

function CommandItem({ children, active, onMouseEnter, onClick }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors group ${
        active ? 'bg-surface-800/80' : 'hover:bg-surface-800/40'
      }`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
