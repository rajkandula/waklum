"use client"

import { useState, useEffect } from 'react';
// Full-page slide panel (no Dialog needed)
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, Clock, User, Tag, Flag, MessageSquare, 
  CheckSquare, Send, Loader2, Plus, X, Paperclip, FileText,
  Upload, Trash2, Link2, ExternalLink, Image, Film, File,
  ArrowRight, Activity as ActivityIcon, GitCommitHorizontal,
  UserPlus, ChevronDown, Shield, Edit3
} from 'lucide-react';

const PRIORITY_COLORS = {
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const STATUS_COLORS = {
  backlog: 'bg-surface-700 text-surface-300',
  todo: 'bg-blue-500/10 text-blue-400',
  'in-progress': 'bg-purple-500/10 text-purple-400',
  review: 'bg-yellow-500/10 text-yellow-400',
  done: 'bg-green-500/10 text-green-400',
};

export default function TaskDetailModal({ isOpen, onClose, taskId, projectId, onUpdate }) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [uploading, setUploading] = useState(false);
  const [projectDocs, setProjectDocs] = useState([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingTime, setEditingTime] = useState(false);
  const [loggedDraft, setLoggedDraft] = useState('');
  const [estimatedDraft, setEstimatedDraft] = useState('');

  useEffect(() => {
    if (isOpen && taskId) {
      setActiveTab('details');
      setShowAssigneeDropdown(false);
      setEditingDescription(false);
      fetchTask();
      fetchComments();
      fetchActivities();
      if (projectId) {
        fetchProjectDocs();
        fetchProjectMembers();
      }
    }
  }, [isOpen, taskId]);

  // Permission checks
  const isCreator = task && user && (task.createdBy?._id === user._id || task.createdBy === user._id || task.reporter?._id === user._id || task.reporter === user._id);
  const isAssignee = task && user && (
    task.assignee?._id === user._id || task.assignee === user._id ||
    task.assignees?.some(a => (a._id || a) === user._id)
  );
  const canEdit = isCreator || isAssignee; // Creators and assignees can edit
  const canChangeStatus = isCreator || isAssignee; // Assignees can change status

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      setTask(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.comments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error(e);
    }
    setActivitiesLoading(false);
  };

  const fetchProjectDocs = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/docs`);
      if (res.ok) { const d = await res.json(); setProjectDocs(d.docs || []); }
    } catch (e) { console.error(e); }
  };

  const fetchProjectMembers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const proj = data.project || data;
        setProjectMembers(proj.members?.map(m => m.user) || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        const comment = data.comment || data;
        setComments(prev => [...prev, comment]);
        setNewComment('');
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const updateTask = async (updates) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.task || data;
        setTask(updated);
        onUpdate?.(updated);
      } else if (res.status === 403) {
        const err = await res.json();
        alert(err.error || 'You do not have permission to make this change');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSubtask = async (index) => {
    if (!task?.subtasks) return;
    const updated = [...task.subtasks];
    updated[index].completed = !updated[index].completed;
    await updateTask({ subtasks: updated });
  };

  const addSubtask = async (title) => {
    if (!title.trim()) return;
    const subtasks = [...(task?.subtasks || []), { title, completed: false }];
    await updateTask({ subtasks });
  };

  const subtasksDone = task?.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = task?.subtasks?.length || 0;
  const attachCount = (task?.attachments?.length || 0) + (task?.linkedDocs?.length || 0);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        // Upload file via server-side route (no bucket CORS setup needed)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);

        const uploadRes = await fetch('/api/upload/direct', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          console.error('Upload failed:', err.error);
          alert(`Upload failed for ${file.name}: ${err.error}`);
          continue;
        }

        const { publicUrl } = await uploadRes.json();

        // Save attachment reference to the task
        const attachRes = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add-attachment', name: file.name, url: publicUrl, size: file.size, type: file.type }),
        });
        if (attachRes.ok) { const d = await attachRes.json(); setTask(d.task); onUpdate?.(d.task); }
      } catch (err) { 
        console.error('Upload failed:', err);
        alert(`Upload failed for ${file.name}`);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleLinkDoc = async (docId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link-doc', docId }),
      });
      if (res.ok) { const d = await res.json(); setTask(d.task); onUpdate?.(d.task); setShowDocPicker(false); }
    } catch (e) { console.error(e); }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, { method: 'DELETE' });
      if (res.ok) { const d = await res.json(); setTask(d.task); onUpdate?.(d.task); }
    } catch (e) { console.error(e); }
  };

  const handleUnlinkDoc = async (docId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments?docId=${docId}`, { method: 'DELETE' });
      if (res.ok) { const d = await res.json(); setTask(d.task); onUpdate?.(d.task); }
    } catch (e) { console.error(e); }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image className="h-4 w-4 text-blue-400" />;
    if (type?.startsWith('video/')) return <Film className="h-4 w-4 text-purple-400" />;
    return <File className="h-4 w-4 text-surface-400" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatActivityAction = (activity) => {
    const { action, metadata } = activity;
    switch (action) {
      case 'status_changed':
        return (
          <>
            changed status from{' '}
            <span className="text-surface-200 font-medium capitalize">{metadata?.from?.replace('-', ' ')}</span>
            {' → '}
            <span className="text-surface-100 font-medium capitalize">{metadata?.to?.replace('-', ' ')}</span>
          </>
        );
      case 'priority_changed':
        return (
          <>
            changed priority from{' '}
            <span className="text-surface-200 font-medium capitalize">{metadata?.from}</span>
            {' → '}
            <span className="text-surface-100 font-medium capitalize">{metadata?.to}</span>
          </>
        );
      case 'assignee_changed':
        return (
          <>
            {metadata?.assigneeName 
              ? <>assigned to <span className="text-surface-100 font-medium">{metadata.assigneeName}</span></>
              : 'changed the assignee'
            }
          </>
        );
      default:
        return <span className="capitalize">{action?.replace(/_/g, ' ')}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Slide Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-surface-950 border-l border-surface-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : task ? (
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ''}`}>
                    {task.status?.replace('-', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[task.priority] || ''}`}>
                    <Flag className="h-3 w-3 inline mr-1" />
                    {task.priority}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-surface-100">{task.title}</h2>
              </div>
              <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Nav */}
            <div className="flex gap-1 border-b border-surface-800 mb-6">
              {['details', 'comments', 'subtasks', 'attachments', 'activity'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium capitalize transition-colors relative ${
                    activeTab === tab 
                      ? 'text-brand-600' 
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {tab}
                  {tab === 'comments' && comments.length > 0 && (
                    <span className="ml-1.5 text-xs bg-surface-800 px-1.5 py-0.5 rounded-full">{comments.length}</span>
                  )}
                  {tab === 'subtasks' && subtasksTotal > 0 && (
                    <span className="ml-1.5 text-xs bg-surface-800 px-1.5 py-0.5 rounded-full">{subtasksDone}/{subtasksTotal}</span>
                  )}
                  {tab === 'attachments' && attachCount > 0 && (
                    <span className="ml-1.5 text-xs bg-surface-800 px-1.5 py-0.5 rounded-full">{attachCount}</span>
                  )}
                  {tab === 'activity' && activities.length > 0 && (
                    <span className="ml-1.5 text-xs bg-surface-800 px-1.5 py-0.5 rounded-full">{activities.length}</span>
                  )}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'details' && (
                <div className="space-y-5">
                  {/* Permission Banner */}
                  {!canEdit && !canChangeStatus && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      You can view this task but cannot make changes. Only the creator, assignees, or project admins can edit.
                    </div>
                  )}
                  {isAssignee && !canEdit && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      You are assigned to this task. You can change the status and log hours.
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Description</label>
                      {canEdit && !editingDescription && (
                        <button onClick={() => { setEditingDescription(true); setDescDraft(task.description || ''); }} className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>
                    {editingDescription ? (
                      <div className="space-y-2">
                        <textarea
                          value={descDraft}
                          onChange={(e) => setDescDraft(e.target.value)}
                          className="w-full text-sm text-surface-200 bg-surface-900 rounded-lg p-3 min-h-[80px] border border-brand-500/30 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
                          placeholder="Add a description..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { updateTask({ description: descDraft }); setEditingDescription(false); }}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingDescription(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-surface-300 bg-surface-900/50 rounded-lg p-3 min-h-[60px] border border-surface-800">
                        {task.description || <span className="text-surface-600 italic">No description</span>}
                      </div>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Assignee */}
                    <div className="bg-surface-900/50 rounded-lg p-3 border border-surface-800 relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-xs text-surface-500">
                          <User className="h-3 w-3" /> Assignee
                        </div>
                        {canEdit && (
                          <button onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)} className="text-xs text-brand-600 hover:text-brand-500">
                            {task.assignee ? 'Change' : 'Assign'}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {task.assignee ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="text-xs bg-surface-700">{task.assignee.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-surface-100">{task.assignee.name}</span>
                            {canEdit && (
                              <button onClick={() => updateTask({ assignee: null })} className="ml-auto text-surface-500 hover:text-red-400 transition-colors" title="Unassign">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-surface-500">Unassigned</span>
                        )}
                      </div>
                      {/* Assignee Dropdown */}
                      {showAssigneeDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
                          {projectMembers.filter(m => m._id !== (task.assignee?._id || task.assignee)).map(member => (
                            <button
                              key={member._id}
                              onClick={() => { updateTask({ assignee: member._id }); setShowAssigneeDropdown(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-[10px] bg-surface-700">{member.name?.[0]}</AvatarFallback>
                              </Avatar>
                              {member.name}
                            </button>
                          ))}
                          {projectMembers.length === 0 && (
                            <p className="text-xs text-surface-500 text-center py-3">No project members found</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Due Date */}
                    <div className="bg-surface-900/50 rounded-lg p-3 border border-surface-800">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <Calendar className="h-3 w-3" /> Due Date
                      </div>
                      {canEdit ? (
                        <input
                          type="date"
                          value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateTask({ dueDate: e.target.value || null })}
                          className="text-sm text-surface-100 bg-transparent border-none p-0 focus:outline-none cursor-pointer w-full"
                        />
                      ) : (
                        <span className="text-sm text-surface-100">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                        </span>
                      )}
                    </div>

                    {/* Time Tracking */}
                    <div 
                      className={`bg-surface-900/50 rounded-lg p-3 border border-surface-800 ${canChangeStatus ? 'cursor-pointer hover:border-surface-600 transition-colors' : ''}`}
                      onClick={() => { if (canChangeStatus && !editingTime) { setEditingTime(true); setLoggedDraft(String(task.loggedHours || 0)); setEstimatedDraft(String(task.estimatedHours || '')); } }}
                    >
                      <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" /> Time Tracking
                        </div>
                        {canChangeStatus && !editingTime && <Edit3 className="h-3 w-3 text-surface-600" />}
                      </div>
                      {editingTime ? (
                        <div className="space-y-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-surface-500 block mb-0.5">Logged (h)</label>
                              <Input 
                                type="number" min="0" step="0.5" value={loggedDraft}
                                onChange={e => setLoggedDraft(e.target.value)}
                                className="h-7 text-xs bg-surface-800"
                                autoFocus
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-surface-500 block mb-0.5">Estimated (h)</label>
                              <Input 
                                type="number" min="0" step="0.5" value={estimatedDraft}
                                onChange={e => setEstimatedDraft(e.target.value)}
                                className="h-7 text-xs bg-surface-800"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Button 
                              size="sm" className="h-6 text-[11px] px-2" 
                              onClick={() => { updateTask({ loggedHours: parseFloat(loggedDraft) || 0, estimatedHours: parseFloat(estimatedDraft) || 0 }); setEditingTime(false); }}
                            >
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => setEditingTime(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-medium text-surface-100">{task.loggedHours || 0}h</span>
                          <span className="text-xs text-surface-500">/</span>
                          <span className="text-sm text-surface-300">{task.estimatedHours || '—'}h</span>
                          {task.estimatedHours > 0 && (
                            <div className="ml-2 flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  (task.loggedHours || 0) > task.estimatedHours ? 'bg-red-500' : 'bg-brand-500'
                                }`}
                                style={{ width: `${Math.min(100, ((task.loggedHours || 0) / task.estimatedHours) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Labels */}
                    <div className="bg-surface-900/50 rounded-lg p-3 border border-surface-800">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <Tag className="h-3 w-3" /> Labels
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {task.labels?.length ? task.labels.map((l, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{l}</Badge>
                        )) : <span className="text-sm text-surface-500">None</span>}
                      </div>
                    </div>
                  </div>

                  {/* Multiple Assignees */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Additional Assignees</label>
                      {canEdit && (
                        <AssigneeAdder
                          members={projectMembers.filter(m =>
                            m._id !== (task.assignee?._id || task.assignee) &&
                            !task.assignees?.some(a => (a._id || a) === m._id)
                          )}
                          onAdd={(memberId) => {
                            const current = task.assignees?.map(a => a._id || a) || [];
                            updateTask({ assignees: [...current, memberId] });
                          }}
                        />
                      )}
                    </div>
                    {task.assignees?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {task.assignees.map(a => (
                          <div key={a._id || a} className="flex items-center gap-2 bg-surface-900/50 border border-surface-800 rounded-full pl-1 pr-2 py-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={a.avatar} />
                              <AvatarFallback className="text-[10px] bg-surface-700">{a.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-surface-200">{a.name}</span>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  const updated = task.assignees.filter(x => (x._id || x) !== (a._id || a)).map(x => x._id || x);
                                  updateTask({ assignees: updated });
                                }}
                                className="text-surface-500 hover:text-red-400 ml-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-surface-600 italic">No additional assignees</p>
                    )}
                  </div>

                  {/* Created By */}
                  {(task.createdBy || task.reporter) && (
                    <div className="flex items-center gap-2 text-xs text-surface-500 pt-2 border-t border-surface-800">
                      <span>Created by</span>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={(task.createdBy || task.reporter)?.avatar} />
                        <AvatarFallback className="text-[8px] bg-surface-700">{(task.createdBy || task.reporter)?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-surface-300 font-medium">{(task.createdBy || task.reporter)?.name}</span>
                    </div>
                  )}

                  {/* Change Status */}
                  {canChangeStatus ? (
                    <div>
                      <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">Change Status</label>
                      <div className="flex flex-wrap gap-2">
                        {['backlog', 'todo', 'in-progress', 'review', 'done'].map(s => (
                          <button
                            key={s}
                            onClick={() => updateTask({ status: s })}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                              task.status === s 
                                ? `${STATUS_COLORS[s]} ring-2 ring-brand-500/30` 
                                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                            }`}
                          >
                            {s.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">Status</label>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ''}`}>
                        {task.status?.replace('-', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-8 w-8 text-surface-700 mx-auto mb-2" />
                        <p className="text-surface-500 text-sm">No comments yet. Start the conversation.</p>
                      </div>
                    ) : (
                      comments.map((c) => (
                        <div key={c._id} className="flex gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={c.author?.avatar} />
                            <AvatarFallback className="text-xs bg-surface-700">{c.author?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-surface-100">{c.author?.name}</span>
                              <span className="text-xs text-surface-600">
                                {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-sm text-surface-300 mt-1">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-surface-800">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 bg-surface-950 border-surface-800"
                    />
                    <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}

              {activeTab === 'subtasks' && (
                <div className="space-y-3">
                  {subtasksTotal > 0 && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-500 rounded-full transition-all duration-300" 
                          style={{ width: `${subtasksTotal ? (subtasksDone / subtasksTotal) * 100 : 0}%` }} 
                        />
                      </div>
                      <span className="text-xs text-surface-400 font-medium">{subtasksDone}/{subtasksTotal}</span>
                    </div>
                  )}

                  {task?.subtasks?.map((sub, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <button 
                        onClick={() => toggleSubtask(i)}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          sub.completed 
                            ? 'bg-brand-500 border-brand-500' 
                            : 'border-surface-600 hover:border-brand-500'
                        }`}
                      >
                        {sub.completed && <CheckSquare className="h-3 w-3 text-surface-100" />}
                      </button>
                      <span className={`text-sm flex-1 ${sub.completed ? 'text-surface-500 line-through' : 'text-surface-100'}`}>
                        {sub.title}
                      </span>
                    </div>
                  ))}

                  {(!task?.subtasks || task.subtasks.length === 0) && (
                    <div className="text-center py-6">
                      <CheckSquare className="h-8 w-8 text-surface-700 mx-auto mb-2" />
                      <p className="text-surface-500 text-sm">No subtasks yet</p>
                    </div>
                  )}

                  <SubtaskInput onAdd={addSubtask} />
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-5">
                  {/* Upload Area */}
                  <div className="relative">
                    <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-surface-700 rounded-xl cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors">
                      <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.zip" />
                      {uploading ? (
                        <><Loader2 className="h-8 w-8 text-brand-600 animate-spin mb-2" /><p className="text-sm text-surface-400">Uploading...</p></>
                      ) : (
                        <><Upload className="h-8 w-8 text-surface-500 mb-2" /><p className="text-sm text-surface-300 font-medium">Drop files or click to upload</p><p className="text-xs text-surface-500 mt-1">Images, videos, PDFs, documents</p></>
                      )}
                    </label>
                  </div>

                  {/* File Attachments */}
                  {task?.attachments?.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">Files</label>
                      <div className="space-y-2">
                        {task.attachments.map((att) => (
                          <div key={att._id} className="flex items-center gap-3 p-3 bg-surface-900/50 border border-surface-800 rounded-lg group hover:border-surface-700 transition-colors">
                            {att.fileType?.startsWith('image/') ? (
                              <div className="h-10 w-10 rounded-lg overflow-hidden bg-surface-800 shrink-0">
                                <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">{getFileIcon(att.fileType)}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-surface-200 truncate font-medium">{att.name}</p>
                              <p className="text-xs text-surface-500">{formatSize(att.size)} {att.uploadedBy?.name ? `· ${att.uploadedBy.name}` : ''}</p>
                            </div>
                            <a href={att.url} target="_blank" rel="noopener" className="p-1.5 text-surface-500 hover:text-brand-500 transition-colors" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
                            <button onClick={() => handleRemoveAttachment(att._id)} className="p-1.5 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Docs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Linked Docs</label>
                      <button onClick={() => setShowDocPicker(!showDocPicker)} className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1"><Link2 className="h-3 w-3" /> Link Doc</button>
                    </div>

                    {showDocPicker && (
                      <div className="mb-3 p-3 bg-surface-900/50 border border-surface-800 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                        {projectDocs.filter(d => !task?.linkedDocs?.some(ld => (ld._id || ld) === d._id)).length === 0 ? (
                          <p className="text-xs text-surface-500 text-center py-2">No docs available to link</p>
                        ) : (
                          projectDocs.filter(d => !task?.linkedDocs?.some(ld => (ld._id || ld) === d._id)).map(doc => (
                            <button key={doc._id} onClick={() => handleLinkDoc(doc._id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors">
                              <FileText className="h-3.5 w-3.5 text-surface-500 shrink-0" />{doc.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {task?.linkedDocs?.length > 0 ? (
                      <div className="space-y-2">
                        {task.linkedDocs.map((doc) => (
                          <div key={doc._id || doc} className="flex items-center gap-3 p-3 bg-surface-900/50 border border-surface-800 rounded-lg group hover:border-surface-700 transition-colors">
                            <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-brand-600" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-surface-200 truncate font-medium">{doc.title || 'Untitled'}</p>
                              <p className="text-xs text-surface-500">{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Project Doc'}</p>
                            </div>
                            <a href={`/dashboard/projects/${projectId}/docs`} className="p-1.5 text-surface-500 hover:text-brand-500 transition-colors" title="Open doc"><ExternalLink className="h-3.5 w-3.5" /></a>
                            <button onClick={() => handleUnlinkDoc(doc._id || doc)} className="p-1.5 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Unlink"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    ) : !showDocPicker && (
                      <p className="text-sm text-surface-500 text-center py-4">No docs linked yet</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-1">
                  {activitiesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-surface-500" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8">
                      <ActivityIcon className="h-8 w-8 text-surface-700 mx-auto mb-2" />
                      <p className="text-surface-500 text-sm">No activity recorded yet</p>
                      <p className="text-surface-600 text-xs mt-1">Changes to status, priority, and assignee will appear here</p>
                    </div>
                  ) : (
                    <div className="relative pl-6">
                      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-surface-800" />
                      {activities.map((a) => (
                        <div key={a._id} className="relative flex gap-3 py-3 group">
                          <div className="absolute left-[-15px] top-4 h-5 w-5 rounded-full bg-surface-900 border-2 border-surface-700 flex items-center justify-center z-10">
                            <GitCommitHorizontal className="h-2.5 w-2.5 text-surface-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-surface-300">
                              <span className="text-surface-100 font-medium">{a.actor?.name || 'Someone'}</span>
                              {' '}
                              {formatActivityAction(a)}
                            </p>
                            <p className="text-xs text-surface-600 mt-0.5">
                              {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-400">Task not found</p>
          </div>
        )}
      </div>
    </>
  );
}

function SubtaskInput({ onAdd }) {
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isAdding) {
    return (
      <button 
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 text-sm text-surface-400 hover:text-brand-500 transition-colors py-2"
      >
        <Plus className="h-4 w-4" /> Add subtask
      </button>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(title); setTitle(''); setIsAdding(false); }} className="flex gap-2">
      <Input 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        placeholder="Subtask title..." 
        className="flex-1 bg-surface-950 border-surface-800"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={!title.trim()}>Add</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setIsAdding(false)}><X className="h-4 w-4" /></Button>
    </form>
  );
}

function AssigneeAdder({ members, onAdd }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1"
      >
        <UserPlus className="h-3 w-3" /> Add
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-xs text-surface-500 text-center py-3">No more members to add</p>
          ) : (
            members.map(member => (
              <button
                key={member._id}
                onClick={() => { onAdd(member._id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-[10px] bg-surface-700">{member.name?.[0]}</AvatarFallback>
                </Avatar>
                {member.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
