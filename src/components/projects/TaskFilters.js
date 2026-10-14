"use client"

import { useState, useRef, useEffect } from 'react';
import { Filter, X, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', color: 'bg-surface-600' },
  { value: 'todo', label: 'To Do', color: 'bg-blue-500' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-purple-500' },
  { value: 'review', label: 'Review', color: 'bg-yellow-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-green-400' },
];

const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Newest First' },
  { value: 'created-asc', label: 'Oldest First' },
  { value: 'priority-desc', label: 'Priority: High → Low' },
  { value: 'priority-asc', label: 'Priority: Low → High' },
  { value: 'due-asc', label: 'Due Date: Soonest' },
  { value: 'due-desc', label: 'Due Date: Latest' },
  { value: 'title-asc', label: 'Title: A → Z' },
];

const DUE_DATE_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
  { value: 'no-date', label: 'No Due Date' },
];

export default function TaskFilters({ filters, onFiltersChange, members = [], sortBy, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  const activeFilterCount = 
    (filters.status?.length || 0) + 
    (filters.priority?.length || 0) + 
    (filters.assignee?.length || 0) +
    (filters.dueDate ? 1 : 0);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setIsOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  const setFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  const clearAll = () => {
    onFiltersChange({ status: [], priority: [], assignee: [], dueDate: null });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Filter Button */}
      <div ref={filterRef} className="relative">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`border-surface-800 gap-1.5 ${activeFilterCount > 0 ? 'border-brand-500/50 text-brand-600' : ''}`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-0.5 h-5 w-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-surface-900 border border-surface-700 rounded-xl shadow-elevation-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
              <h4 className="text-sm font-semibold text-surface-100">Filters</h4>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-xs text-brand-600 hover:text-brand-500 font-medium">
                  Clear all
                </button>
              )}
            </div>

            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {/* Status */}
              <FilterSection label="Status">
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(opt => {
                    const active = (filters.status || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleArrayFilter('status', opt.value)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                          active
                            ? 'bg-brand-500/15 text-brand-600 ring-1 ring-brand-500/30'
                            : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${opt.color}`} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Priority */}
              <FilterSection label="Priority">
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map(opt => {
                    const active = (filters.priority || []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleArrayFilter('priority', opt.value)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                          active
                            ? 'bg-brand-500/15 text-brand-600 ring-1 ring-brand-500/30'
                            : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Due Date */}
              <FilterSection label="Due Date">
                <div className="flex flex-wrap gap-1.5">
                  {DUE_DATE_OPTIONS.map(opt => {
                    const active = filters.dueDate === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFilter('dueDate', opt.value)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                          active
                            ? 'bg-brand-500/15 text-brand-600 ring-1 ring-brand-500/30'
                            : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Assignee */}
              {members.length > 0 && (
                <FilterSection label="Assignee">
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {members.map(m => {
                      const user = m.user || m;
                      const userId = user._id || user;
                      const active = (filters.assignee || []).includes(userId);
                      return (
                        <button
                          key={userId}
                          onClick={() => toggleArrayFilter('assignee', userId)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            active ? 'bg-brand-500/10 text-brand-600' : 'text-surface-400 hover:bg-surface-800'
                          }`}
                        >
                          <div className="h-5 w-5 rounded-full bg-surface-700 flex items-center justify-center text-[9px] font-medium text-surface-100 shrink-0 overflow-hidden">
                            {user.avatar ? <img src={user.avatar} className="h-5 w-5 rounded-full object-cover" alt="" /> : (user.name?.[0] || '?')}
                          </div>
                          <span className="flex-1 truncate">{user.name || 'Unknown'}</span>
                          {active && <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => toggleArrayFilter('assignee', 'unassigned')}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        (filters.assignee || []).includes('unassigned') ? 'bg-brand-500/10 text-brand-600' : 'text-surface-400 hover:bg-surface-800'
                      }`}
                    >
                      <div className="h-5 w-5 rounded-full border border-dashed border-surface-600 flex items-center justify-center text-[9px] text-surface-500 shrink-0">?</div>
                      <span className="flex-1">Unassigned</span>
                      {(filters.assignee || []).includes('unassigned') && <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
                    </button>
                  </div>
                </FilterSection>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sort Button */}
      <div ref={sortRef} className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSortOpen(!isSortOpen)}
          className="border-surface-800 gap-1.5"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort
        </Button>

        {isSortOpen && (
          <div className="absolute left-0 top-full mt-2 w-52 bg-surface-900 border border-surface-700 rounded-xl shadow-elevation-3 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onSortChange(opt.value); setIsSortOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                  sortBy === opt.value ? 'text-brand-600 bg-brand-500/5' : 'text-surface-300 hover:bg-surface-800'
                }`}
              >
                {opt.label}
                {sortBy === opt.value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 ml-1">
          {(filters.status || []).map(s => (
            <Badge key={s} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5 capitalize">
              {s.replace('-', ' ')}
              <button onClick={() => toggleArrayFilter('status', s)} className="hover:text-surface-100"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {(filters.priority || []).map(p => (
            <Badge key={p} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5 capitalize">
              {p}
              <button onClick={() => toggleArrayFilter('priority', p)} className="hover:text-surface-100"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filters.dueDate && (
            <Badge variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5">
              {DUE_DATE_OPTIONS.find(o => o.value === filters.dueDate)?.label}
              <button onClick={() => setFilter('dueDate', null)} className="hover:text-surface-100"><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSection({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
        {label}
      </label>
      {children}
    </div>
  );
}
