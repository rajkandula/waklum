"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useOrganization } from '@/context/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { FolderKanban, Plus, MoreVertical, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeOrganization, loading: orgLoading } = useOrganization();

  useEffect(() => {
    if (activeOrganization) {
      fetchProjects();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [activeOrganization, orgLoading]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?orgId=${activeOrganization._id}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    'active': 'success',
    'on-hold': 'warning',
    'completed': 'default',
    'archived': 'secondary'
  };

  if (!activeOrganization && !orgLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center border border-dashed border-surface-800 rounded-xl bg-surface-900/50">
        <h2 className="text-xl font-bold text-surface-100 mb-2">No Workspace Selected</h2>
        <p className="text-surface-400 max-w-md">
          Please create or select an organization from the sidebar to view projects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-100">Projects</h1>
          <p className="text-surface-400 mt-1">Manage and track all your team's projects.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="h-2 w-full bg-surface-800" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="pt-4 flex justify-between">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-surface-800 rounded-xl bg-surface-900/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800 mb-4">
            <FolderKanban className="h-8 w-8 text-surface-400" />
          </div>
          <h3 className="text-xl font-semibold text-surface-100 mb-2">No projects yet</h3>
          <p className="text-surface-400 mb-6 max-w-sm">
            Get started by creating your first project to organize tasks and collaborate with your team.
          </p>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="mr-2 h-4 w-4" /> Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project._id} href={`/dashboard/projects/${project._id}`}>
              <Card className="h-full hover:border-brand-500/50 transition-colors group cursor-pointer overflow-hidden flex flex-col">
                <div 
                  className="h-2 w-full" 
                  style={{ backgroundColor: project.color || '#3b82f6' }} 
                />
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800"
                        style={{ color: project.color || '#3b82f6' }}
                      >
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-surface-100 text-lg line-clamp-1 group-hover:text-brand-500 transition-colors">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={statusColors[project.status] || 'default'} className="uppercase text-[10px] px-1.5 py-0">
                            {project.status}
                          </Badge>
                          <span className="text-xs text-surface-500">•</span>
                          <span className="text-xs text-surface-500 capitalize">{project.visibility}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-surface-400 line-clamp-2 mb-6 flex-1">
                    {project.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-surface-800">
                    <div className="flex items-center text-xs text-surface-400">
                      <Calendar className="mr-1.5 h-3.5 w-3.5" />
                      {format(new Date(project.updatedAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-surface-500" />
                      <span className="text-xs font-medium text-surface-300">
                        {project.members?.length || 1}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
