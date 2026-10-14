"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Menu, X, FolderKanban, CheckSquare, Users, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useOrganization } from '@/context/OrganizationContext';

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationPanel({ isOpen, onClose, switchOrganization }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState(null);
  const router = useRouter();
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=15');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
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
      // Keep workspace_invite unread count
      const pendingInvites = notifications.filter(n => n.type === 'workspace_invite' && !n.read).length;
      setNotifications(prev => prev.map(n => n.type === 'workspace_invite' ? n : { ...n, read: true }));
      setUnreadCount(pendingInvites);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClick = async (notif) => {
    // Don't navigate for workspace invites — they have inline actions
    if (notif.type === 'workspace_invite' && !notif.read) return;
    
    if (!notif.read) {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notif._id] }),
      });
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.link) {
      // If notification is about a project, switch workspace first
      const projectId = notif.metadata?.projectId;
      if (projectId) {
        try {
          const res = await fetch(`/api/projects/${projectId}?fields=organization`);
          if (res.ok) {
            const data = await res.json();
            const orgId = data.project?.organization?._id || data.project?.organization;
            if (orgId && switchOrganization) {
              switchOrganization(orgId);
            }
          }
        } catch (e) {
          console.error('Failed to resolve project org:', e);
        }
      }
      router.push(notif.link);
    }
    onClose();
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
        // Mark notification as read in the DB so buttons don't reappear
        try {
          await fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [notif._id] }),
          });
        } catch {}

        // Update local state — change type so buttons disappear
        setNotifications(prev => prev.map(n => 
          n._id === notif._id 
            ? { ...n, read: true, type: action === 'accept' ? 'invite_accepted' : 'invite_declined', message: action === 'accept' ? `You joined "${notif.metadata?.orgName}"!` : 'Invite declined.' }
            : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Reload page if accepted to refresh orgs
        if (action === 'accept') {
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        // If invite already used, silently mark the notification as read
        if (data.error?.includes('already') || data.error?.includes('not found')) {
          try {
            await fetch('/api/notifications', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: [notif._id] }),
            });
          } catch {}
          setNotifications(prev => prev.map(n => 
            n._id === notif._id 
              ? { ...n, read: true, type: 'invite_accepted', message: 'This invite has already been handled.' }
              : n
          ));
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
          console.error('Invite respond error:', data.error);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setRespondingTo(null);
  };

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="absolute right-0 top-12 w-96 max-h-[480px] bg-surface-900 border border-surface-700 rounded-xl shadow-elevation-3 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="font-semibold text-surface-100 text-sm">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-500 font-medium">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-surface-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bell className="h-8 w-8 text-surface-700 mx-auto mb-2" />
            <p className="text-surface-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif._id}
              className={`w-full text-left px-4 py-3 hover:bg-surface-800/50 transition-colors border-b border-surface-800/50 ${
                !notif.read ? 'bg-brand-500/5' : ''
              }`}
            >
              <div className="flex gap-3 cursor-pointer" onClick={() => handleClick(notif)}>
                <div className="shrink-0 mt-0.5">
                  {!notif.read && <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-100 font-medium truncate">{notif.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-xs text-surface-600 mt-1">{formatTimeAgo(notif.createdAt)}</p>
                </div>
              </div>
              
              {/* Accept/Decline buttons for workspace invites — only show for unread/pending */}
              {notif.type === 'workspace_invite' && !notif.read && (
                <div className="flex gap-2 mt-2 ml-5">
                  <button
                    onClick={() => handleInviteRespond(notif, 'accept')}
                    disabled={respondingTo === notif._id}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {respondingTo === notif._id ? 'Joining...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleInviteRespond(notif, 'decline')}
                    disabled={respondingTo === notif._id}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* View All link */}
      <div className="border-t border-surface-800 px-4 py-2.5">
        <button
          onClick={() => { router.push('/dashboard/notifications'); onClose(); }}
          className="w-full text-center text-xs font-medium text-brand-600 hover:text-brand-500 transition-colors"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}

function SearchResults({ results, isVisible, onClose, query }) {
  const router = useRouter();
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isVisible) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible || !results) return null;

  const { projects = [], tasks = [], members = [] } = results;
  const hasResults = projects.length || tasks.length || members.length;

  return (
    <div ref={panelRef} className="absolute left-0 right-0 top-11 bg-surface-900 border border-surface-700 rounded-xl shadow-elevation-3 overflow-hidden z-50 max-h-[420px] overflow-y-auto">
      {!hasResults ? (
        <div className="text-center py-8 px-4">
          <Search className="h-6 w-6 text-surface-700 mx-auto mb-2" />
          <p className="text-surface-500 text-sm">No results for "{query}"</p>
        </div>
      ) : (
        <>
          {projects.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider bg-surface-950/50">
                Projects
              </div>
              {projects.map(p => (
                <button
                  key={p._id}
                  onClick={() => { router.push(`/dashboard/projects/${p._id}`); onClose(); }}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-surface-800/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm" style={{ background: p.color || '#3b82f6' }}>
                    {p.icon || <FolderKanban className="h-4 w-4 text-surface-100" />}
                  </div>
                  <div>
                    <p className="text-sm text-surface-100 font-medium">{p.name}</p>
                    <p className="text-xs text-surface-500">{p.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {tasks.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider bg-surface-950/50">
                Tasks
              </div>
              {tasks.map(t => (
                <button
                  key={t._id}
                  onClick={() => { router.push(`/dashboard/projects/${t.project?._id || t.project}`); onClose(); }}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-surface-800/50 transition-colors"
                >
                  <CheckSquare className="h-4 w-4 text-surface-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-100 truncate">{t.title}</p>
                    <p className="text-xs text-surface-500">{t.project?.name} · {t.status}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                    t.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-surface-800 text-surface-400'
                  }`}>
                    {t.priority}
                  </span>
                </button>
              ))}
            </div>
          )}

          {members.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider bg-surface-950/50">
                People
              </div>
              {members.map(m => (
                <div key={m._id} className="px-3 py-2.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-medium text-surface-100">
                    {m.avatar ? <img src={m.avatar} className="h-8 w-8 rounded-full object-cover" /> : m.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-surface-100 font-medium">{m.name}</p>
                    <p className="text-xs text-surface-500">@{m.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Topbar({ onMenuClick }) {
  const { switchOrganization } = useOrganization();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);

  // Poll for unread notification count
  useEffect(() => {
    const fetchCount = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch('/api/notifications?limit=1&unread=true');
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      } catch {}
    };
    
    fetchCount();
    
    // Listen for tab visibility changes to refresh instantly when returning
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchCount();
      }
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    const interval = setInterval(fetchCount, 300000); // Every 5 minutes instead of 30s
    
    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (value.trim().length < 2) {
      setSearchResults(null);
      setShowSearch(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setSearchResults(data.results);
        setShowSearch(true);
      } catch {
        setSearchResults(null);
      }
      setSearching(false);
    }, 300);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-800 bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center gap-3">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-surface-400 hover:text-surface-100 rounded-md transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
          {searching && <Loader2 className="absolute right-12 top-2.5 h-4 w-4 text-surface-500 animate-spin" />}
          <Input
            type="search"
            placeholder="Search projects, tasks, or members..."
            className="w-full bg-surface-900 pl-9 pr-16 border-surface-800 focus-visible:ring-brand-500/50"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchResults) setShowSearch(true); }}
          />
          <kbd className="absolute right-2.5 top-2 hidden sm:inline-flex items-center gap-0.5 text-[10px] text-surface-500 bg-surface-800 border border-surface-700 px-1.5 py-1 rounded font-mono pointer-events-none">
            ⌘K
          </kbd>
          <SearchResults 
            results={searchResults} 
            isVisible={showSearch} 
            onClose={() => setShowSearch(false)}
            query={searchQuery}
          />
        </div>
      </div>
      
      <div className="relative flex items-center gap-4">
        <button 
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative rounded-full p-2 text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-brand-500 ring-2 ring-background text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} switchOrganization={switchOrganization} />
      </div>
    </header>
  );
}
