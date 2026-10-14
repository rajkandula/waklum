"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Kanban, List, Calendar, Files, Settings, Users, ArrowLeft, LayoutDashboard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProjectDetailLayout({ children, params }) {
  const unwrappedParams = React.use(params);
  const pathname = usePathname();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [unwrappedParams.id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${unwrappedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      }
    } catch (error) {
      console.error('Failed to fetch project', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { name: 'Summary', href: `/dashboard/projects/${unwrappedParams.id}/summary`, icon: LayoutDashboard },
    { name: 'Board', href: `/dashboard/projects/${unwrappedParams.id}`, icon: Kanban, exact: true },
    { name: 'List', href: `/dashboard/projects/${unwrappedParams.id}/list`, icon: List },
    { name: 'Timeline', href: `/dashboard/projects/${unwrappedParams.id}/timeline`, icon: Calendar },
    { name: 'Files', href: `/dashboard/projects/${unwrappedParams.id}/files`, icon: Files },
    { name: 'Docs', href: `/dashboard/projects/${unwrappedParams.id}/docs`, icon: FileText },
    { name: 'Members', href: `/dashboard/projects/${unwrappedParams.id}/members`, icon: Users },
    { name: 'Settings', href: `/dashboard/projects/${unwrappedParams.id}/settings`, icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col -m-6">
      {/* Project Header */}
      <div className="border-b border-surface-800 bg-surface-900/30 px-6 pt-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          
          {loading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : project ? (
            <div className="flex items-center gap-3">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800"
                style={{ color: project.color || '#3b82f6' }}
              >
                <Kanban className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-surface-100">{project.name}</h1>
                <p className="text-sm text-surface-400 capitalize">{project.visibility} Project</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold tracking-tight text-surface-100">Project Not Found</h1>
            </div>
          )}
        </div>

        {/* Project Nav */}
        <nav className="flex space-x-6 overflow-x-auto scrollbar-none -mx-6 px-6 md:mx-0 md:px-0">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-surface-400 hover:border-surface-600 hover:text-surface-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Project Content */}
      <div className="flex-1 overflow-hidden p-6 relative">
        {children}
      </div>
    </div>
  );
}
