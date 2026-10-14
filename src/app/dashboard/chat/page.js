"use client"

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bot, Loader2, Sparkles, FolderKanban, CheckSquare,
  Users, AlertCircle, Brain, ChevronDown, Copy, Check,
  RefreshCw, Square, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import Markdown from 'react-markdown';

const TOOL_LABELS = {
  getProjects: 'Fetching projects',
  createProject: 'Creating project',
  getProjectDetails: 'Loading project details',
  getTeamMembers: 'Fetching team members',
  getTasks: 'Fetching tasks',
  createTask: 'Creating task',
  getTaskDetails: 'Loading task details',
  updateTask: 'Updating task',
  updateTaskStatus: 'Updating status',
  assignTask: 'Assigning task',
  addAssignees: 'Adding assignees',
};

const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="text-surface-100 font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
  li: ({ children }) => <li className="text-surface-300">{children}</li>,
  h1: ({ children }) => <h3 className="text-surface-100 font-bold text-base mb-2 mt-4">{children}</h3>,
  h2: ({ children }) => <h4 className="text-surface-100 font-bold text-sm mb-2 mt-3">{children}</h4>,
  h3: ({ children }) => <h5 className="text-surface-100 font-semibold text-sm mb-1.5 mt-2">{children}</h5>,
  code: ({ children }) => <code className="bg-surface-800 px-1.5 py-0.5 rounded text-brand-600 text-[13px] font-mono">{children}</code>,
  pre: ({ children }) => <pre className="bg-surface-900 border border-surface-800 rounded-lg p-3 my-3 overflow-x-auto text-[13px]">{children}</pre>,
  a: ({ href, children }) => <a href={href} className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
};

// Normalize an AI SDK tool part across v4/v5/v6 shapes → { name, done, error }
function normalizeToolPart(part) {
  if (part.type === 'tool-invocation') {
    return { name: part.toolName, done: part.state === 'result', error: false };
  }
  if (part.type === 'dynamic-tool') {
    return { name: part.toolName, done: part.state === 'output-available', error: part.state === 'output-error' };
  }
  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return { name: part.type.slice(5), done: part.state === 'output-available', error: part.state === 'output-error' };
  }
  return null;
}

// ─── Collapsible reasoning / "thinking" block ─────────────
function ReasoningBlock({ text, streaming }) {
  const [open, setOpen] = useState(streaming);
  const bodyRef = useRef(null);

  useEffect(() => { if (!streaming) setOpen(false); }, [streaming]);
  useEffect(() => {
    if (open && streaming && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [text, open, streaming]);

  if (!text?.trim() && !streaming) return null;

  return (
    <div className="mb-2.5 rounded-xl border border-surface-800 bg-surface-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-surface-400 hover:text-surface-200 transition-colors cursor-pointer"
      >
        <Brain className={`h-3.5 w-3.5 ${streaming ? 'text-brand-600' : 'text-surface-500'}`} />
        {streaming
          ? <span className="pw-shimmer">Thinking…</span>
          : <span>Thought process</span>}
        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={bodyRef}
          className="px-3 pb-3 pt-2 max-h-56 overflow-y-auto text-[13px] leading-relaxed text-surface-400 whitespace-pre-wrap border-t border-surface-800/70"
        >
          {text || 'Reasoning…'}
        </div>
      )}
    </div>
  );
}

// ─── Tool activity chip ───────────────────────────────────
function ToolChip({ name, done, error }) {
  const label = TOOL_LABELS[name] || (name ? `Running ${name}` : 'Working');
  return (
    <div className={`inline-flex items-center gap-1.5 my-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
      error
        ? 'border-red-500/20 bg-red-500/10 text-red-300'
        : done
          ? 'border-surface-700/60 bg-surface-800/50 text-surface-400'
          : 'border-brand-500/20 bg-brand-500/10 text-brand-600'
    }`}>
      {error ? <AlertCircle className="h-3 w-3" />
        : done ? <Check className="h-3 w-3 text-emerald-400" />
        : <Loader2 className="h-3 w-3 animate-spin" />}
      <span>{label}{done || error ? '' : '…'}</span>
    </div>
  );
}

// ─── Copy-to-clipboard button ─────────────────────────────
function CopyButton({ getText }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy message"
      onClick={() => {
        navigator.clipboard?.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-100 px-1.5 py-1 rounded-md hover:bg-surface-800 transition-colors cursor-pointer"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [input, setInput] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [initialMessages, setInitialMessages] = useState([]);
  const [atBottom, setAtBottom] = useState(true);

  const orgId = activeOrganization?._id;
  const orgName = activeOrganization?.name || 'Workspace';

  // Load chat history from DB on mount (scoped to org)
  useEffect(() => {
    if (!orgId) return;
    setHistoryLoaded(false);
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/chat/history?orgId=${orgId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setInitialMessages(data.messages.map((m, i) => ({
              id: `history-${i}`,
              role: m.role,
              content: m.content || '',
              parts: m.parts || [{ type: 'text', text: m.content || '' }],
            })));
          } else {
            setInitialMessages([]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [orgId]);

  const { messages, sendMessage, status, error, setMessages, regenerate, stop, clearError } = useChat({
    id: `project-assistant-${orgId}`,
    initialMessages,
    body: { orgId },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll only when the user is already at the bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom('smooth');
  }, [messages, atBottom, scrollToBottom]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(near);
  };

  const submit = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setAtBottom(true);
    await sendMessage({ text: trimmed });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    submit(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const newChat = async () => {
    try {
      await fetch(`/api/chat/history?orgId=${orgId}`, { method: 'DELETE' });
    } catch {}
    setMessages([]);
  };

  // Render the parts of a single message in order
  const renderMessageParts = (message, active) => {
    if (!message.parts || message.parts.length === 0) return null;
    const lastTextIdx = message.parts.map((p) => p.type).lastIndexOf('text');

    return message.parts.map((part, index) => {
      if (part.type === 'reasoning') {
        return (
          <ReasoningBlock
            key={`reason-${index}`}
            text={part.text}
            streaming={active && part.state !== 'done'}
          />
        );
      }

      if (part.type === 'text') {
        if (!part.text) return null;
        if (message.role === 'user') {
          return (
            <div key={`text-${index}`} className="text-[15px] leading-relaxed text-surface-100 whitespace-pre-wrap">
              {part.text}
            </div>
          );
        }
        const showCaret = active && index === lastTextIdx;
        return (
          <div key={`text-${index}`} className="text-[15px] leading-relaxed text-surface-200 prose prose-invert prose-sm max-w-none">
            <Markdown components={MARKDOWN_COMPONENTS}>{part.text}</Markdown>
            {showCaret && <span className="pw-caret" aria-hidden="true">▍</span>}
          </div>
        );
      }

      const toolInfo = normalizeToolPart(part);
      if (toolInfo) {
        return <ToolChip key={part.toolCallId || `tool-${index}`} {...toolInfo} />;
      }

      return null;
    });
  };

  const messageText = (m) =>
    (m.parts || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n').trim();

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  // ─── Empty state ────────────────────────────────────────
  const renderEmptyState = () => (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center border border-brand-500/10 pw-glow">
          <Sparkles className="h-8 w-8 text-brand-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-surface-100 mb-2 text-center">How can I help you today?</h2>
      <p className="text-surface-400 text-center max-w-lg mb-10 leading-relaxed">
        I&apos;m your AI project manager for <span className="text-brand-600 font-medium">{orgName}</span>.
        I can create tasks, assign team members, manage projects, and more.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {[
          { text: "Who's on my team and what are they working on?", icon: Users, color: 'text-purple-400', bg: 'hover:border-purple-500/30' },
          { text: 'Show me all my projects with their progress', icon: FolderKanban, color: 'text-brand-600', bg: 'hover:border-brand-500/30' },
          { text: "Create a task 'Design Landing Page' and assign it", icon: CheckSquare, color: 'text-emerald-400', bg: 'hover:border-emerald-500/30' },
          { text: 'What tasks are overdue or urgent?', icon: AlertCircle, color: 'text-red-400', bg: 'hover:border-red-500/30' },
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => submit(prompt.text)}
            className={`group flex items-start gap-3 p-4 rounded-xl border border-surface-800/60 bg-surface-900/30 hover:bg-surface-900/60 text-sm text-surface-300 hover:text-surface-100 transition-all duration-200 text-left cursor-pointer ${prompt.bg}`}
          >
            <prompt.icon className={`h-5 w-5 ${prompt.color} shrink-0 mt-0.5`} />
            <span className="leading-snug">{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative">
      <style>{`
        @keyframes pw-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes pw-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes pw-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.25) } 50% { box-shadow: 0 0 28px 4px rgba(99,102,241,0.28) } }
        .pw-shimmer {
          background: linear-gradient(90deg, #64748b 0%, #f1f5f9 50%, #64748b 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: pw-shimmer 1.6s linear infinite;
        }
        .pw-caret { display: inline-block; margin-left: 1px; color: #818cf8; animation: pw-blink 1s step-end infinite; }
        .pw-glow { animation: pw-glow 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pw-shimmer, .pw-caret, .pw-glow { animation: none !important }
          .pw-shimmer { color: #cbd5e1 }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-surface-100">Project Assistant</h1>
            <p className="text-xs text-surface-500">{orgName}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={newChat}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-100 px-3 py-1.5 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {!historyLoaded ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              const active = isLoading && m.id === lastAssistantId;
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                  {!isUser && (
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div className={`group flex flex-col gap-1 ${isUser ? 'items-end max-w-[78%]' : 'items-start max-w-[85%]'}`}>
                    {isUser ? (
                      <div className="bg-brand-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md">
                        {renderMessageParts(m, false)}
                      </div>
                    ) : (
                      <>
                        <div className="w-full">{renderMessageParts(m, active)}</div>
                        {!active && messageText(m) && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton getText={() => messageText(m)} />
                            {m.id === lastAssistantId && (
                              <button
                                type="button"
                                onClick={() => { setAtBottom(true); regenerate(); }}
                                className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-100 px-1.5 py-1 rounded-md hover:bg-surface-800 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> Retry
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pre-response typing indicator */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 py-2" aria-label="Assistant is thinking">
                  <span className="h-2 w-2 bg-surface-500 rounded-full animate-bounce" />
                  <span className="h-2 w-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="h-2 w-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}

            {error && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-md">
                  <p className="text-sm text-red-300 mb-2">{error.message || 'Something went wrong. Please try again.'}</p>
                  <button
                    type="button"
                    onClick={() => { clearError?.(); setAtBottom(true); regenerate(); }}
                    className="text-xs text-red-300 hover:text-surface-100 underline underline-offset-2 cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll-to-bottom */}
      {!atBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => { setAtBottom(true); scrollToBottom('smooth'); }}
          aria-label="Scroll to latest"
          className="absolute bottom-28 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-surface-800 border border-surface-700 text-surface-200 hover:text-surface-100 hover:bg-surface-700 flex items-center justify-center shadow-lg transition-colors cursor-pointer z-10"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Composer */}
      <div className="px-4 py-4 shrink-0">
        <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-surface-900 border border-surface-700/50 transition-all focus-within:border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:shadow-[0_0_30px_-8px_rgba(99,102,241,0.45)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${orgName} assistant…`}
              rows={1}
              aria-label="Message the assistant"
              className="w-full bg-transparent border-0 text-surface-100 text-[15px] placeholder:text-surface-500 resize-none px-4 pt-3.5 pb-1 focus:outline-none min-h-[44px] max-h-[200px]"
            />
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-surface-400 bg-surface-800/60 border border-surface-700/50 rounded-full px-2 py-0.5">
                <Sparkles className="h-3 w-3 text-brand-600" /> Gemini 2.5 Flash
              </span>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-surface-600">
                  <kbd className="font-sans">⏎</kbd> send
                  <span className="text-surface-700">·</span>
                  <kbd className="font-sans">⇧⏎</kbd> new line
                </span>
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop generating"
                    className="h-8 w-8 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send message"
                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 hover:brightness-110 disabled:from-surface-700 disabled:to-surface-700 disabled:text-surface-500 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-surface-600 mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </form>
      </div>
    </div>
  );
}
