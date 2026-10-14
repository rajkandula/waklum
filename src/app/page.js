"use client"

import { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Bot, FolderKanban, CheckSquare, Users, FileText, 
  Brain, Zap, ArrowRight, Send, Menu, X, ChevronRight,
  MessageSquare, Shield, Clock, BarChart3, 
  Link2, Plug, ToggleRight, Search, ListTodo, Building2, 
  FilePlus, RefreshCw, PenLine, Eye, Copy, ExternalLink,
  CircleDot, Globe, Lock
} from 'lucide-react';

// The connector URL of this deployment (NEXT_PUBLIC_APP_URL is inlined at build time).
const MCP_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp`;

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-surface-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="Waklum" className="w-9 h-9 rounded-lg" />
          <span className="text-lg font-bold text-surface-100">Waklum</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-surface-400 hover:text-surface-100 transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-surface-400 hover:text-surface-100 transition-colors">How It Works</a>
          <a href="#claude-integration" className="text-sm text-surface-400 hover:text-surface-100 transition-colors">Connectors</a>
          <a href="#pricing" className="text-sm text-surface-400 hover:text-surface-100 transition-colors">Pricing</a>
          <a href="#contact" className="text-sm text-surface-400 hover:text-surface-100 transition-colors">Contact</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-surface-300 hover:text-surface-100 transition-colors">Log in</Link>
          <Link href="/signup" className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/20">
            Get Started Free
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-surface-400">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-panel border-t border-surface-800 px-6 py-4 space-y-3">
          <a href="#features" onClick={() => setOpen(false)} className="block text-sm text-surface-300 hover:text-surface-100">Features</a>
          <a href="#how-it-works" onClick={() => setOpen(false)} className="block text-sm text-surface-300 hover:text-surface-100">How It Works</a>
          <a href="#claude-integration" onClick={() => setOpen(false)} className="block text-sm text-surface-300 hover:text-surface-100">Connectors</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="block text-sm text-surface-300 hover:text-surface-100">Pricing</a>
          <a href="#contact" onClick={() => setOpen(false)} className="block text-sm text-surface-300 hover:text-surface-100">Contact</a>
          <div className="pt-3 border-t border-surface-800 flex gap-3">
            <Link href="/login" className="text-sm text-surface-300">Log in</Link>
            <Link href="/signup" className="text-sm text-brand-600">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]" />
      
      <div className="relative max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
          <Bot className="w-4 h-4 text-brand-600" />
          <span className="text-sm text-brand-600">Claude & ChatGPT Connectors</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-surface-100">Your AI Project Manager,</span>
          <br />
          <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-brand-400 bg-clip-text text-transparent">
            Inside Claude & ChatGPT
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect Waklum to Claude & ChatGPT and let AI manage your entire project — create organizations, 
          plan tasks, write documentation, assign teams, and track progress. All through natural conversation.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="group px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all shadow-xl shadow-brand-500/25 flex items-center gap-2">
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#how-it-works" className="px-8 py-3.5 text-base font-medium text-surface-300 bg-surface-900 border border-surface-700 rounded-xl hover:bg-surface-800 transition-all">
            See How It Works
          </a>
        </div>

        {/* Chat mockup */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-panel/80 backdrop-blur-xl border border-surface-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-surface-800">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-surface-500">Claude/ChatGPT Chat + Waklum</span>
            </div>
            <div className="space-y-4 text-left">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">U</span>
                </div>
                <div className="bg-surface-800/50 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-surface-200">
                  Create a new project called &quot;Mobile App Redesign&quot; and add 5 tasks for the first sprint
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-surface-200 space-y-2">
                  <p>🎯 I&apos;ve created <strong className="text-white">&quot;Mobile App Redesign&quot;</strong> and here are 5 sprint tasks:</p>
                  <div className="text-xs space-y-1 text-surface-400">
                    <p>✅ UI Audit & Component Inventory — <span className="text-yellow-400">high</span> — 3 days</p>
                    <p>✅ Design System Migration — <span className="text-yellow-400">high</span> — 5 days</p>
                    <p>✅ Navigation Redesign — <span className="text-blue-400">medium</span> — 4 days</p>
                    <p>✅ Onboarding Flow Revamp — <span className="text-blue-400">medium</span> — 3 days</p>
                    <p>✅ Performance Optimization — <span className="text-blue-400">medium</span> — 5 days</p>
                  </div>
                  <p className="text-xs text-surface-500">All tasks assigned to you with docs created →</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Bot, title: 'AI Task Creation', desc: 'Describe what you need — AI generates tasks with descriptions, priorities, deadlines, and assignees automatically.', color: 'from-brand-500 to-blue-500' },
  { icon: FileText, title: 'Smart Documentation', desc: 'AI writes professional docs, research notes, architecture guides, and meeting summaries — saved directly to your project.', color: 'from-purple-500 to-pink-500' },
  { icon: Users, title: 'Team Management', desc: 'Invite members, assign roles, manage permissions. AI knows your team and routes tasks to the right people.', color: 'from-emerald-500 to-teal-500' },
  { icon: FolderKanban, title: 'Project Boards', desc: 'Kanban boards, timelines, and list views. Drag-and-drop task management for the whole team.', color: 'from-orange-500 to-amber-500' },
  { icon: Brain, title: 'Memory & Context', desc: 'AI remembers your preferences, past decisions, and project context — even across conversation resets.', color: 'from-rose-500 to-red-500' },
  { icon: MessageSquare, title: 'Claude & ChatGPT', desc: 'Connect as an MCP server to Claude or ChatGPT. Your entire project management — accessible from your chat.', color: 'from-cyan-500 to-brand-500' },
];

function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-4">Everything you need to manage projects with AI</h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">From task creation to documentation — Waklum gives your AI the tools to be a real project manager.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group bg-panel/50 border border-surface-800 rounded-2xl p-6 hover:border-brand-500/30 hover:bg-panel/80 transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">{f.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { num: '01', title: 'Connect to LLM', desc: 'Add Waklum to Claude (Connectors) or ChatGPT (Apps) — authorize access in one click.', icon: Zap },
  { num: '02', title: 'Chat Naturally', desc: '"Create a project for our new mobile app" — Claude understands and executes using Waklum tools.', icon: MessageSquare },
  { num: '03', title: 'AI Manages Everything', desc: 'Tasks, docs, assignments, progress tracking — all managed through conversation. Review on your dashboard.', icon: BarChart3 },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-panel/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-4">How it works</h2>
          <p className="text-surface-400 text-lg">Three steps to an AI-powered project workflow</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6">
                <s.icon className="w-7 h-7 text-brand-600" />
              </div>
              <span className="text-xs font-mono text-brand-500 mb-2 block">{s.num}</span>
              <h3 className="text-xl font-semibold text-surface-100 mb-3">{s.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{s.desc}</p>
              {i < 2 && <ChevronRight className="hidden md:block absolute top-16 -right-4 w-5 h-5 text-surface-600" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const mcpTools = [
  { icon: FilePlus, name: 'create_doc', desc: 'Generate professional docs, specs, and notes directly inside any project.' },
  { icon: Building2, name: 'create_organization', desc: 'Spin up new workspaces with a single prompt from Claude.' },
  { icon: FolderKanban, name: 'create_project', desc: 'Create projects with descriptions, deadlines, and team assignments.' },
  { icon: ListTodo, name: 'create_task', desc: 'Add tasks with priorities, statuses, assignees, and due dates.' },
  { icon: Eye, name: 'get_project', desc: 'Retrieve full project details including progress and team info.' },
  { icon: Search, name: 'list_docs', desc: 'Browse and search all documents across your projects.' },
  { icon: Building2, name: 'list_organizations', desc: 'View all your workspaces and their member counts.' },
  { icon: FolderKanban, name: 'list_projects', desc: 'See all projects with status, deadlines, and completion rates.' },
  { icon: ListTodo, name: 'list_tasks', desc: 'Filter and view tasks by status, priority, or assignee.' },
  { icon: PenLine, name: 'update_doc', desc: 'Edit and refine existing documents through conversation.' },
  { icon: RefreshCw, name: 'update_task', desc: 'Update status, priority, assignee, or any task field.' },
];

const connectionSteps = [
  { num: 1, title: 'Open LLM Settings', desc: 'In Claude (Settings → Connectors) or ChatGPT (Settings → Apps), enable Developer Mode or custom connectors.' },
  { num: 2, title: 'Add Waklum', desc: 'Search for "Waklum" or paste the MCP server URL. Click Connect/Add to begin the flow.' },
  { num: 3, title: 'Authorize Access', desc: 'Sign in with your Waklum account or provide your API key to grant permissions.' },
  { num: 4, title: 'Start Using', desc: 'That\'s it! Ask Claude or ChatGPT to create projects, manage tasks, write docs — all through natural conversation.' },
];

function ClaudeIntegration() {
  return (
    <section id="claude-integration" className="py-24 px-6 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-500/5 rounded-full blur-[100px]" />

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Plug className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Claude & ChatGPT MCP Integration</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-surface-100 mb-4">
            Connect to Claude & ChatGPT in{' '}
            <span className="bg-gradient-to-r from-purple-400 to-brand-400 bg-clip-text text-transparent">60 Seconds</span>
          </h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">
            Add Waklum as a connector or app in Claude or ChatGPT and unlock full AI-powered project management — right from your chat.
          </p>
        </div>

        {/* Connection Guide */}
        <div className="grid lg:grid-cols-2 gap-10 items-start mb-24">
          {/* Left: Steps */}
          <div className="space-y-6">
            {connectionSteps.map((step) => (
              <div key={step.num} className="group flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center shrink-0 group-hover:from-brand-500/30 group-hover:to-purple-500/30 transition-all">
                  <span className="text-sm font-bold text-brand-600">{step.num}</span>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-surface-100 mb-1">{step.title}</h4>
                  <p className="text-sm text-surface-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}

            {/* MCP URL */}
            <div className="mt-8 bg-surface-900/50 border border-surface-700 rounded-xl p-4">
              <p className="text-xs text-surface-500 mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                MCP Server Endpoint
              </p>
              <div className="flex items-center gap-3">
                <code className="text-sm text-brand-600 font-mono flex-1">{MCP_URL}</code>
                <button
                  onClick={() => navigator.clipboard?.writeText(MCP_URL)}
                  className="p-1.5 rounded-lg bg-surface-900 hover:bg-surface-800 text-surface-400 hover:text-surface-100 transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Visual mockup of Claude connectors panel */}
          <div className="bg-panel/80 backdrop-blur-xl border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-800 bg-surface-900/50">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-surface-500">Claude/ChatGPT — Connectors & Apps</span>
            </div>

            <div className="p-5">
              {/* Connector header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
                      Waklum
                      <span className="text-[10px] font-medium bg-brand-500/20 text-brand-600 px-2 py-0.5 rounded-full">CUSTOM</span>
                    </h4>
                  </div>
                </div>
                <span className="text-xs font-medium text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Connected</span>
              </div>

              {/* URL */}
              <div className="flex items-center gap-2 text-xs text-surface-500 mb-5 pl-1">
                <ExternalLink className="w-3 h-3" />
                <span className="font-mono">{MCP_URL}</span>
              </div>

              {/* Tool permissions */}
              <div className="border-t border-surface-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-surface-300 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-surface-500" />
                    Tool permissions
                  </p>
                  <span className="text-[10px] text-surface-500">11 tools</span>
                </div>
                <div className="space-y-1">
                  {['create_project', 'create_task', 'create_doc', 'list_projects', 'list_tasks'].map((tool) => (
                    <div key={tool} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-900 transition-colors">
                      <span className="text-xs text-surface-300 font-mono">{tool}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
                          <CheckSquare className="w-3 h-3 text-green-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 py-1.5 px-2 text-xs text-surface-500">
                    <CircleDot className="w-3 h-3" />
                    <span>+ 6 more tools available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What You Get - MCP Tools grid */}
        <div>
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-surface-100 mb-3">
              11 AI Tools, One Conversation
            </h3>
            <p className="text-surface-400 max-w-xl mx-auto">
              Once connected, Claude or ChatGPT gets access to these Waklum tools — letting them fully manage your projects through natural language.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mcpTools.map((tool, i) => (
              <div key={i} className="group bg-panel/40 border border-surface-800 rounded-xl p-5 hover:border-purple-500/30 hover:bg-panel/70 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/15 to-brand-500/15 border border-purple-500/20 flex items-center justify-center group-hover:from-purple-500/25 group-hover:to-brand-500/25 transition-all">
                    <tool.icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <code className="text-sm font-mono text-surface-100">{tool.name}</code>
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link href="/signup" className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-purple-500 to-brand-500 rounded-xl hover:from-purple-600 hover:to-brand-600 transition-all shadow-xl shadow-purple-500/20">
              Connect Waklum to your LLM
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-xs text-surface-500 mt-3">Free plan includes 100 MCP calls per month</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const plans = [
  { name: 'Free', price: '$0', period: '/forever', desc: 'For individuals getting started', features: ['1 workspace', '2 projects', '3 team members', '50 AI calls/month', '500 MB storage', 'MCP connector (100 calls/mo)'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '$6', period: '/month', desc: 'For growing teams', features: ['Up to 3 workspaces', 'Unlimited projects', 'Up to 25 members', '500 AI calls/month', '25 GB storage', 'MCP connector (1,000 calls/mo)', 'AI docs & smart context', 'Timeline & analytics'], cta: 'Get Started', highlight: true },
  { name: 'Team', price: '$12', period: '/month', desc: 'For organizations & agencies', features: ['Unlimited workspaces', 'Everything in Pro', 'Unlimited members', 'Unlimited AI calls', '500 GB storage', 'Unlimited MCP calls'], cta: 'Get Started', highlight: false },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-4">Simple, transparent pricing</h2>
          <p className="text-surface-400 text-lg">Start free. Scale as you grow.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <div key={i} className={`rounded-2xl p-8 border ${p.highlight ? 'bg-gradient-to-b from-brand-500/10 to-purple-500/5 border-brand-500/30 shadow-xl shadow-brand-500/10' : 'bg-panel/50 border-white/5'}`}>
              {p.highlight && <span className="text-xs font-semibold text-brand-600 bg-brand-500/10 px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="text-xl font-bold text-surface-100 mt-3">{p.name}</h3>
              <div className="mt-4 mb-2">
                <span className="text-4xl font-bold text-surface-100">{p.price}</span>
                <span className="text-surface-500 text-sm">{p.period}</span>
              </div>
              <p className="text-sm text-surface-400 mb-6">{p.desc}</p>
              <Link href="/signup" className={`block text-center py-3 rounded-xl text-sm font-semibold transition-all ${p.highlight ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-lg shadow-brand-500/20' : 'bg-white/5 text-surface-300 hover:bg-white/10 border border-white/10'}`}>
                {p.cta}
              </Link>
              <ul className="mt-6 space-y-3">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-surface-300">
                    <CheckSquare className="w-4 h-4 text-brand-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, sending, sent, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('sent');
        setForm({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="py-24 px-6 bg-panel/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-surface-100 mb-4">Get in touch</h2>
          <p className="text-surface-400 text-lg">Questions, feedback, or partnership inquiries — we&apos;d love to hear from you.</p>
        </div>
        
        {status === 'sent' ? (
          <div className="text-center py-12 bg-panel/50 border border-brand-500/20 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="text-xl font-semibold text-surface-100 mb-2">Message sent!</h3>
            <p className="text-surface-400">Thanks for reaching out. We&apos;ll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-900/50 border border-surface-700 rounded-xl text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
                  placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-900/50 border border-surface-700 rounded-xl text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
                  placeholder="you@company.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Message</label>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 bg-surface-900/50 border border-surface-700 rounded-xl text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors resize-none"
                placeholder="Tell us how we can help..." />
            </div>
            {status === 'error' && <p className="text-sm text-red-400">Something went wrong. Please try again.</p>}
            <button type="submit" disabled={status === 'sending'}
              className="w-full py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {status === 'sending' ? 'Sending...' : 'Send Message'}
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-surface-800 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-surface-100">Waklum</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-surface-500">
          <a href="#features" className="hover:text-surface-100 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-surface-100 transition-colors">Pricing</a>
          <a href="#contact" className="hover:text-surface-100 transition-colors">Contact</a>
          <Link href="/login" className="hover:text-surface-100 transition-colors">Login</Link>
        </div>
        <p className="text-xs text-surface-600">© 2026 Waklum. Open source under the MIT licence.</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <ClaudeIntegration />
      <Pricing />
      <ContactForm />
      <Footer />
    </main>
  );
}
