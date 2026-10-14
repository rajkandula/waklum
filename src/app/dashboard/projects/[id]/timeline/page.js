"use client"

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Calendar as CalendarIcon, CheckCircle2, Circle } from 'lucide-react';
import { format, isPast, isToday, isFuture, parseISO } from 'date-fns';

export default function ProjectTimelinePage({ params }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
        // Filter out tasks without a due date and sort chronologically
        const sortedTasks = data.tasks
          .filter(t => t.dueDate)
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const getColumnName = (colId) => {
    if (!project) return colId;
    const col = project.columns.find(c => c.id === colId);
    return col ? col.name : colId;
  };

  const getDateStatus = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return { label: 'Today', color: 'text-brand-600', border: 'border-brand-500/50' };
    if (isPast(date)) return { label: 'Overdue', color: 'text-red-400', border: 'border-red-500/50' };
    if (isFuture(date)) return { label: 'Upcoming', color: 'text-surface-400', border: 'border-surface-700' };
    return { label: '', color: 'text-surface-400', border: 'border-surface-700' };
  };

  if (loading) {
    return <div className="p-6 text-surface-400 flex items-center justify-center h-full">Loading timeline...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-surface-100">Project Timeline</h2>
        <p className="text-surface-400 mt-1">Chronological view of all tasks with due dates.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-surface-800 rounded-xl bg-surface-900/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800 mb-4 text-brand-600">
            <CalendarIcon className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-surface-100 mb-2">No upcoming tasks</h3>
          <p className="text-surface-400 max-w-sm">
            Tasks with a due date will appear here in chronological order. Add due dates to your tasks to see them on the timeline.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-0">
          {/* Main vertical line for desktop */}
          <div className="hidden md:block absolute left-[120px] top-4 bottom-0 w-px bg-surface-800" />
          {/* Main vertical line for mobile */}
          <div className="md:hidden absolute left-0 top-4 bottom-0 w-px bg-surface-800" />

          <div className="space-y-12">
            {tasks.map((task, index) => {
              const status = getDateStatus(task.dueDate);
              
              return (
                <div key={task._id} className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-8 group">
                  {/* Date column (Desktop) */}
                  <div className="hidden md:flex flex-col items-end w-[100px] shrink-0 pt-2 text-right">
                    <span className={`text-sm font-semibold ${status.color}`}>
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                    <span className="text-xs text-surface-500 mt-0.5">
                      {status.label}
                    </span>
                  </div>

                  {/* Date indicator (Mobile) */}
                  <div className="md:hidden flex items-center gap-2 mb-2 text-sm font-medium">
                    <span className={status.color}>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                    <span className="text-surface-500 text-xs">({status.label})</span>
                  </div>

                  {/* Timeline Node */}
                  <div className={`absolute left-[-29px] md:left-[115px] top-3 md:top-2.5 h-3 w-3 rounded-full bg-surface-950 border-2 ${status.border} group-hover:bg-brand-500 group-hover:border-brand-500 transition-colors z-10`} />

                  {/* Task Card */}
                  <Card className="flex-1 overflow-hidden border-surface-800 bg-surface-900/50 hover:bg-surface-800/80 transition-colors">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-surface-500">
                          {task.columnId === 'done' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className={`text-base font-medium ${task.columnId === 'done' ? 'text-surface-400 line-through' : 'text-surface-100'}`}>
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-normal bg-surface-950">
                              {getColumnName(task.columnId)}
                            </Badge>
                            {task.priority && (
                              <Badge variant="outline" className="text-[10px] uppercase font-normal bg-surface-950 border-transparent">
                                Priority: <span className="ml-1 text-surface-100">{task.priority}</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                        {task.assignee ? (
                          <div className="flex items-center gap-2 text-sm text-surface-300">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="text-[10px] bg-brand-500 text-white">
                                {task.assignee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="hidden sm:inline-block">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-surface-500 italic">Unassigned</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
