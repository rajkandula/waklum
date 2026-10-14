"use client"

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Modal';
import { Users, UserPlus, MoreHorizontal, Settings, Shield, UserMinus, Loader2, Send } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';

export default function ProjectMembersPage({ params }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Determine if current user is owner/admin of this project
  const currentMember = project?.members?.find(m => m.user?._id === user?._id);
  const isProjectAdmin = currentMember && ['owner', 'admin'].includes(currentMember.role);
  const isCreator = project?.createdBy === user?._id || project?.createdBy?._id === user?._id;
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
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

  const handleAddMemberClick = () => {
    setEmailToInvite('');
    setIsAddModalOpen(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!emailToInvite) return;
    
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToInvite, role: selectedRole })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isInvitation) {
          toast.success('Invitation Sent', data.message);
        } else {
          setProject({
            ...project,
            members: [...project.members, data.member]
          });
          toast.success('Member Added', data.message || `${emailToInvite} has been added to the project.`);
        }
        setIsAddModalOpen(false);
        setEmailToInvite('');
      } else {
        const err = await res.json();
        toast.error('Invitation Failed', err.error || 'Failed to add member');
      }
    } catch (error) {
      toast.error('Network Error', 'Could not reach the server. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    const targetId = userId || removingUserId;
    if (!targetId) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${targetId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setProject({
          ...project,
          members: project.members.filter(m => m.user._id !== targetId)
        });
        toast.success('Member Removed', 'The user has been removed from this project.');
      } else {
        const err = await res.json();
        toast.error('Error', err.error || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('Network Error', 'Could not reach the server.');
    }
    setRemovingUserId(null);
  };

  if (loading) return <div className="p-6 text-surface-400">Loading members...</div>;
  if (!project) return <div className="p-6 text-surface-400">Project not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-surface-100">Project Members</h2>
          <p className="text-surface-400 mt-1">Manage who has access to this project.</p>
        </div>
        {(isProjectAdmin || isCreator) && (
          <Button onClick={handleAddMemberClick}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members ({project.members?.length || 0})</CardTitle>
            <CardDescription>Members have access based on their assigned role.</CardDescription>
          </div>
          {(isProjectAdmin || isCreator) && (
            <Button variant="outline" size="sm" className="border-surface-700">
              <Settings className="mr-2 h-4 w-4" /> Roles & Permissions
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-12 text-xs font-medium text-surface-400 uppercase tracking-wider px-4 pb-2 border-b border-surface-800">
              <div className="col-span-6">Member</div>
              <div className="col-span-4 text-center">Project Role</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            {project.members?.map((member) => (
              <div key={member.user._id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-surface-800/50 rounded-lg transition-colors group">
                <div className="col-span-6 flex items-center gap-3">
                  <Avatar className="h-8 w-8 ring-2 ring-surface-800">
                    <AvatarImage src={member.user.avatar} />
                    <AvatarFallback className="bg-brand-500 text-white text-[10px]">
                      {member.user.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-surface-100 flex items-center gap-2">
                      {member.user.name}
                      {project.createdBy === member.user._id && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-brand-500/30 text-brand-600 bg-brand-500/10 uppercase">
                          Creator
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-surface-400">{member.user.email || 'No email provided'}</p>
                  </div>
                </div>
                <div className="col-span-4 flex justify-center">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] border ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}
                  >
                    {ROLE_LABELS[member.role] || member.role}
                  </Badge>
                </div>
                <div className="col-span-2 flex justify-end items-center gap-2 text-sm text-surface-400">
                  {(isProjectAdmin || isCreator) && member.user._id !== user?._id && member.role !== 'owner' && (
                    <button 
                      onClick={() => setRemovingUserId(member.user._id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all"
                      title="Remove Member"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Invite anyone to your project using their email address. If they don't have an account yet, they'll receive an invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input 
                  type="email"
                  placeholder="colleague@example.com"
                  className="w-full bg-surface-900 border border-surface-700 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none text-surface-100 placeholder:text-surface-500"
                  value={emailToInvite}
                  onChange={(e) => setEmailToInvite(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Role</label>
                <select 
                  className="w-full bg-surface-900 border border-surface-700 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none text-surface-100"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="member">Member (Can edit tasks and files)</option>
                  <option value="admin">Admin (Can manage settings and members)</option>
                  <option value="manager">Manager (Can manage projects and assign tasks)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding || !emailToInvite}>
                {adding ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removingUserId} onOpenChange={() => setRemovingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this user from the project? They will lose access to all project resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRemovingUserId(null)}>Cancel</Button>
            <Button 
              type="button" 
              onClick={() => handleRemoveMember(removingUserId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
