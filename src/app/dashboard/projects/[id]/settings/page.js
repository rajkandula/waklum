"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Palette, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function ProjectSettingsPage({ params }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  const router = useRouter();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'team',
    color: '#3b82f6',
  });

  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', 
    '#f97316', '#eab308', '#22c55e', '#14b8a6', '#64748b'
  ];

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setFormData({
          name: data.project.name || '',
          description: data.project.description || '',
          visibility: data.project.visibility || 'team',
          color: data.project.color || '#3b82f6',
        });
      }
    } catch (error) {
      console.error('Failed to fetch project', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        // Force refresh to update Layout header
        router.refresh();
        alert('Project updated successfully');
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to update project. You may not have permission.');
      }
    } catch (error) {
      setError('An error occurred while updating the project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you absolutely sure you want to delete this project? This action cannot be undone and will permanently delete all tasks, files, and data.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        router.push('/dashboard/projects');
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete project. You may not have permission.');
        setDeleting(false);
      }
    } catch (error) {
      alert('An error occurred while deleting the project.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-surface-400">Loading settings...</div>;
  }

  if (!project) {
    return <div className="p-6 text-surface-400">Project not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-surface-100">Project Settings</h2>
        <p className="text-surface-400 mt-1">Manage project details, visibility, and dangerous actions.</p>
      </div>

      <Card>
        <form onSubmit={handleUpdate}>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Update your project name and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-surface-200">
                Project Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-surface-200">
                Description
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-foreground placeholder:text-surface-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium leading-none text-surface-200 flex items-center gap-2">
                <Palette className="h-4 w-4" /> Project Color
              </label>
              <div className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900 transition-all ${
                      formData.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-surface-200">
                Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.visibility === 'team' ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'
                  }`}
                  onClick={() => setFormData({ ...formData, visibility: 'team' })}
                >
                  <p className="font-medium text-surface-100 mb-1">Team</p>
                  <p className="text-xs text-surface-400">All members of your organization can find and join.</p>
                </div>
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.visibility === 'private' ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'
                  }`}
                  onClick={() => setFormData({ ...formData, visibility: 'private' })}
                >
                  <p className="font-medium text-surface-100 mb-1">Private</p>
                  <p className="text-xs text-surface-400">Only invited members can view this project.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-surface-800 p-6 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-surface-400">
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-500/20 rounded-lg bg-surface-950/50 gap-4">
            <div>
              <h4 className="font-medium text-surface-100">Delete Project</h4>
              <p className="text-sm text-surface-400 mt-1">
                Permanently delete this project, including all tasks, comments, and files. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="shrink-0">
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
