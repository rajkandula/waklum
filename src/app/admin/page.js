"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Building2, FolderKanban, CheckSquare, Mail, BarChart3,
  Search, ChevronLeft, ChevronRight, Eye, Shield, ArrowLeft,
  Sparkles, Clock, TrendingUp, MessageSquare, Loader2,
  CreditCard, DollarSign, ExternalLink
} from 'lucide-react';

const PLAN_BADGE = {
  pro: 'bg-brand-500/10 text-brand-600',
  team: 'bg-purple-500/10 text-purple-400',
  enterprise: 'bg-amber-500/10 text-amber-400',
  free: 'bg-surface-800 text-surface-400',
};

const STATUS_BADGE = {
  active: 'bg-green-500/10 text-green-400',
  canceled: 'bg-surface-800 text-surface-400',
  none: 'bg-surface-800 text-surface-500',
};

const usd = (n) => `$${(n || 0).toLocaleString()}`;

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-panel/70 border border-surface-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {sub && <span className="text-xs text-brand-600 bg-brand-500/10 px-2 py-1 rounded-full">{sub}</span>}
      </div>
      <p className="text-3xl font-bold text-surface-100">{value}</p>
      <p className="text-sm text-surface-400 mt-1">{label}</p>
    </div>
  );
}

function DataTable({ columns, data, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
    </div>
  );
  if (!data?.length) return (
    <div className="text-center py-16 text-surface-500">No data found</div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-800">
            {columns.map((col, i) => (
              <th key={i} className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-4 py-3">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-surface-900 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="px-4 py-3.5 text-sm text-surface-300">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
      <span className="text-xs text-surface-500">
        Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </span>
      <div className="flex gap-2">
        <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}
          className="p-1.5 rounded-lg bg-surface-900 text-surface-400 hover:text-surface-100 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}
          className="p-1.5 rounded-lg bg-surface-900 text-surface-400 hover:text-surface-100 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
  { id: 'contacts', label: 'Messages', icon: Mail },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState({ data: [], pagination: null, loading: true });
  const [orgs, setOrgs] = useState({ data: [], pagination: null, loading: true });
  const [contacts, setContacts] = useState({ data: [], pagination: null, loading: true });
  const [subs, setSubs] = useState({ data: [], pagination: null, summary: null, loading: true });
  const [search, setSearch] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // Check admin access + load stats
  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 403 || r.status === 401) { setUnauthorized(true); setAuthChecked(true); return null; }
        return r.json();
      })
      .then(data => { if (data) { setStats(data.stats); setAuthChecked(true); } })
      .catch(() => { setUnauthorized(true); setAuthChecked(true); });
  }, []);

  // Load tab data
  useEffect(() => {
    if (!authChecked || unauthorized) return;
    if (activeTab === 'users') loadUsers(1);
    if (activeTab === 'organizations') loadOrgs(1);
    if (activeTab === 'contacts') loadContacts(1);
    if (activeTab === 'subscriptions') loadSubs(1);
  }, [activeTab, authChecked, unauthorized]);

  const loadUsers = async (page) => {
    setUsers(prev => ({ ...prev, loading: true }));
    const res = await fetch(`/api/admin/users?page=${page}&search=${search}`);
    const data = await res.json();
    setUsers({ data: data.users || [], pagination: data.pagination, loading: false });
  };

  const loadOrgs = async (page) => {
    setOrgs(prev => ({ ...prev, loading: true }));
    const res = await fetch(`/api/admin/organizations?page=${page}&search=${search}`);
    const data = await res.json();
    setOrgs({ data: data.organizations || [], pagination: data.pagination, loading: false });
  };

  const loadContacts = async (page) => {
    setContacts(prev => ({ ...prev, loading: true }));
    const res = await fetch(`/api/admin/contacts?page=${page}`);
    const data = await res.json();
    setContacts({ data: data.contacts || [], pagination: data.pagination, loading: false });
  };

  const loadSubs = async (page) => {
    setSubs(prev => ({ ...prev, loading: true }));
    const res = await fetch(`/api/admin/subscriptions?page=${page}&search=${search}`);
    const data = await res.json();
    setSubs({ data: data.subscribers || [], pagination: data.pagination, summary: data.summary, loading: false });
  };

  const markContact = async (id, status) => {
    await fetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    loadContacts(contacts.pagination?.page || 1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'users') loadUsers(1);
    if (activeTab === 'organizations') loadOrgs(1);
    if (activeTab === 'subscriptions') loadSubs(1);
  };

  if (!authChecked) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
    </div>
  );

  if (unauthorized) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-16 h-16 text-surface-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-surface-100 mb-2">Access Denied</h1>
        <p className="text-surface-400 mb-6">You don&apos;t have admin privileges.</p>
        <Link href="/dashboard" className="text-brand-600 hover:text-brand-500 text-sm">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const userColumns = [
    { label: 'User', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
          {r.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-surface-100 font-medium text-sm">{r.name}</p>
          <p className="text-xs text-surface-500">{r.email}</p>
        </div>
      </div>
    )},
    { label: 'Plan', render: (r) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${r.subscription?.plan === 'pro' ? 'bg-brand-500/10 text-brand-600' : r.subscription?.plan === 'team' ? 'bg-purple-500/10 text-purple-400' : 'bg-surface-800 text-surface-400'}`}>
        {r.subscription?.plan || 'free'}
      </span>
    )},
    { label: 'Provider', render: (r) => <span className="text-xs text-surface-500">{r.authProvider || 'local'}</span> },
    { label: 'Orgs', render: (r) => <span>{r.orgCount}</span> },
    { label: 'Joined', render: (r) => <span className="text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</span> },
  ];

  const orgColumns = [
    { label: 'Organization', render: (r) => (
      <div>
        <p className="text-surface-100 font-medium text-sm">{r.name}</p>
        <p className="text-xs text-surface-500">{r.slug}</p>
      </div>
    )},
    { label: 'Owner', render: (r) => (
      <div className="text-xs">
        <p className="text-surface-300">{r.owner?.name || 'Unknown'}</p>
        <p className="text-surface-500">{r.owner?.email}</p>
      </div>
    )},
    { label: 'Plan', render: (r) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${r.plan === 'pro' ? 'bg-brand-500/10 text-brand-600' : r.plan === 'team' ? 'bg-purple-500/10 text-purple-400' : 'bg-surface-800 text-surface-400'}`}>
        {r.plan || 'free'}
      </span>
    )},
    { label: 'Members', render: (r) => <span>{r.memberCount}</span> },
    { label: 'Projects', render: (r) => <span>{r.projectCount}</span> },
    { label: 'Created', render: (r) => <span className="text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</span> },
  ];

  const contactColumns = [
    { label: 'From', render: (r) => (
      <div>
        <p className="text-surface-100 font-medium text-sm">{r.name}</p>
        <p className="text-xs text-surface-500">{r.email}</p>
      </div>
    )},
    { label: 'Message', render: (r) => <p className="text-xs text-surface-300 max-w-md truncate">{r.message}</p> },
    { label: 'Status', render: (r) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'new' ? 'bg-yellow-500/10 text-yellow-400' : r.status === 'read' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
        {r.status}
      </span>
    )},
    { label: 'Date', render: (r) => <span className="text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</span> },
    { label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        {r.status === 'new' && <button onClick={() => markContact(r._id, 'read')} className="text-xs text-brand-600 hover:text-brand-500">Mark Read</button>}
        {r.status !== 'replied' && <button onClick={() => markContact(r._id, 'replied')} className="text-xs text-green-400 hover:text-green-300">Mark Replied</button>}
      </div>
    )},
  ];

  const subColumns = [
    { label: 'Customer', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
          {r.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-surface-100 font-medium text-sm">{r.name}</p>
          <p className="text-xs text-surface-500">{r.email}</p>
        </div>
      </div>
    )},
    { label: 'Plan', render: (r) => (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PLAN_BADGE[r.plan] || PLAN_BADGE.free}`}>{r.plan}</span>
    )},
    { label: 'Status', render: (r) => (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[r.status] || STATUS_BADGE.none}`}>{r.status}</span>
    )},
    { label: 'MRR', render: (r) => <span className="text-sm font-medium text-surface-100">{r.mrr ? usd(r.mrr) : '—'}</span> },
    { label: 'Renews', render: (r) => <span className="text-xs">{r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString() : '—'}</span> },
    { label: 'Stripe', render: (r) => (
      r.stripeCustomerId ? (
        <a href={`https://dashboard.stripe.com/customers/${r.stripeCustomerId}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-500" title="Open in Stripe">
          Manage <ExternalLink className="w-3 h-3" />
        </a>
      ) : <span className="text-xs text-surface-600">—</span>
    )},
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-surface-800 bg-panel/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-surface-400 hover:text-surface-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-surface-100">Admin Dashboard</span>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm text-surface-400 hover:text-surface-100 transition-colors">
            Back to App →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-panel/50 border border-surface-800 rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-brand-500/20 text-brand-600' : 'text-surface-400 hover:text-surface-100 hover:bg-surface-900'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Monthly Recurring Revenue" value={usd(stats.mrr)} sub={stats.activeSubscriptions > 0 ? `${stats.activeSubscriptions} active` : undefined} color="from-green-500 to-emerald-500" />
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`+${stats.recentUsers} this week`} color="from-brand-500 to-blue-500" />
              <StatCard icon={Building2} label="Organizations" value={stats.totalOrgs} color="from-purple-500 to-pink-500" />
              <StatCard icon={CheckSquare} label="Tasks" value={stats.totalTasks} color="from-orange-500 to-amber-500" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} color="from-emerald-500 to-teal-500" />
              <StatCard icon={Mail} label="Contact Messages" value={stats.totalContacts} sub={stats.newContacts > 0 ? `${stats.newContacts} new` : undefined} color="from-cyan-500 to-brand-500" />
              <div className="sm:col-span-2 bg-panel/70 border border-surface-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-surface-400">Plan Distribution</h3>
                  <button onClick={() => setActiveTab('subscriptions')} className="text-xs text-brand-600 hover:text-brand-500">View subscriptions →</button>
                </div>
                <div className="space-y-3">
                  {['free', 'pro', 'team', 'enterprise'].filter(p => stats.planDistribution?.[p]).map((plan) => (
                    <div key={plan} className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>{plan}</span>
                      <span className="text-sm font-semibold text-surface-100">{stats.planDistribution[plan]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Monthly Recurring Revenue" value={usd(subs.summary?.mrr)} sub={subs.summary?.activeSubscriptions > 0 ? `${subs.summary.activeSubscriptions} active` : undefined} color="from-green-500 to-emerald-500" />
              <StatCard icon={TrendingUp} label="Annual Run Rate" value={usd(subs.summary?.arr)} color="from-brand-500 to-blue-500" />
              <StatCard icon={CreditCard} label="Active Subscriptions" value={subs.summary?.activeSubscriptions ?? '—'} color="from-purple-500 to-pink-500" />
              <StatCard icon={Users} label="Paid Accounts" value={subs.summary?.paidPlans ?? '—'} color="from-orange-500 to-amber-500" />
            </div>

            <div className="bg-panel/50 border border-surface-800 rounded-2xl">
              <div className="p-4 border-b border-surface-800 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-surface-300">Billing Customers</h3>
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..."
                      className="w-full pl-10 pr-4 py-2 bg-surface-900/50 border border-surface-700 rounded-lg text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-brand-500/20 text-brand-600 text-sm rounded-lg hover:bg-brand-500/30 transition-colors">Search</button>
                </form>
              </div>
              <DataTable columns={subColumns} data={subs.data} loading={subs.loading} />
              <Pagination pagination={subs.pagination} onPageChange={loadSubs} />
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-panel/50 border border-surface-800 rounded-2xl">
            <div className="p-4 border-b border-surface-800">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 bg-surface-900/50 border border-surface-700 rounded-lg text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
                </div>
                <button type="submit" className="px-4 py-2 bg-brand-500/20 text-brand-600 text-sm rounded-lg hover:bg-brand-500/30 transition-colors">Search</button>
              </form>
            </div>
            <DataTable columns={userColumns} data={users.data} loading={users.loading} />
            <Pagination pagination={users.pagination} onPageChange={loadUsers} />
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="bg-panel/50 border border-surface-800 rounded-2xl">
            <div className="p-4 border-b border-surface-800">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organizations..."
                    className="w-full pl-10 pr-4 py-2 bg-surface-900/50 border border-surface-700 rounded-lg text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50" />
                </div>
                <button type="submit" className="px-4 py-2 bg-brand-500/20 text-brand-600 text-sm rounded-lg hover:bg-brand-500/30 transition-colors">Search</button>
              </form>
            </div>
            <DataTable columns={orgColumns} data={orgs.data} loading={orgs.loading} />
            <Pagination pagination={orgs.pagination} onPageChange={loadOrgs} />
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="bg-panel/50 border border-surface-800 rounded-2xl">
            <div className="p-4 border-b border-surface-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-surface-300">Contact Submissions</h3>
            </div>
            <DataTable columns={contactColumns} data={contacts.data} loading={contacts.loading} />
            <Pagination pagination={contacts.pagination} onPageChange={loadContacts} />
          </div>
        )}
      </div>
    </div>
  );
}
