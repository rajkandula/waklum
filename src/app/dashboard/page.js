"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  FolderKanban, CheckCircle2, Clock, AlertCircle, Plus, 
  TrendingUp, Users, Loader2 
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, isPast, isToday, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    tasksCompleted: 0,
    upcomingDeadlines: 0,
    overdueTasks: 0
  });
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (activeOrganization) {
      fetchActivities();
      fetchDashboardData();
      fetchAnalytics();
    } else if (!orgLoading) {
      setLoadingActivities(false);
      setLoadingMetrics(false);
      setLoadingAnalytics(false);
    }
  }, [activeOrganization, orgLoading]);

  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      const res = await fetch(`/api/activities?limit=5`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingMetrics(true);
      const [projRes, tasksRes] = await Promise.all([
        fetch(`/api/projects?orgId=${activeOrganization._id}`),
        fetch(`/api/tasks?orgId=${activeOrganization._id}`)
      ]);
      
      let activeProjCount = 0;
      if (projRes.ok) {
        const data = await projRes.json();
        activeProjCount = data.projects.filter(p => p.status === 'active').length;
      }
      
      let completed = 0;
      let upcomingCount = 0;
      let overdueCount = 0;
      let upcomingList = [];
      
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const tasks = data.tasks || [];
        
        tasks.forEach(t => {
          if (t.columnId === 'done') {
            completed++;
          } else if (t.dueDate) {
            const date = new Date(t.dueDate);
            if (isPast(date) && !isToday(date)) {
              overdueCount++;
            } else {
              upcomingCount++;
              upcomingList.push(t);
            }
          }
        });
        
        upcomingList.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        upcomingList = upcomingList.slice(0, 3);
      }
      
      setMetrics({
        activeProjects: activeProjCount,
        tasksCompleted: completed,
        upcomingDeadlines: upcomingCount,
        overdueTasks: overdueCount
      });
      setUpcomingTasks(upcomingList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch(`/api/organizations/${activeOrganization._id}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-900 border border-surface-700 p-3 rounded-lg shadow-xl">
          <p className="text-surface-100 font-medium mb-1">{label || payload[0].name}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  if (!activeOrganization && !orgLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <img src="/icon.svg" alt="Waklum" className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Welcome to Waklum</h2>
        <p className="text-surface-400 max-w-md mb-6">
          To get started, you need to create a workspace. This is where your team will collaborate on projects and tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-100">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-surface-400 mt-1">Here's what's happening with your projects today.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-400 mb-1">Active Projects</p>
                <h3 className="text-2xl font-bold text-surface-100">{loadingMetrics ? '-' : metrics.activeProjects}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-400 mb-1">Total Tasks</p>
                <h3 className="text-2xl font-bold text-surface-100">{analyticsData ? analyticsData.metrics.totalTasks : loadingMetrics ? '-' : metrics.tasksCompleted}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-400 mb-1">Completion Rate</p>
                <h3 className="text-2xl font-bold text-surface-100">{analyticsData ? `${analyticsData.metrics.completionRate}%` : '-'}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-400 mb-1">Active Members</p>
                <h3 className="text-2xl font-bold text-surface-100">{analyticsData ? analyticsData.metrics.activeMembers : '-'}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-400 mb-1">Upcoming</p>
                <h3 className="text-2xl font-bold text-surface-100">{loadingMetrics ? '-' : metrics.upcomingDeadlines}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-400 mb-1">Overdue</p>
                <h3 className="text-2xl font-bold text-surface-100">{loadingMetrics ? '-' : metrics.overdueTasks}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Charts Row */}
      {analyticsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Distribution Donut Chart */}
          <Card className="lg:col-span-1 bg-surface-900/50 border-surface-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task Status Distribution</CardTitle>
              <CardDescription>Overview of all tasks across projects.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.metrics.totalTasks === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-surface-500">
                  No tasks available
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.tasksByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {analyticsData.tasksByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Distribution Bar Chart */}
          <Card className="lg:col-span-2 bg-surface-900/50 border-surface-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Project Activity</CardTitle>
              <CardDescription>Total vs completed tasks per project.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.projectDistribution.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-surface-500">
                  No projects available
                </div>
              ) : (
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.projectDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="totalTasks" name="Total Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Bar dataKey="completedTasks" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading state for analytics */}
      {loadingAnalytics && !analyticsData && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-surface-400 mr-2" />
          <span className="text-surface-400 text-sm">Loading analytics...</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all your projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {loadingActivities ? (
                <div className="text-surface-400 text-sm">Loading activity feed...</div>
              ) : activities.length === 0 ? (
                <div className="text-surface-400 text-sm py-4">No recent activity found.</div>
              ) : (
                activities.map(activity => (
                  <div key={activity._id} className="flex items-start">
                    <Avatar className="h-9 w-9 ring-2 ring-surface-800">
                      <AvatarImage src={activity.actor?.avatar} />
                      <AvatarFallback className="bg-brand-500 text-white text-[10px]">
                        {activity.actor?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none text-surface-100">
                        {activity.actor?.name} {activity.action}
                      </p>
                      <p className="text-sm text-surface-400">
                        {activity.metadata?.details || `in project ${activity.project?.name}`}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-surface-500" title={new Date(activity.createdAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>My Upcoming Tasks</CardTitle>
            <CardDescription>Tasks assigned to you due soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingMetrics ? (
                <div className="text-surface-400 text-sm">Loading tasks...</div>
              ) : upcomingTasks.length === 0 ? (
                <div className="text-surface-400 text-sm py-4">No upcoming tasks. You're all caught up!</div>
              ) : (
                upcomingTasks.map(task => (
                  <Link href={`/dashboard/projects/${task.project?._id || ''}`} key={task._id}>
                    <div className="flex items-start gap-4 p-3 rounded-lg border border-surface-800 bg-surface-900/50 hover:bg-surface-800 transition-colors cursor-pointer mb-3">
                      <div className="mt-0.5 h-4 w-4 rounded-full border border-surface-500 shrink-0" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium leading-none text-surface-100 truncate">{task.title}</p>
                        <p className="text-xs text-surface-400 truncate">
                          {task.project?.name || 'Unknown Project'} • {isToday(new Date(task.dueDate)) ? 'Due Today' : `Due ${format(new Date(task.dueDate), 'MMM d')}`}
                        </p>
                      </div>
                      {task.priority && (
                        <div className={`flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase shrink-0 ${
                          task.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                          task.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                          task.priority === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-surface-800 text-surface-300'
                        }`}>
                          {task.priority}
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/tasks">View all tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
