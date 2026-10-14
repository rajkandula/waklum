"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, FileText, Search, Trash2, Edit3, Save, X, 
  Clock, ChevronRight, File, FolderOpen, GripVertical,
  Bold, Italic, List, ListOrdered, Link2, Code, Heading1, Heading2, Quote,
  Sparkles, Loader2, Eye, RotateCcw, Image as ImageIcon
} from 'lucide-react';

export default function ProjectDocsPage({ params }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [visualPrompt, setVisualPrompt] = useState('');
  const [generatedSvg, setGeneratedSvg] = useState('');
  const [generatingVisual, setGeneratingVisual] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, [projectId]);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/docs`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.docs || []);
        // Auto-select first doc
        if (!selectedDoc && data.docs?.length > 0) {
          setSelectedDoc(data.docs[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch docs', e);
    } finally {
      setLoading(false);
    }
  };

  const createDoc = async () => {
    if (!newDocTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newDocTitle.trim(),
          content: ''
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newDoc = data.doc;
        setDocs(prev => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
        setIsEditing(true);
        setEditTitle(newDoc.title);
        setEditContent('');
        setNewDocTitle('');
        setShowNewDoc(false);
      }
    } catch (e) {
      console.error('Failed to create doc', e);
    }
  };

  const saveDoc = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/docs/${selectedDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editTitle, 
          content: editContent 
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.doc;
        setDocs(prev => prev.map(d => d._id === updated._id ? updated : d));
        setSelectedDoc(updated);
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Failed to save doc', e);
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (docId) => {
    if (!confirm('Delete this document permanently?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/docs/${docId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocs(prev => prev.filter(d => d._id !== docId));
        if (selectedDoc?._id === docId) {
          setSelectedDoc(null);
          setIsEditing(false);
        }
      }
    } catch (e) {
      console.error('Failed to delete doc', e);
    }
  };

  const startEditing = () => {
    if (selectedDoc) {
      setEditTitle(selectedDoc.title);
      setEditContent(selectedDoc.content || '');
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  // Insert formatting at cursor
  const insertFormat = (prefix, suffix = '') => {
    const textarea = document.getElementById('doc-editor');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);
    const newText = editContent.substring(0, start) + prefix + selectedText + suffix + editContent.substring(end);
    setEditContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const generateVisual = async () => {
    if (!visualPrompt.trim()) return;
    setGeneratingVisual(true);
    setGeneratedSvg('');
    try {
      const res = await fetch('/api/ai/generate-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: visualPrompt,
          context: selectedDoc ? `Document: ${editTitle || selectedDoc.title}` : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSvg(data.svg);
      } else {
        alert('Failed to generate visual. Please try again.');
      }
    } catch (e) {
      console.error('Visual generation failed', e);
      alert('Failed to generate visual.');
    } finally {
      setGeneratingVisual(false);
    }
  };

  const insertVisual = () => {
    if (!generatedSvg) return;
    const visualBlock = `\n\n<!-- SVG_VISUAL -->\n${generatedSvg}\n<!-- /SVG_VISUAL -->\n\n`;
    setEditContent(prev => prev + visualBlock);
    setShowVisualModal(false);
    setVisualPrompt('');
    setGeneratedSvg('');
  };

  const filteredDocs = docs.filter(d => 
    d.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex -m-6 overflow-hidden">
      {/* Docs Sidebar */}
      <div className="w-72 border-r border-surface-800 bg-surface-900/50 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-100 uppercase tracking-wider">Documents</h3>
            <button
              onClick={() => setShowNewDoc(true)}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* New doc input */}
          {showNewDoc && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createDoc()}
                placeholder="Document title..."
                autoFocus
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500"
              />
              <button onClick={createDoc} className="text-brand-600 hover:text-brand-500 p-1">
                <Save className="h-4 w-4" />
              </button>
              <button onClick={() => { setShowNewDoc(false); setNewDocTitle(''); }} className="text-surface-400 hover:text-surface-200 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              className="w-full bg-surface-800/50 border border-surface-700/50 rounded-lg pl-8 pr-3 py-1.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500/50"
            />
          </div>
        </div>

        {/* Doc List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-surface-600 mb-3" />
              <p className="text-sm text-surface-400">No documents yet</p>
              <button
                onClick={() => setShowNewDoc(true)}
                className="mt-2 text-sm text-brand-600 hover:text-brand-500"
              >
                Create your first doc
              </button>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc._id}
                onClick={() => { setSelectedDoc(doc); setIsEditing(false); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') { setSelectedDoc(doc); setIsEditing(false); } }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors group mb-1 cursor-pointer ${
                  selectedDoc?._id === doc._id 
                    ? 'bg-brand-500/10 border border-brand-500/20' 
                    : 'hover:bg-surface-800/50 border border-transparent'
                }`}
              >
                <FileText className={`h-4 w-4 mt-0.5 shrink-0 ${
                  selectedDoc?._id === doc._id ? 'text-brand-600' : 'text-surface-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    selectedDoc?._id === doc._id ? 'text-surface-100' : 'text-surface-300'
                  }`}>
                    {doc.title}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {doc.updatedAt 
                      ? new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Just now'
                    }
                    {doc.createdBy?.name && ` · ${doc.createdBy.name}`}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDoc(doc._id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-surface-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedDoc ? (
          <>
            {/* Doc Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-surface-800 bg-surface-900/30">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="text-xl font-bold text-surface-100 bg-transparent border-none outline-none w-full placeholder-surface-500"
                    placeholder="Document title..."
                  />
                ) : (
                  <h2 className="text-xl font-bold text-surface-100 truncate">{selectedDoc.title}</h2>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last edited {selectedDoc.updatedAt 
                      ? new Date(selectedDoc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'just now'
                    }
                  </span>
                  {selectedDoc.createdBy?.name && (
                    <span>by {selectedDoc.createdBy.name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button
                      onClick={saveDoc}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              </div>
            </div>

            {/* Editor Toolbar (editing mode) */}
            {isEditing && (
              <div className="flex items-center gap-1 px-8 py-2 border-b border-surface-800 bg-surface-900/20">
                <ToolbarBtn icon={<Bold className="h-3.5 w-3.5" />} onClick={() => insertFormat('**', '**')} title="Bold" />
                <ToolbarBtn icon={<Italic className="h-3.5 w-3.5" />} onClick={() => insertFormat('*', '*')} title="Italic" />
                <div className="w-px h-5 bg-surface-700 mx-1" />
                <ToolbarBtn icon={<Heading1 className="h-3.5 w-3.5" />} onClick={() => insertFormat('# ')} title="Heading 1" />
                <ToolbarBtn icon={<Heading2 className="h-3.5 w-3.5" />} onClick={() => insertFormat('## ')} title="Heading 2" />
                <div className="w-px h-5 bg-surface-700 mx-1" />
                <ToolbarBtn icon={<List className="h-3.5 w-3.5" />} onClick={() => insertFormat('- ')} title="Bullet List" />
                <ToolbarBtn icon={<ListOrdered className="h-3.5 w-3.5" />} onClick={() => insertFormat('1. ')} title="Numbered List" />
                <div className="w-px h-5 bg-surface-700 mx-1" />
                <ToolbarBtn icon={<Code className="h-3.5 w-3.5" />} onClick={() => insertFormat('`', '`')} title="Inline Code" />
                <ToolbarBtn icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => insertFormat('[', '](url)')} title="Link" />
                <ToolbarBtn icon={<Quote className="h-3.5 w-3.5" />} onClick={() => insertFormat('> ')} title="Quote" />
                <div className="w-px h-5 bg-surface-700 mx-1" />
                <button
                  onClick={() => setShowVisualModal(true)}
                  title="Add AI Visual"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-500/15 to-brand-500/15 border border-purple-500/25 text-purple-300 hover:from-purple-500/25 hover:to-brand-500/25 hover:text-purple-200 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Add Visual
                </button>
              </div>
            )}

            {/* Doc Content */}
            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <textarea
                  id="doc-editor"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Start writing your documentation here...&#10;&#10;Use Markdown formatting: # Headings, **bold**, *italic*, `code`, - lists"
                  className="w-full h-full resize-none bg-transparent text-surface-200 p-8 text-sm leading-relaxed font-mono placeholder-surface-600 focus:outline-none"
                  style={{ minHeight: 'calc(100vh - 320px)' }}
                />
              ) : (
                <div className="p-8 max-w-4xl">
                  {selectedDoc.content ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <MarkdownRenderer content={selectedDoc.content} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-12 w-12 text-surface-600 mb-4" />
                      <p className="text-surface-400 mb-2">This document is empty</p>
                      <button
                        onClick={startEditing}
                        className="text-sm text-brand-600 hover:text-brand-500 flex items-center gap-1"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Start writing
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* No doc selected */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-surface-800/50 mb-4">
              <FileText className="h-8 w-8 text-surface-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-100 mb-1">Project Documentation</h3>
            <p className="text-sm text-surface-400 max-w-md mb-4">
              Create and organize your project docs, notes, specs, and meeting notes all in one place.
            </p>
            <button
              onClick={() => setShowNewDoc(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              <Plus className="h-4 w-4" /> Create Document
            </button>
          </div>
        )}
      </div>

      {/* Generate Visual Modal */}
      {showVisualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-panel border border-surface-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-surface-100">Generate AI Visual</h3>
                  <p className="text-xs text-surface-500">Describe the diagram you want to create</p>
                </div>
              </div>
              <button onClick={() => { setShowVisualModal(false); setVisualPrompt(''); setGeneratedSvg(''); }} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Prompt input */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Describe your diagram</label>
                <textarea
                  value={visualPrompt}
                  onChange={e => setVisualPrompt(e.target.value)}
                  placeholder="e.g. A 3-tier architecture diagram showing Frontend (React), API (Node.js), and Database (MongoDB) layers with arrows showing data flow..."
                  rows={3}
                  className="w-full bg-surface-900/50 border border-surface-700 rounded-xl px-4 py-3 text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                />
              </div>

              {/* Quick templates */}
              <div className="flex flex-wrap gap-2">
                {['Architecture diagram', 'Flowchart', 'Data flow', 'Timeline', 'Hierarchy'].map(t => (
                  <button key={t} onClick={() => setVisualPrompt(prev => prev ? prev + '. ' + t + ' style.' : t + ' showing ')} className="text-xs px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-800 text-surface-400 hover:text-surface-100 hover:border-purple-500/30 transition-all">
                    {t}
                  </button>
                ))}
              </div>

              {/* Generate button */}
              <button
                onClick={generateVisual}
                disabled={!visualPrompt.trim() || generatingVisual}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-brand-500 text-white hover:from-purple-600 hover:to-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              >
                {generatingVisual ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Visual</>
                )}
              </button>

              {/* Preview */}
              {generatedSvg && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-surface-300 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</p>
                    <button onClick={generateVisual} disabled={generatingVisual} className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-100 transition-colors">
                      <RotateCcw className="h-3 w-3" /> Regenerate
                    </button>
                  </div>
                  <div className="bg-white rounded-xl p-4 overflow-auto max-h-72">
                    <div dangerouslySetInnerHTML={{ __html: generatedSvg }} style={{ maxWidth: '100%' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {generatedSvg && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-800">
                <button onClick={() => { setShowVisualModal(false); setVisualPrompt(''); setGeneratedSvg(''); }} className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors">
                  Cancel
                </button>
                <button onClick={insertVisual} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" /> Insert into Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({ icon, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center h-7 w-7 rounded text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
    >
      {icon}
    </button>
  );
}

// Simple Markdown renderer with SVG visual support
const SVG_OPEN = '<!-- SVG_VISUAL -->';
const SVG_CLOSE = '<!-- /SVG_VISUAL -->';

function MarkdownRenderer({ content }) {
  const segments = [];
  let rem = content;

  while (rem.length > 0) {
    const sIdx = rem.indexOf(SVG_OPEN);
    if (sIdx === -1) { segments.push({ type: 'text', content: rem }); break; }
    if (sIdx > 0) segments.push({ type: 'text', content: rem.substring(0, sIdx) });
    const eIdx = rem.indexOf(SVG_CLOSE, sIdx);
    if (eIdx === -1) { segments.push({ type: 'text', content: rem.substring(sIdx) }); break; }
    segments.push({ type: 'svg', content: rem.substring(sIdx + SVG_OPEN.length, eIdx).trim() });
    rem = rem.substring(eIdx + SVG_CLOSE.length);
  }
  
  return (
    <>
      {segments.map((seg, si) => {
        if (seg.type === 'svg') {
          // Render the SVG via an <img> data-URI. Browsers run img-loaded SVG in a
          // secure static mode (no scripts, no external fetches), which neutralizes
          // stored XSS from doc content authored via the editor or the MCP API.
          const raw = seg.content.trim();
          const isSvg = raw.startsWith('<svg');
          const svg = isSvg && !/xmlns=/.test(raw)
            ? raw.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
            : raw;
          return (
            <div key={`svg-${si}`} className="my-6 bg-white rounded-xl border border-surface-700 p-5 overflow-auto shadow-sm">
              {isSvg ? (
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                  alt="AI-generated diagram"
                  className="block mx-auto max-w-full"
                />
              ) : (
                <pre className="text-xs text-surface-600 whitespace-pre-wrap">{raw}</pre>
              )}
              <p className="text-[10px] text-surface-500 mt-3 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> AI-generated diagram
              </p>
            </div>
          );
        }
        const lines = seg.content.split('\n');
        return <React.Fragment key={`t-${si}`}>{lines.map((l, i) => renderMdLine(l, i))}</React.Fragment>;
      })}
    </>
  );
}

function renderMdLine(line, i) {
  if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-surface-100 mt-6 mb-2">{renderInline(line.slice(4))}</h3>;
  if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-surface-100 mt-8 mb-3">{renderInline(line.slice(3))}</h2>;
  if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-surface-100 mt-8 mb-4">{renderInline(line.slice(2))}</h1>;
  if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-brand-500/50 pl-4 py-1 text-surface-300 italic my-2">{renderInline(line.slice(2))}</blockquote>;
  if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-surface-300 ml-4 list-disc my-1">{renderInline(line.slice(2))}</li>;
  const om = line.match(/^(\d+)\.\s/);
  if (om) return <li key={i} className="text-surface-300 ml-4 list-decimal my-1">{renderInline(line.slice(om[0].length))}</li>;
  if (line.trim() === '---' || line.trim() === '***') return <hr key={i} className="border-surface-700 my-6" />;
  if (line.trim() === '') return <div key={i} className="h-3" />;
  return <p key={i} className="text-surface-300 leading-relaxed my-1.5">{renderInline(line)}</p>;
}

function renderInline(text) {
  const parts = [];
  let r = text;
  let k = 0;
  while (r.length > 0) {
    const cm = r.match(/`([^`]+)`/);
    const bm = r.match(/\*\*([^*]+)\*\*/);
    const im = r.match(/\*([^*]+)\*/);
    const lm = r.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const ms = [cm && { m: cm, t: 'c' }, bm && { m: bm, t: 'b' }, im && { m: im, t: 'i' }, lm && { m: lm, t: 'l' }].filter(Boolean).sort((a, b) => a.m.index - b.m.index);
    if (!ms.length) { parts.push(r); break; }
    const f = ms[0];
    if (f.m.index > 0) parts.push(r.substring(0, f.m.index));
    if (f.t === 'c') parts.push(<code key={k++} className="bg-surface-800 text-brand-600 px-1.5 py-0.5 rounded text-xs font-mono">{f.m[1]}</code>);
    else if (f.t === 'b') parts.push(<strong key={k++} className="text-surface-100 font-semibold">{f.m[1]}</strong>);
    else if (f.t === 'i') parts.push(<em key={k++} className="text-surface-200">{f.m[1]}</em>);
    else if (f.t === 'l') parts.push(<a key={k++} href={f.m[2]} target="_blank" rel="noopener" className="text-brand-600 hover:text-brand-500 underline">{f.m[1]}</a>);
    r = r.substring(f.m.index + f.m[0].length);
  }
  return parts;
}
