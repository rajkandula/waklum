"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Bell, CheckCheck, Loader2, MessageSquare, CheckSquare, Users, 
  FolderKanban, UserPlus, AlertCircle, Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';

const NOTIFICATION_ICONS = {
  task_assigned: { icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  task_updated: { icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
  task_due_soon: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  comment_added: { icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  comment_mentioned: { icon: MessageSquare, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  invite_received: { icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  workspace_invite: { icon: Users, color: 'text-brand-600', bg: 'bg-brand-500/10' },
  invite_accepted: { icon: CheckCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
  member_joined: { icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
  member_removed: { icon: Users, color: 'text-red-400', bg: 'bg-red-500/10' },
  project_created: { icon: FolderKanban, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  project_added: { icon: FolderKanban, color: 'text-teal-400', bg: 'bg-teal-500/10' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, invites
  const [respondingTo, setRespondingTo] = useState(null);
  const router = useRouter();
  const toast = useToast();
  const { switchOrganization } = useOrganization();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=50');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => n.type === 'workspace_invite' ? n : { ...n, read: true }));
      toast.success('Done', 'All notifications marked as read.');
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notifId] }),
      });
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleInviteRespond = async (notif, action) => {
    const orgId = notif.metadata?.orgId;
    const token = notif.metadata?.inviteToken;
    if (!orgId || !token) return;

    setRespondingTo(notif._id);
    try {
      const res = await fetch(`/api/organizations/${orgId}/invites/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(prev => prev.map(n => 
          n._id === notif._id 
            ? { ...n, read: true, type: action === 'accept' ? 'invite_accepted' : 'member_removed', message: action === 'accept' ? `You joined "${notif.metadata?.orgName}"!` : 'Invite declined.' }
            : n
        ));
        toast.success(
          action === 'accept' ? 'Joined!' : 'Declined',
          action === 'accept' ? `You have joined ${notif.metadata?.orgName}` : 'Invite declined successfully'
        );
        if (action === 'accept') {
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        toast.error('Error', data.error || 'Failed to respond to invite');
      }
    } catch (e) {
      toast.error('Network Error', 'Could not reach the server.');
    }
    setRespondingTo(null);
  };

  const handleNotifClick = async (notif) => {
    if (notif.type === 'workspace_invite') return;
    if (!notif.read) await markAsRead(notif._id);
    if (notif.link) {
      // Switch workspace to match the project's organization
      const projectId = notif.metadata?.projectId;
      if (projectId) {
        try {
          const res = await fetch(`/api/projects/${projectId}?fields=organization`);
          if (res.ok) {
            const data = await res.json();
            const orgId = data.project?.organization?._id || data.project?.organization;
            if (orgId) switchOrganization(orgId);
          }
        } catch (e) {
          console.error('Failed to resolve project org:', e);
        }
      }
      router.push(notif.link);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'invites') return n.type === 'workspace_invite' || n.type === 'invite_received';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingInvites = notifications.filter(n => n.type === 'workspace_invite').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Notifications</h1>
          <p className="text-sm text-surface-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} 
            {pendingInvites > 0 && ` · ${pendingInvites} pending invite${pendingInvites > 1 ? 's' : ''}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'invites', label: 'Invites', count: pendingInvites },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === f.key 
                ? 'bg-brand-500/10 text-brand-600 border border-brand-500/20' 
                : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800 border border-transparent'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className="ml-1.5 text-xs bg-surface-800 px-1.5 py-0.5 rounded-full">
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-surface-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="h-14 w-14 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-7 w-7 text-surface-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-100 mb-1">
                {filter === 'unread' ? 'All caught up!' : filter === 'invites' ? 'No pending invites' : 'No notifications yet'}
              </h3>
              <p className="text-sm text-surface-500">
                {filter === 'unread' ? 'You have no unread notifications.' : filter === 'invites' ? 'You have no pending workspace invitations.' : 'When something happens, you\'ll see it here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-800">
              {filtered.map(notif => {
                const iconConfig = NOTIFICATION_ICONS[notif.type] || { icon: Bell, color: 'text-surface-400', bg: 'bg-surface-800' };
                const Icon = iconConfig.icon;

                return (
                  <div
                    key={notif._id}
                    className={`px-5 py-4 transition-colors ${
                      !notif.read ? 'bg-brand-500/5' : 'hover:bg-surface-900/50'
                    }`}
                  >
                    <div 
                      className={`flex gap-4 ${notif.type !== 'workspace_invite' ? 'cursor-pointer' : ''}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      {/* Icon */}
                      <div className={`shrink-0 h-10 w-10 rounded-full ${iconConfig.bg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${iconConfig.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-medium ${!notif.read ? 'text-surface-100' : 'text-surface-300'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-surface-400 mt-0.5">{notif.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notif.read && notif.type !== 'workspace_invite' && (
                              <span className="h-2 w-2 rounded-full bg-brand-500" />
                            )}
                            <span className="text-xs text-surface-500 whitespace-nowrap">
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Actor info */}
                        {notif.actor && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="h-5 w-5 rounded-full bg-surface-700 flex items-center justify-center text-[10px] font-medium text-surface-100">
                              {notif.actor.avatar 
                                ? <img src={notif.actor.avatar} className="h-5 w-5 rounded-full object-cover" /> 
                                : notif.actor.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-xs text-surface-500">{notif.actor.name}</span>
                          </div>
                        )}

                        {/* Accept/Decline for workspace invites */}
                        {notif.type === 'workspace_invite' && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleInviteRespond(notif, 'accept'); }}
                              disabled={respondingTo === notif._id}
                              className="text-xs"
                            >
                              {respondingTo === notif._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCheck className="mr-1 h-3 w-3" />}
                              Accept Invite
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleInviteRespond(notif, 'decline'); }}
                              disabled={respondingTo === notif._id}
                              className="text-xs"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
