"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Settings, 
  CreditCard,
  LogOut,
  ChevronDown,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import CreateOrgModal from '@/components/organizations/CreateOrgModal';

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { organizations, activeOrganization, switchOrganization } = useOrganization();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'Team', href: '/dashboard/team', icon: Users },
  ];

  const bottomItems = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  ];

  // ─── COLLAPSED (icon-only rail) ───
  if (collapsed) {
    return (
      <div className="flex h-screen w-[68px] flex-col border-r border-surface-800 bg-surface-950 items-center">
        {/* Logo + Toggle */}
        <div className="flex flex-col items-center gap-2 py-4 border-b border-surface-800 w-full">
          <Link href="/dashboard" title="Waklum">
            <img src="/icon.svg" alt="Waklum" className="h-7 w-7" />
          </Link>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="flex items-center justify-center h-7 w-7 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Workspace initial */}
        <div className="flex items-center justify-center py-3 border-b border-surface-800 w-full">
          <div 
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-surface-900 border border-surface-800 text-xs font-bold text-brand-600 cursor-default"
            title={activeOrganization?.name || 'Workspace'}
          >
            {activeOrganization?.name?.[0]?.toUpperCase() || 'W'}
          </div>
        </div>

        {/* Main Nav Icons */}
        <div className="flex-1 flex flex-col items-center py-3 space-y-1 w-full px-2">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                  isActive 
                    ? "bg-brand-500/15 text-brand-600" 
                    : "text-surface-400 hover:bg-surface-800 hover:text-surface-100"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>

        {/* Bottom Icons */}
        <div className="border-t border-surface-800 py-3 space-y-1 w-full px-2 flex flex-col items-center">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                  isActive 
                    ? "bg-brand-500/15 text-brand-600" 
                    : "text-surface-400 hover:bg-surface-800 hover:text-surface-100"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}

          {/* User Avatar + Logout */}
          <div className="pt-2 mt-1 border-t border-surface-800 w-full flex flex-col items-center gap-1">
            <Link href="/dashboard/settings" title={user?.name || 'Profile'}>
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Link>
            <button 
              onClick={(e) => { e.preventDefault(); logout(); }}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EXPANDED (full sidebar) ───
  return (
    <>
      <div className="flex h-screen w-64 flex-col border-r border-surface-800 bg-surface-950">
        {/* Logo & Org Switcher */}
        <div className="flex flex-col border-b border-surface-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-surface-100" onClick={onClose}>
              <img src="/icon.svg" alt="Waklum" className="h-8 w-8" />
              Waklum
            </Link>
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button 
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="hidden md:flex p-1.5 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-md transition-colors"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
              {onClose && (
                <button onClick={onClose} className="md:hidden p-1 text-surface-400 hover:text-surface-100 rounded-md">
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex w-full items-center justify-between rounded-md border border-surface-800 bg-surface-900 px-3 py-2 text-sm text-left hover:bg-surface-800 transition-colors"
            >
              <div className="truncate flex-1" suppressHydrationWarning>
                <span className="block text-xs text-surface-400 font-medium uppercase tracking-wider" suppressHydrationWarning>
                  Workspace
                  {mounted && activeOrganization && user && (() => {
                    const mem = activeOrganization.members?.find(m => (m.user?._id || m.user) === user._id);
                    const owned = mem && mem.role === 'owner';
                    return (
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        owned
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-surface-800 text-surface-400 border border-surface-700'
                      }`}>
                        {owned ? 'Owner' : 'Joined'}
                      </span>
                    );
                  })()}
                </span>
                <span className="block text-surface-100 font-medium truncate mt-0.5" suppressHydrationWarning>
                  {activeOrganization ? activeOrganization.name : 'No Organization'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-surface-400" />
            </button>
            
            {isOrgDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-md border border-surface-800 bg-surface-900 shadow-xl z-50 py-1">
                <div className="px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">Your Organizations</div>
                <div className="max-h-48 overflow-y-auto">
                  {organizations.map(org => {
                    const myMembership = org.members?.find(m => (m.user?._id || m.user) === user?._id);
                    const isOwner = myMembership && myMembership.role === 'owner';
                    return (
                      <button
                        key={org._id}
                        onClick={() => { switchOrganization(org._id); setIsOrgDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-800 transition-colors flex items-center justify-between ${activeOrganization?._id === org._id ? 'text-brand-600 bg-brand-500/10' : 'text-surface-200'}`}
                      >
                        <span className="truncate">{org.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2 ${
                          isOwner 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-surface-800 text-surface-400 border border-surface-700'
                        }`}>
                          {isOwner ? 'Owner' : 'Joined'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-surface-800 mt-1 pt-1">
                  <button 
                    onClick={() => { setIsOrgDropdownOpen(false); setIsCreateModalOpen(true); }}
                    className="flex w-full items-center px-3 py-2 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create Organization
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Nav */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = item.href === '/dashboard' 
                ? pathname === '/dashboard' 
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-brand-500/10 text-brand-600" 
                      : "text-surface-300 hover:bg-surface-800 hover:text-surface-100"
                  )}
                  onClick={onClose}
                >
                  <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-brand-600" : "text-surface-400 group-hover:text-surface-300")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Nav & User Profile */}
        <div className="border-t border-surface-800 p-4">
          <nav className="space-y-1 mb-4">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-brand-500/10 text-brand-600" 
                      : "text-surface-300 hover:bg-surface-800 hover:text-surface-100"
                  )}
                  onClick={onClose}
                >
                  <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-brand-600" : "text-surface-400 group-hover:text-surface-300")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-800 transition-colors cursor-pointer group">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 items-center justify-between overflow-hidden">
              <div className="truncate pr-2">
                <p className="truncate text-sm font-medium text-surface-100 mb-0.5">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-surface-400 leading-none">@{user?.username || 'username'}</p>
              </div>
              <button 
                onClick={(e) => { e.preventDefault(); logout(); }}
                className="text-surface-400 hover:text-red-400 p-1 rounded-md"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CreateOrgModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </>
  );
}
