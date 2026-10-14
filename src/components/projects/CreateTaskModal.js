"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { 
  Flag, Calendar, User, Tag, Clock, 
  Plus, X, ChevronDown, Sparkles
} from 'lucide-react';

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500', dot: 'bg-red-400' },
  { value: 'high', label: 'High', color: 'bg-orange-500', dot: 'bg-orange-400' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500', dot: 'bg-yellow-400' },
  { value: 'low', label: 'Low', color: 'bg-green-500', dot: 'bg-green-400' },
];

export default function CreateTaskModal({ isOpen, onClose, projectId, columnId, columns, onTaskCreated }) {
  const [members, setMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: null,
    dueDate: '',
    startDate: '',
    labels: [],
    estimatedHours: '',
    columnId: columnId || 'todo',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        assignee: null,
        dueDate: '',
        startDate: '',
        labels: [],
        estimatedHours: '',
        columnId: columnId || 'todo',
      });
      fetchMembers();
    }
  }, [isOpen, columnId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.project?.members || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        assignee: form.assignee?.user?._id || form.assignee?.user || undefined,
        dueDate: form.dueDate || undefined,
        startDate: form.startDate || undefined,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      };

      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onTaskCreated?.(data.task);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create task', err);
    }
    setSubmitting(false);
  };

  const addLabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && !form.labels.includes(trimmed)) {
      setForm({ ...form, labels: [...form.labels, trimmed] });
      setLabelInput('');
    }
  };

  const removeLabel = (label) => {
    setForm({ ...form, labels: form.labels.filter(l => l !== label) });
  };

  const selectedPriority = PRIORITIES.find(p => p.value === form.priority);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Create New Task
            </DialogTitle>
            <DialogDescription>
              Add a task to your project board with all the details your team needs.
            </DialogDescription>
          </DialogHeader>

          <div className="py-5 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-200">Task Title <span className="text-red-400">*</span></label>
              <Input
                autoFocus
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="text-base h-11"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-200">Description</label>
              <textarea
                placeholder="Add more details, acceptance criteria, or context..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="flex w-full rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2.5 text-sm text-foreground placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-900 resize-y min-h-[100px]"
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Column / Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ChevronDown className="h-3 w-3" /> Status
                </label>
                <select
                  value={form.columnId}
                  onChange={(e) => setForm({ ...form, columnId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {columns?.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  )) || (
                    <>
                      <option value="backlog">Backlog</option>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </>
                  )}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flag className="h-3 w-3" /> Priority
                </label>
                <button
                  type="button"
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedPriority?.dot}`} />
                    {selectedPriority?.label}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                </button>
                {showPriorityDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full z-50 border border-surface-700 bg-surface-900 rounded-md shadow-xl py-1">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => { setForm({ ...form, priority: p.value }); setShowPriorityDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-800 transition-colors ${form.priority === p.value ? 'text-brand-600' : 'text-surface-200'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignee */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Assignee
                </label>
                <button
                  type="button"
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {form.assignee ? (
                    <span className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={form.assignee.user?.avatar} />
                        <AvatarFallback className="text-[8px] bg-surface-700">{form.assignee.user?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{form.assignee.user?.name}</span>
                    </span>
                  ) : (
                    <span className="text-surface-500">Unassigned</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                </button>
                {showAssigneeDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full z-50 border border-surface-700 bg-surface-900 rounded-md shadow-xl py-1 max-h-40 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, assignee: null }); setShowAssigneeDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-surface-400 hover:bg-surface-800 transition-colors"
                    >
                      Unassigned
                    </button>
                    {members.map(m => (
                      <button
                        key={m.user?._id}
                        type="button"
                        onClick={() => { setForm({ ...form, assignee: m }); setShowAssigneeDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-800 transition-colors text-surface-200"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={m.user?.avatar} />
                          <AvatarFallback className="text-[8px] bg-surface-700">{m.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{m.user?.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Estimated Hours */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Estimate (hours)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 4"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                  className="h-10"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Start Date
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-10"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Due Date
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> Labels
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.labels.map(label => (
                  <span key={label} className="inline-flex items-center gap-1 text-xs bg-brand-500/10 text-brand-600 border border-brand-500/20 px-2 py-1 rounded-full">
                    {label}
                    <button type="button" onClick={() => removeLabel(label)} className="hover:text-red-400 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a label..."
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                  className="h-9 flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addLabel} disabled={!labelInput.trim()} className="h-9 px-3">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-surface-800 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !form.title.trim()}>
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
