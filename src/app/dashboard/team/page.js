"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { 
  Users, Mail, Plus, Settings, ShieldAlert,
  FolderKanban, ChevronDown, ChevronUp, Check, X, Loader2, UserMinus, Trash2, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Modal';

export default function TeamPage() {
  const { activeOrganization } = useOrganization();
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteProjects, setInviteProjects] = useState([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);
  const [removingMember, setRemovingMember] = useState(null); // { userId, orgId, name }
  const [editingRole, setEditingRole] = useState(null); // userId of member whose role is being edited
  const [updatingRole, setUpdatingRole] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Close role dropdown on outside click
  useEffect(() => {
    if (!editingRole) return;
    const handleClickOutside = () => setEditingRole(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [editingRole]);

  useEffect(() => {
    if (activeOrganization?._id) fetchProjects(activeOrganization._id);
  }, [activeOrganization]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Failed to fetch orgs', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (orgId) => {
    try {
      const res = await fetch(`/api/projects?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Build a map: userId -> [project names]
  const getMemberProjects = (userId) => {
    return projects.filter(p => 
      p.members?.some(m => (m.user?._id || m.user) === userId)
    );
  };

  const toggleInviteProject = (projectId) => {
    setInviteProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleInvite = async (e, orgId) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);

    try {
      const res = await fetch(`/api/organizations/${orgId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: inviteEmail, 
          role: inviteRole,
          projectIds: inviteProjects 
        })
      });
      
      if (res.ok) {
        setInviteEmail('');
        setInviteProjects([]);
        setShowProjectPicker(false);
        fetchOrganizations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        <p className="text-surface-400 text-sm">Loading team data...</p>
      </div>
    );
  }

  const handleRemoveFromProject = async (userId, projectId, userName, projectName) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Removed from Project', `${userName} has been removed from ${projectName}.`);
        fetchOrganizations();
        if (activeOrganization?._id) fetchProjects(activeOrganization._id);
      } else {
        const err = await res.json();
        toast.error('Error', err.error || 'Failed to remove from project');
      }
    } catch (error) {
      toast.error('Network Error', 'Could not reach the server.');
    }
  };

  const handleCancelInvite = async (orgId, email) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/invites?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Invite Cancelled', `Invitation to ${email} has been revoked.`);
        fetchOrganizations();
      } else {
        const err = await res.json();
        toast.error('Error', err.error || 'Failed to cancel invite');
      }
    } catch (error) {
      toast.error('Network Error', 'Could not reach the server.');
    }
  };

  const handleRemoveOrgMember = async () => {
    if (!removingMember) return;
    try {
      const res = await fetch(`/api/organizations/${removingMember.orgId}/members?userId=${removingMember.userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Member Removed', `${removingMember.name} has been removed from the workspace and all projects.`);
        fetchOrganizations();
      } else {
        const err = await res.json();
        toast.error('Error', err.error || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('Network Error', 'Could not reach the server.');
    }
    setRemovingMember(null);
  };

  const handleRoleChange = async (orgId, userId, newRole, memberName) => {
    setUpdatingRole(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });
      if (res.ok) {
        toast.success('Role Updated', `${memberName}'s role has been changed to ${newRole}.`);
        fetchOrganizations();
      } else {
        const err = await res.json();
        toast.error('Error', err.error || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Network Error', 'Could not reach the server.');
    }
    setUpdatingRole(false);
    setEditingRole(null);
  };

  return (
    <>
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-100">Team & Organizations</h1>
        <p className="text-surface-400 mt-1">Manage your team members, roles, and project assignments.</p>
      </div>

      {organizations.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-brand-600" />
            </div>
            <h3 className="text-xl font-bold text-surface-100 mb-2">No Organizations Found</h3>
            <p className="text-surface-400 mb-6 max-w-sm">You aren&apos;t a member of any organizations yet. Create one to start collaborating.</p>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Organization</Button>
          </CardContent>
        </Card>
      ) : (
        organizations.filter(org => !activeOrganization || org._id === activeOrganization._id).map(org => {
          const currentOrgMember = org.members?.find(m => (m.user?._id || m.user) === user?._id);
          const isOrgAdmin = currentOrgMember && ['owner', 'admin', 'manager'].includes(currentOrgMember.role);
          const isOwner = currentOrgMember && currentOrgMember.role === 'owner';
          return (
          <div key={org._id} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Members List */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {org.name}
                      <Badge variant="outline" className="uppercase text-[10px] font-normal border-brand-500/30 text-brand-600 bg-brand-500/10">
                        {org.plan}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {org.members.length} member{org.members.length !== 1 ? 's' : ''} · {projects.length} project{projects.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {isOrgAdmin && (
                    <Button variant="outline" size="sm" className="border-surface-700">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 text-xs font-medium text-surface-400 uppercase tracking-wider px-4 pb-2 border-b border-surface-800">
                      <div className="col-span-5">Member</div>
                      <div className="col-span-2">Role</div>
                      <div className="col-span-3">Projects</div>
                      <div className="col-span-2 text-right pr-8">Joined</div>
                    </div>
                    
                    {org.members.map((member) => {
                      const memberProjects = getMemberProjects(member.user._id);
                      const isExpanded = expandedMember === member.user._id;

                      return (
                        <div key={member.user._id}>
                          {/* Member Row */}
                          <div 
                            className="grid grid-cols-12 items-center px-4 py-3 hover:bg-surface-800/50 rounded-lg transition-colors group cursor-pointer"
                            onClick={() => setExpandedMember(isExpanded ? null : member.user._id)}
                          >
                            <div className="col-span-5 flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.user.avatar} />
                                <AvatarFallback className="bg-brand-500 text-white text-[10px]">
                                  {member.user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-surface-100 truncate">{member.user.name}</p>
                                <p className="text-xs text-surface-400 truncate">{member.user.email}</p>
                              </div>
                            </div>
                            <div className="col-span-2 flex items-center relative">
                              {isOwner && member.role !== 'owner' && member.user._id !== user?._id ? (
                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingRole(editingRole === member.user._id ? null : member.user._id); }}
                                    className={`inline-flex items-center gap-1 text-[10px] border rounded-full px-2.5 py-0.5 font-medium transition-all hover:ring-2 hover:ring-brand-500/30 cursor-pointer ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}
                                    title="Click to change role"
                                  >
                                    {ROLE_LABELS[member.role] || member.role}
                                    <ChevronDown className="h-2.5 w-2.5" />
                                  </button>
                                  {editingRole === member.user._id && (
                                    <div className="absolute top-full left-0 mt-1.5 w-40 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                      <div className="px-3 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Change Role</div>
                                      {[{ value: 'admin', label: 'Admin', color: 'text-brand-600' }, { value: 'manager', label: 'Manager', color: 'text-amber-400' }, { value: 'member', label: 'Member', color: 'text-surface-300' }, { value: 'guest', label: 'Guest', color: 'text-surface-500' }].map(r => (
                                        <button
                                          key={r.value}
                                          disabled={updatingRole}
                                          onClick={(e) => { e.stopPropagation(); handleRoleChange(org._id, member.user._id, r.value, member.user.name); }}
                                          className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                            member.role === r.value ? 'bg-surface-800 font-medium' : 'hover:bg-surface-800/50'
                                          }`}
                                        >
                                          <span className={r.color}>{r.label}</span>
                                          {member.role === r.value && <Check className="h-3.5 w-3.5 text-brand-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] border ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}
                                >
                                  {ROLE_LABELS[member.role] || member.role}
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-3 flex items-center gap-1.5 flex-wrap">
                              {memberProjects.length === 0 ? (
                                <span className="text-xs text-surface-500 italic">No projects</span>
                              ) : memberProjects.length <= 2 ? (
                                memberProjects.map(p => (
                                  <span 
                                    key={p._id} 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-800 text-surface-200 border border-surface-700"
                                    style={{ borderLeftColor: p.color || '#3b82f6', borderLeftWidth: '2px' }}
                                  >
                                    {p.name}
                                  </span>
                                ))
                              ) : (
                                <>
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-800 text-surface-200 border border-surface-700"
                                    style={{ borderLeftColor: memberProjects[0].color || '#3b82f6', borderLeftWidth: '2px' }}
                                  >
                                    {memberProjects[0].name}
                                  </span>
                                  <span className="text-[11px] text-surface-400">
                                    +{memberProjects.length - 1} more
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="col-span-2 flex justify-end items-center gap-2">
                              <span className="text-xs text-surface-400 whitespace-nowrap">
                                {format(new Date(member.joinedAt), 'MMM yyyy')}
                              </span>
                              <span className="w-6 flex-shrink-0 flex justify-end">
                              {isOrgAdmin && member.role !== 'owner' && member.user._id !== user?._id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRemovingMember({ userId: member.user._id, orgId: org._id, name: member.user.name }); }}
                                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all"
                                  title="Remove Member"
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                </button>
                              )}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Detail */}
                          {isExpanded && (
                            <div className="mx-4 mb-2 p-4 bg-surface-900/50 border border-surface-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
                              <div className="flex items-center gap-2 mb-3">
                                <FolderKanban className="h-4 w-4 text-surface-400" />
                                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Project Assignments</span>
                              </div>
                              {memberProjects.length === 0 ? (
                                <p className="text-sm text-surface-500 py-2">Not assigned to any projects yet.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {memberProjects.map(p => {
                                    const projectMember = p.members?.find(m => (m.user?._id || m.user) === member.user._id);
                                    return (
                                      <div 
                                        key={p._id} 
                                        className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-800/50 border border-surface-800 hover:border-surface-700 transition-colors"
                                      >
                                        <div 
                                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                                          style={{ backgroundColor: (p.color || '#3b82f6') + '20', color: p.color || '#3b82f6' }}
                                        >
                                          {p.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-surface-100 truncate">{p.name}</p>
                                          <p className="text-xs text-surface-500 capitalize">{projectMember?.role || 'member'}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Badge variant="outline" className="text-[10px] capitalize border-surface-700 text-surface-300">
                                            {p.status || 'active'}
                                          </Badge>
                                          {isOrgAdmin && member.role !== 'owner' && member.user._id !== user?._id && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleRemoveFromProject(member.user._id, p._id, member.user.name, p.name); }}
                                              className="p-1 hover:bg-red-500/10 hover:text-red-400 text-surface-500 rounded transition-all"
                                              title={`Remove from ${p.name}`}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Pending Invites */}
                    {org.pendingInvites?.map((invite) => (
                      <div key={invite.email} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-surface-800/50 rounded-lg transition-colors group opacity-70">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full border border-dashed border-surface-600 flex items-center justify-center bg-surface-900">
                            <Mail className="h-3 w-3 text-surface-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-surface-100 italic">{invite.email}</p>
                            <p className="text-xs text-amber-400">Invite Pending</p>
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Badge variant="outline" className="capitalize text-[10px] border-surface-700 text-surface-300">
                            {invite.role}
                          </Badge>
                        </div>
                        <div className="col-span-4">
                          {invite.projectIds?.length > 0 ? (
                            <span className="text-xs text-surface-400">
                              {invite.projectIds.length} project{invite.projectIds.length !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-surface-500 italic">Org-level only</span>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-end items-center gap-2 text-sm text-surface-400">
                          {format(new Date(invite.invitedAt), 'MMM d')}
                          {isOrgAdmin && (
                            <button
                              onClick={() => handleCancelInvite(org._id, invite.email)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-surface-500 rounded-md transition-all"
                              title="Cancel Invite"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invite Form - Admin only */}
              {isOrgAdmin && <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invite Members</CardTitle>
                  <CardDescription>Send an email invitation to join {org.name}.</CardDescription>
                </CardHeader>
                <form onSubmit={(e) => handleInvite(e, org._id)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-surface-200">Email Address</label>
                      <Input 
                        type="email" 
                        placeholder="colleague@example.com" 
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-surface-200">Role</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                      >
                        <option value="member">Member — Can work on projects and tasks</option>
                        <option value="admin">Admin — Can manage settings and members</option>
                        <option value="manager">Manager — Can manage projects and assign tasks</option>
                        <option value="guest">Guest — View-only access</option>
                      </select>
                    </div>

                    {/* Project Assignment */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-surface-200">Add to Projects</label>
                      <button 
                        type="button"
                        onClick={() => setShowProjectPicker(!showProjectPicker)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm hover:bg-surface-800 transition-colors"
                      >
                        <span className={inviteProjects.length > 0 ? 'text-surface-100' : 'text-surface-400'}>
                          {inviteProjects.length > 0 
                            ? `${inviteProjects.length} project${inviteProjects.length !== 1 ? 's' : ''} selected`
                            : 'Select projects (optional)'}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-surface-400 transition-transform ${showProjectPicker ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showProjectPicker && (
                        <div className="border border-surface-700 rounded-lg bg-surface-900 overflow-hidden">
                          {projects.length === 0 ? (
                            <p className="text-xs text-surface-500 text-center py-3">No projects in this workspace</p>
                          ) : (
                            projects.map(p => {
                              const isSelected = inviteProjects.includes(p._id);
                              return (
                                <button
                                  key={p._id}
                                  type="button"
                                  onClick={() => toggleInviteProject(p._id)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                                    isSelected 
                                      ? 'bg-brand-500/10 text-white' 
                                      : 'text-surface-300 hover:bg-surface-800'
                                  }`}
                                >
                                  <div 
                                    className="h-6 w-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold"
                                    style={{ backgroundColor: (p.color || '#3b82f6') + '20', color: p.color || '#3b82f6' }}
                                  >
                                    {p.name.charAt(0)}
                                  </div>
                                  <span className="flex-1 truncate">{p.name}</span>
                                  {isSelected && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      {inviteProjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {inviteProjects.map(pId => {
                            const p = projects.find(proj => proj._id === pId);
                            if (!p) return null;
                            return (
                              <span 
                                key={pId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-800 text-surface-200 border border-surface-700"
                              >
                                {p.name}
                                <button 
                                  type="button"
                                  onClick={() => toggleInviteProject(pId)} 
                                  className="text-surface-400 hover:text-red-400 ml-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={inviting}>
                      {inviting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                      ) : (
                        'Send Invite'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>}

              {/* Project Breakdown */}
              {projects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-brand-600" />
                      Project Members
                    </CardTitle>
                    <CardDescription>Quick view of project team sizes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {projects.map(p => (
                      <div key={p._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-800/50 transition-colors">
                        <div 
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                          style={{ backgroundColor: (p.color || '#3b82f6') + '20', color: p.color || '#3b82f6' }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-100 truncate">{p.name}</p>
                          <p className="text-xs text-surface-500">{p.members?.length || 0} member{(p.members?.length || 0) !== 1 ? 's' : ''}</p>
                        </div>
                        {/* Member avatars stack */}
                        <div className="flex -space-x-2">
                          {p.members?.slice(0, 3).map((m, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-surface-900">
                              <AvatarImage src={m.user?.avatar} />
                              <AvatarFallback className="text-[8px] bg-surface-700">
                                {m.user?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {(p.members?.length || 0) > 3 && (
                            <div className="h-6 w-6 rounded-full border-2 border-surface-900 bg-surface-700 flex items-center justify-center">
                              <span className="text-[8px] text-surface-300">+{p.members.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="border-brand-500/20 bg-brand-500/5">
                <CardContent className="p-6 flex gap-4">
                  <ShieldAlert className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-surface-100">Role-Based Access</h4>
                    <p className="text-xs text-surface-400 leading-relaxed">
                      Admins can create projects and manage billing. Members can collaborate on projects but cannot change organization settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        })
      )}
    </div>

    {/* Remove Confirmation Dialog */}
    <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{removingMember?.name}</strong> from the workspace? They will also be removed from all projects in this workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setRemovingMember(null)}>Cancel</Button>
          <Button 
            type="button" 
            onClick={handleRemoveOrgMember}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Remove from Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

