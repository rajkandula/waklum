"use client"

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, ChartColumnIncreasing, Users, Calendar, 
  TrendingUp, Activity, ArrowUpRight, Layers, Target
} from 'lucide-react';

export default function ProjectSummaryPage({ params }) {
  const unwrappedParams = React.use(params);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [unwrappedParams.id]);

  const fetchData = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${unwrappedParams.id}`),
        fetch(`/api/projects/${unwrappedParams.id}/tasks`),
      ]);
      if (projectRes.ok) {
        const pd = await projectRes.json();
        setProject(pd.project);
      }
      if (tasksRes.ok) {
        const td = await tasksRes.json();
        setTasks(td.tasks || td || []);
      }
    } catch (e) {
      console.error('Failed to fetch summary data', e);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog').length;
  const reviewTasks = tasks.filter(t => t.status === 'review').length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;

  // Recent tasks (last 5 updated)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 6);

  const statusColors = {
    backlog: { bg: 'bg-surface-700', text: 'text-surface-300', dot: 'bg-surface-400' },
    todo: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
    'in-progress': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    review: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
    done: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  };

  const priorityColors = {
    urgent: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-blue-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto -m-6 p-6 space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Total Tasks"
          value={totalTasks}
          iconColor="text-brand-600"
          iconBg="bg-brand-500/10"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={doneTasks}
          subtext={totalTasks > 0 ? `${completionPct}% done` : 'No tasks'}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="In Progress"
          value={inProgressTasks}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Overdue"
          value={overdueTasks}
          subtext={urgentTasks > 0 ? `${urgentTasks} urgent` : undefined}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Progress + Status Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Bar */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider">Project Progress</h3>
              <span className="text-2xl font-bold text-surface-100">{completionPct}%</span>
            </div>
            <div className="w-full h-3 bg-surface-800 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${completionPct}%`,
                  background: completionPct === 100 
                    ? 'linear-gradient(90deg, #10b981, #34d399)' 
                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                }}
              />
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <span className="text-surface-400">{doneTasks} of {totalTasks} tasks complete</span>
              {overdueTasks > 0 && (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {overdueTasks} overdue
                </span>
              )}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
            <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {[
                { key: 'backlog', label: 'Backlog', count: backlogTasks },
                { key: 'todo', label: 'To Do', count: todoTasks },
                { key: 'in-progress', label: 'In Progress', count: inProgressTasks },
                { key: 'review', label: 'Review', count: reviewTasks },
                { key: 'done', label: 'Done', count: doneTasks },
              ].map(item => {
                const pct = totalTasks > 0 ? (item.count / totalTasks) * 100 : 0;
                const colors = statusColors[item.key];
                return (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                    <span className="text-sm text-surface-300 w-24">{item.label}</span>
                    <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${colors.dot}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-surface-300 w-8 text-right">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
            <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider mb-4">Recent Tasks</h3>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-surface-400">No tasks yet. Create your first task on the Board tab.</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map(task => {
                  const sc = statusColors[task.status] || statusColors.todo;
                  return (
                    <div key={task._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-800/50 transition-colors group">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">{task.title}</p>
                        <p className="text-xs text-surface-500 capitalize">{task.status?.replace('-', ' ')}</p>
                      </div>
                      {task.priority && (
                        <span className={`text-xs font-medium capitalize ${priorityColors[task.priority] || 'text-surface-400'}`}>
                          {task.priority}
                        </span>
                      )}
                      {task.assignee && (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-brand-500/20 text-brand-600 text-xs font-medium shrink-0">
                          {(task.assignee.name || task.assignee.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      {task.dueDate && (
                        <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-400' : 'text-surface-500'}`}>
                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
            <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider mb-4">Project Details</h3>
            <div className="space-y-4">
              {project?.description && (
                <div>
                  <label className="text-xs text-surface-500 uppercase tracking-wider">Description</label>
                  <p className="text-sm text-surface-300 mt-1 leading-relaxed whitespace-pre-line">{project.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-surface-500 uppercase tracking-wider">Status</label>
                  <p className="text-sm text-surface-200 mt-1 capitalize">{project?.status || 'Active'}</p>
                </div>
                <div>
                  <label className="text-xs text-surface-500 uppercase tracking-wider">Visibility</label>
                  <p className="text-sm text-surface-200 mt-1 capitalize">{project?.visibility || 'Team'}</p>
                </div>
                <div>
                  <label className="text-xs text-surface-500 uppercase tracking-wider">Created</label>
                  <p className="text-sm text-surface-200 mt-1">
                    {project?.createdAt ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-surface-500 uppercase tracking-wider">Members</label>
                  <p className="text-sm text-surface-200 mt-1">{project?.members?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
            <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider mb-4">By Priority</h3>
            <div className="space-y-3">
              {[
                { key: 'urgent', label: 'Urgent', color: 'bg-red-400', count: tasks.filter(t => t.priority === 'urgent').length },
                { key: 'high', label: 'High', color: 'bg-orange-400', count: tasks.filter(t => t.priority === 'high').length },
                { key: 'medium', label: 'Medium', color: 'bg-yellow-400', count: tasks.filter(t => t.priority === 'medium').length },
                { key: 'low', label: 'Low', color: 'bg-blue-400', count: tasks.filter(t => t.priority === 'low').length },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-surface-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-surface-200">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-6">
            <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider mb-4">Team</h3>
            {project?.members?.length > 0 ? (
              <div className="space-y-3">
                {project.members.slice(0, 8).map((m, i) => {
                  const user = m.user || m;
                  const name = user.name || user.email || 'Unknown';
                  const memberTasks = tasks.filter(t => 
                    t.assignee?._id === user._id || t.assignee === user._id
                  ).length;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 border border-surface-700 text-sm font-medium text-white">
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">{name}</p>
                        <p className="text-xs text-surface-500 capitalize">{m.role || 'member'}</p>
                      </div>
                      {memberTasks > 0 && (
                        <span className="text-xs text-surface-400">{memberTasks} tasks</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-surface-400">No members yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, iconColor, iconBg }) {
  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-5 hover:border-surface-700 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-surface-100">{value}</p>
      <p className="text-sm text-surface-400 mt-0.5">{label}</p>
      {subtext && <p className="text-xs text-surface-500 mt-1">{subtext}</p>}
    </div>
  );
}
