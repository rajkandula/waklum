"use client"

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar as CalendarIcon, CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Link from 'next/link';
import TaskDetailModal from '@/components/projects/TaskDetailModal';

export default function MyTasksPage() {
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    if (activeOrganization) {
      fetchMyTasks();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [activeOrganization, orgLoading]);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?orgId=${activeOrganization._id}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    // Optimistic update
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    setTasks(tasks.map(t => t._id === taskId ? { ...t, columnId: newStatus } : t));
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: newStatus })
      });
    } catch (err) {
      // Revert on failure
      fetchMyTasks();
    }
  };

  const priorityColors = {
    low: 'text-brand-600 bg-brand-500/10',
    medium: 'text-amber-400 bg-amber-500/10',
    high: 'text-orange-400 bg-orange-500/10',
    urgent: 'text-red-400 bg-red-500/10'
  };

  if (orgLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center"><CheckCircle2 className="h-12 w-12 text-surface-600" /></div>
          <h2 className="text-xl font-semibold text-surface-100">No Workspace Selected</h2>
          <p className="text-surface-400">Please select or create a workspace to view your tasks.</p>
        </div>
      </div>
    );
  }

  // Group tasks
  const overdueTasks = tasks.filter(t => t.columnId !== 'done' && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  const todayTasks = tasks.filter(t => t.columnId !== 'done' && t.dueDate && isToday(new Date(t.dueDate)));
  const upcomingTasks = tasks.filter(t => t.columnId !== 'done' && t.dueDate && !isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  const noDateTasks = tasks.filter(t => t.columnId !== 'done' && !t.dueDate);
  const completedTasks = tasks.filter(t => t.columnId === 'done');

  const TaskItem = ({ task }) => (
    <div 
      className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-surface-800/50 transition-colors group cursor-pointer"
      onClick={() => setSelectedTaskId(task._id)}
    >
      <div className="col-span-8 md:col-span-6 flex items-center gap-3">
        <button 
          onClick={(e) => { e.preventDefault(); toggleTaskCompletion(task._id, task.columnId); }}
          className="text-surface-500 hover:text-green-500 transition-colors shrink-0"
        >
          {task.columnId === 'done' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate transition-all ${task.columnId === 'done' ? 'text-surface-400 line-through' : 'text-surface-100'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Link href={`/dashboard/projects/${task.project?._id}`} className="text-xs text-surface-400 hover:text-brand-500 truncate flex items-center gap-1.5">
              <span 
                className="w-2 h-2 rounded-full inline-block shrink-0" 
                style={{ backgroundColor: task.project?.color || '#3b82f6' }}
              />
              {task.project?.name || 'Unknown Project'}
            </Link>
          </div>
        </div>
      </div>
      
      <div className="hidden md:flex md:col-span-3 justify-center">
        {task.dueDate ? (
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className={isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.columnId !== 'done' ? 'text-red-400 font-medium' : ''}>
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          </div>
        ) : (
          <span className="text-xs text-surface-600">-</span>
        )}
      </div>
      
      <div className="col-span-4 md:col-span-3 flex justify-end">
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

  const TaskSection = ({ title, tasks, icon: Icon, colorClass }) => {
    if (tasks.length === 0) return null;
    return (
      <div className="space-y-3 mb-8">
        <h3 className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${colorClass}`}>
          {Icon && <Icon className="h-4 w-4" />}
          {title} <span className="bg-surface-800 text-surface-300 px-1.5 py-0.5 rounded text-[10px]">{tasks.length}</span>
        </h3>
        <Card className="overflow-hidden border-surface-800 flex flex-col bg-surface-900/50">
          <div className="divide-y divide-surface-800/50">
            {tasks.map(task => <TaskItem key={task._id} task={task} />)}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-surface-100">My Tasks</h2>
        <p className="text-surface-400 mt-2">All tasks assigned to you across {activeOrganization.name}.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-surface-800 rounded-xl bg-surface-900/50 mt-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800 mb-4 text-brand-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-surface-100 mb-2">You're all caught up!</h3>
          <p className="text-surface-400 max-w-sm">
            You don't have any tasks assigned to you in this workspace yet.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <TaskSection title="Overdue" tasks={overdueTasks} icon={AlertCircle} colorClass="text-red-400" />
          <TaskSection title="Due Today" tasks={todayTasks} icon={CalendarIcon} colorClass="text-brand-600" />
          <TaskSection title="Upcoming" tasks={upcomingTasks} colorClass="text-surface-200" />
          <TaskSection title="No Due Date" tasks={noDateTasks} colorClass="text-surface-400" />
          <TaskSection title="Completed" tasks={completedTasks} icon={CheckCircle2} colorClass="text-green-500" />
        </div>
      )}

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={(updated) => {
          setTasks(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
        }}
      />
    </div>
  );
}
