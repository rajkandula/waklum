"use client"

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { format, isPast, isToday, isFuture, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Plus, Search, MessageSquare, Paperclip, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import TaskDetailModal from '@/components/projects/TaskDetailModal';
import CreateTaskModal from '@/components/projects/CreateTaskModal';
import TaskFilters from '@/components/projects/TaskFilters';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function ProjectListView() {
  const params = useParams();
  const projectId = params.id;
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [filters, setFilters] = useState({ status: [], priority: [], assignee: [], dueDate: null });
  const [sortBy, setSortBy] = useState('created-desc');

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const fetchProjectAndTasks = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`)
      ]);
      
      if (projRes.ok) {
        const data = await projRes.json();
        setProject(data.project);
      }
      
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t._id === taskId ? { ...t, columnId: newStatus, status: newStatus } : t));
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: newStatus })
      });
    } catch (err) {
      fetchProjectAndTasks();
    }
  };

  // Apply filters, search, and sort
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.labels?.some(l => l.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filters.status?.length > 0) {
      result = result.filter(t => filters.status.includes(t.status) || filters.status.includes(t.columnId));
    }

    // Priority filter
    if (filters.priority?.length > 0) {
      result = result.filter(t => filters.priority.includes(t.priority));
    }

    // Assignee filter
    if (filters.assignee?.length > 0) {
      result = result.filter(t => {
        const assigneeId = t.assignee?._id || t.assignee;
        if (filters.assignee.includes('unassigned')) {
          if (!assigneeId) return true;
        }
        return assigneeId && filters.assignee.includes(assigneeId);
      });
    }

    // Due date filter
    if (filters.dueDate) {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekStart = addWeeks(weekStart, 1);
      const nextWeekEnd = addWeeks(weekEnd, 1);

      result = result.filter(t => {
        if (!t.dueDate && filters.dueDate === 'no-date') return true;
        if (!t.dueDate) return false;
        
        const due = new Date(t.dueDate);
        switch (filters.dueDate) {
          case 'overdue': return isPast(due) && !isToday(due);
          case 'today': return isToday(due);
          case 'this-week': return due >= weekStart && due <= weekEnd;
          case 'next-week': return due >= nextWeekStart && due <= nextWeekEnd;
          case 'no-date': return false;
          default: return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'created-desc': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'created-asc': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'priority-desc': return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
        case 'priority-asc': return (PRIORITY_ORDER[b.priority] ?? 4) - (PRIORITY_ORDER[a.priority] ?? 4);
        case 'due-asc': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        case 'due-desc': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate) - new Date(a.dueDate);
        }
        case 'title-asc': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, filters, sortBy]);

  const priorityColors = {
    low: 'text-brand-600 bg-brand-500/10',
    medium: 'text-amber-400 bg-amber-500/10',
    high: 'text-orange-400 bg-orange-500/10',
    urgent: 'text-red-400 bg-red-500/10'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const getColumnName = (colId) => {
    if (!project) return colId;
    const col = project.columns.find(c => c.id === colId);
    return col ? col.name : colId;
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto pb-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
            <Input 
              type="text" 
              placeholder="Search tasks..." 
              className="pl-9 bg-surface-900 border-surface-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            members={project?.members || []}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
        <Button onClick={() => setIsNewTaskOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      {/* Task count summary */}
      <div className="flex items-center gap-2 mb-3 text-xs text-surface-500">
        <span>{processedTasks.length} task{processedTasks.length !== 1 ? 's' : ''}</span>
        {processedTasks.length !== tasks.length && (
          <span className="text-surface-600">of {tasks.length} total</span>
        )}
      </div>

      <Card className="flex-1 overflow-hidden border-surface-800 flex flex-col">
        <div className="grid grid-cols-12 gap-4 border-b border-surface-800 bg-surface-900/50 p-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
          <div className="col-span-6 md:col-span-5">Task Name</div>
          <div className="col-span-3 md:col-span-2 text-center">Status</div>
          <div className="hidden md:block md:col-span-2 text-center">Assignee</div>
          <div className="col-span-3 md:col-span-2 text-center">Due Date</div>
          <div className="hidden md:block md:col-span-1 text-right">Priority</div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {processedTasks.length === 0 ? (
            <div className="p-8 text-center text-surface-400">
              {tasks.length === 0 ? 'No tasks yet. Create one to get started.' : 'No tasks match your filters.'}
            </div>
          ) : (
            <div className="divide-y divide-surface-800">
              {processedTasks.map((task) => {
                const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'done';
                
                return (
                  <div 
                    key={task._id} 
                    className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-surface-800/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task._id, task.columnId); }}
                        className="text-surface-500 hover:text-green-500 transition-colors shrink-0"
                      >
                        {task.columnId === 'done' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <p className={`text-sm font-medium transition-all ${task.columnId === 'done' ? 'text-surface-400 line-through' : 'text-surface-100'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex items-center gap-1">
                              {task.labels.map(l => (
                                <span key={l} className="bg-surface-800 px-1.5 py-0.5 rounded text-[10px]">{l}</span>
                              ))}
                            </div>
                          )}
                          {task.subtasks?.length > 0 && (
                            <span className="text-[10px]">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-3 md:col-span-2 flex justify-center">
                      <Badge variant="outline" className="capitalize text-xs font-normal border-surface-700 bg-surface-900">
                        {getColumnName(task.columnId)}
                      </Badge>
                    </div>
                    
                    <div className="hidden md:flex md:col-span-2 justify-center">
                      {task.assignee ? (
                        <Avatar className="h-7 w-7 ring-2 ring-surface-800">
                          <AvatarImage src={task.assignee.avatar} />
                          <AvatarFallback className="text-[10px] bg-brand-500 text-white">
                            {task.assignee.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-7 w-7 rounded-full border border-dashed border-surface-600 flex items-center justify-center bg-surface-900" title="Unassigned">
                          <span className="text-surface-500 text-xs">?</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`col-span-3 md:col-span-2 text-center text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-surface-400'}`}>
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '-'}
                      {isOverdue && <span className="text-[10px] ml-1">⚠</span>}
                    </div>
                    
                    <div className="hidden md:flex md:col-span-1 justify-end">
                      {task.priority ? (
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      ) : (
                        <span className="text-surface-500">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTask?._id}
        projectId={projectId}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={fetchProjectAndTasks}
        projectMembers={project?.members || []}
        columns={project?.columns || []}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        projectId={projectId}
        columnId="todo"
        projectMembers={project?.members || []}
        onTaskCreated={fetchProjectAndTasks}
      />
    </div>
  );
}
