"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { User, Shield, Users, Crown } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-surface-100">Account & Teams</h2>
        <p className="text-surface-400 mt-2">Manage your profile, team members, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-500/10 text-brand-600'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          {/* ──── Profile Tab ──── */}
          {activeTab === 'profile' && (
            <>
              <Card className="bg-surface-900/50 border-surface-800">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your avatar and personal details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20 ring-2 ring-surface-700">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-xl bg-brand-500 text-white">
                          {user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <Button variant="outline" type="button" size="sm">Change Avatar</Button>
                        <p className="text-xs text-surface-400">JPG, GIF or PNG. 1MB max.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-surface-100">Full Name</label>
                        <Input defaultValue={user?.name} className="bg-surface-800 border-surface-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-surface-100">Username</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-surface-500 text-sm">@</span>
                          <Input defaultValue={user?.username} className="bg-surface-800 border-surface-700 pl-7" />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-surface-100">Email Address</label>
                        <Input type="email" defaultValue={user?.email} className="bg-surface-800 border-surface-700" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-surface-100">Bio</label>
                        <textarea 
                          className="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-h-[100px]"
                          placeholder="Tell your team a little bit about yourself..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-surface-800">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </>
          )}

          {/* ──── Security Tab ──── */}
          {activeTab === 'security' && (
            <Card className="bg-surface-900/50 border-surface-800">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-100">Current Password</label>
                    <Input type="password" placeholder="••••••••" className="bg-surface-800 border-surface-700 max-w-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-100">New Password</label>
                    <Input type="password" placeholder="••••••••" className="bg-surface-800 border-surface-700 max-w-md" />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-surface-800">
                    <Button variant="outline" type="button">Update Password</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ──── Teams Tab ──── */}
          {activeTab === 'teams' && (
            <Card className="bg-surface-900/50 border-surface-800">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Invites, roles, and project assignments are managed on the Team page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Current user */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-surface-700">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-brand-500 text-white text-sm">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-surface-100">{user?.name || 'You'}</p>
                      <p className="text-xs text-surface-500">{user?.email}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    <Crown className="h-3 w-3" /> Owner
                  </span>
                </div>

                <div className="border-t border-surface-800 pt-4">
                  <Link href="/dashboard/team">
                    <Button className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" /> Manage team &amp; invites
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
