"use client"

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { LayoutDashboard, CheckSquare, TrendingUp, Users, Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeOrganization) {
      fetchAnalytics();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [activeOrganization, orgLoading]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${activeOrganization._id}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
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
          <div className="flex justify-center"><LayoutDashboard className="h-12 w-12 text-surface-600" /></div>
          <h2 className="text-xl font-semibold text-surface-100">No Workspace Selected</h2>
          <p className="text-surface-400">Please select or create a workspace to view analytics.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, tasksByStatus, projectDistribution } = data;

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-surface-100">Workspace Analytics</h2>
        <p className="text-surface-400 mt-2">Data and insights for {activeOrganization.name}.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface-900/50 border-surface-800 hover:border-surface-700 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-400 mb-1">Total Projects</p>
                <h3 className="text-3xl font-bold text-surface-100">{metrics.totalProjects}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                <LayoutDashboard className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-900/50 border-surface-800 hover:border-surface-700 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-400 mb-1">Total Tasks</p>
                <h3 className="text-3xl font-bold text-surface-100">{metrics.totalTasks}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <CheckSquare className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-900/50 border-surface-800 hover:border-surface-700 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-400 mb-1">Completion Rate</p>
                <h3 className="text-3xl font-bold text-surface-100">{metrics.completionRate}%</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-900/50 border-surface-800 hover:border-surface-700 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-400 mb-1">Active Members</p>
                <h3 className="text-3xl font-bold text-surface-100">{metrics.activeMembers}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Distribution Donut Chart */}
        <Card className="lg:col-span-1 bg-surface-900/50 border-surface-800">
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Overview of all tasks across projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.totalTasks === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-surface-500">
                No tasks available
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tasksByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {tasksByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Distribution Bar Chart */}
        <Card className="lg:col-span-2 bg-surface-900/50 border-surface-800">
          <CardHeader>
            <CardTitle>Project Activity</CardTitle>
            <CardDescription>Total vs completed tasks per project.</CardDescription>
          </CardHeader>
          <CardContent>
            {projectDistribution.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-surface-500">
                No projects available
              </div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="totalTasks" name="Total Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="completedTasks" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
