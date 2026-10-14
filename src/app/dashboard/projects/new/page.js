"use client"

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/context/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Palette } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const { activeOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'team',
    color: '#3b82f6',
  });

  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#64748b', // slate
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { ...formData, organizationId: activeOrganization?._id };
      
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/projects/${data.project._id}`);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create project');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-100">Create New Project</h1>
          <p className="text-surface-400 text-sm">Set up a new workspace for your team.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Give your project a name and description so your team knows what it's for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-surface-200">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Website Redesign v2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-surface-200">
                Description
              </label>
              <textarea
                placeholder="What is this project about? Write a detailed description here..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="flex w-full rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-foreground placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-900 resize-y min-h-[150px]"
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
              <div className="grid grid-cols-2 gap-4">
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
          <CardFooter className="flex justify-between border-t border-surface-800 p-6">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/projects">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
