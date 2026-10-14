"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useOrganization } from '@/context/OrganizationContext';

export default function CreateOrgModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshOrganizations } = useOrganization();

  const generateSlug = (val) => {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    setSlug(generateSlug(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create organization');
      }

      await refreshOrganizations();
      onClose();
      setName('');
      setSlug('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-surface-950 border-surface-800 text-surface-100">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription className="text-surface-400">
            Create a new workspace to organize your projects and team.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-200">Organization Name</label>
            <Input 
              value={name} 
              onChange={handleNameChange} 
              placeholder="Acme Corp" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-200">URL Slug</label>
            <Input 
              value={slug} 
              onChange={(e) => setSlug(generateSlug(e.target.value))} 
              placeholder="acme-corp" 
              required 
            />
            <p className="text-[10px] text-surface-500">Will be used for public links: app.com/org/{slug}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
