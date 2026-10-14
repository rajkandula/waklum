"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  UploadCloud, File as FileIcon, FileText, Image as ImageIcon, 
  Film, Music, FileArchive, Trash2, Download, Search, Loader2,
  FolderPlus, Folder, FolderOpen, ChevronRight, ArrowLeft, X, Eye,
  ChevronLeft, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectFilesPage({ params }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.id;
  
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('/');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Close preview with Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setPreviewFile(null);
    };
    if (previewFile) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [previewFile]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setFiles(data.project.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch project files', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setUploading(true);
    setUploadProgress(10);

    for (let i = 0; i < selectedFiles.length; i++) {
      const selectedFile = selectedFiles[i];
      const progressBase = ((i) / selectedFiles.length) * 100;
      const progressStep = 100 / selectedFiles.length;

      try {
        setUploadProgress(progressBase + progressStep * 0.2);

        // Upload through the server (no bucket CORS setup needed)
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('projectId', projectId);

        const res = await fetch('/api/upload/direct', {
          method: 'POST',
          body: formData
        });

        setUploadProgress(progressBase + progressStep * 0.6);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Upload failed');
        }

        const uploaded = await res.json();

        // Record the stored file on the project so it shows in the list.
        const saveRes = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: uploaded.name || selectedFile.name,
            url: uploaded.publicUrl,
            key: uploaded.key,
            size: uploaded.size ?? selectedFile.size,
            type: uploaded.type || selectedFile.type,
            folder: currentFolder,
          }),
        });

        if (!saveRes.ok) {
          const errData = await saveRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Uploaded, but saving the file to the project failed');
        }

        const data = await saveRes.json();
        setFiles(prev => [data.file, ...prev]);
        setUploadProgress(progressBase + progressStep);
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload "${selectedFile.name}": ${error.message}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles?.length) {
      handleFileUpload({ target: { files: droppedFiles } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/files?fileId=${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles(files.filter(f => f._id !== fileId));
        if (previewFile?._id === fileId) setPreviewFile(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: 'folder',
          isFolder: true,
          folder: currentFolder
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(prev => [...prev, data.file]);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Folder creation error:', error);
      alert('Failed to create folder');
    }
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type, size = 'h-8 w-8') => {
    if (!type) return <FileIcon className={`${size} text-surface-400`} />;
    if (type === 'folder') return <FolderOpen className={`${size} text-amber-400`} />;
    if (type.startsWith('image/')) return <ImageIcon className={`${size} text-brand-600`} />;
    if (type.startsWith('video/')) return <Film className={`${size} text-purple-400`} />;
    if (type.startsWith('audio/')) return <Music className={`${size} text-amber-400`} />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className={`${size} text-blue-400`} />;
    if (type.includes('zip') || type.includes('tar')) return <FileArchive className={`${size} text-red-400`} />;
    return <FileIcon className={`${size} text-surface-400`} />;
  };

  // Navigate preview to next/prev file
  const getPreviewableFiles = () => filteredFiles.filter(f => !f.isFolder);

  const navigatePreview = (direction) => {
    if (!previewFile) return;
    const previewable = getPreviewableFiles();
    const idx = previewable.findIndex(f => f._id === previewFile._id);
    if (idx === -1) return;
    const nextIdx = direction === 'next' 
      ? (idx + 1) % previewable.length 
      : (idx - 1 + previewable.length) % previewable.length;
    setPreviewFile(previewable[nextIdx]);
  };

  // Render the preview content based on file type
  const renderPreviewContent = (file) => {
    const type = file.type || '';
    const url = file.url;

    if (type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <img 
            src={url} 
            alt={file.name} 
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      );
    }

    if (type.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <video 
            src={url} 
            controls 
            autoPlay 
            className="max-w-full max-h-[75vh] rounded-lg shadow-2xl"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center border border-surface-700">
            <Music className="h-16 w-16 text-amber-400" />
          </div>
          <p className="text-surface-100 font-medium text-lg">{file.name}</p>
          <audio 
            src={url} 
            controls 
            autoPlay 
            className="w-full max-w-md"
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    if (type.includes('pdf')) {
      return (
        <div className="w-full h-full flex flex-col">
          <iframe 
            src={url} 
            className="w-full flex-1 rounded-lg border border-surface-700"
            title={file.name}
          />
        </div>
      );
    }

    // Text files
    if (type.startsWith('text/') || type.includes('json') || type.includes('xml') || type.includes('javascript') || type.includes('css') || type.includes('html')) {
      return (
        <div className="w-full h-full flex flex-col">
          <iframe 
            src={url} 
            className="w-full flex-1 rounded-lg border border-surface-700 bg-white"
            title={file.name}
          />
        </div>
      );
    }

    // Fallback — can't preview
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="w-32 h-32 rounded-2xl bg-surface-800 flex items-center justify-center">
          {getFileIcon(type, 'h-16 w-16')}
        </div>
        <div className="text-center">
          <p className="text-surface-100 font-medium text-lg mb-1">{file.name}</p>
          <p className="text-surface-400 text-sm mb-4">{formatSize(file.size)} • {type || 'Unknown type'}</p>
          <p className="text-surface-500 text-sm mb-6">Preview not available for this file type</p>
          <Button asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" download>
              <Download className="mr-2 h-4 w-4" /> Download File
            </a>
          </Button>
        </div>
      </div>
    );
  };

  // Get unique folders at current level
  const getFolders = () => {
    const folderSet = new Set();
    files.forEach(f => {
      const fileFolder = f.folder || '/';
      // If this file is in a subfolder of currentFolder, extract the next folder segment
      if (fileFolder.startsWith(currentFolder) && fileFolder !== currentFolder) {
        const remaining = fileFolder.slice(currentFolder === '/' ? 1 : currentFolder.length + 1);
        const nextFolder = remaining.split('/')[0];
        if (nextFolder) folderSet.add(nextFolder);
      }
      // Check explicitly-created folders
      if (f.isFolder && f.folder === currentFolder) {
        folderSet.add(f.name);
      }
    });
    return Array.from(folderSet);
  };

  // Get files in current folder only
  const currentFiles = files.filter(f => {
    if (f.isFolder) return false;
    const fileFolder = f.folder || '/';
    return fileFolder === currentFolder;
  });

  const filteredFiles = currentFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const folders = getFolders();
  const breadcrumbs = currentFolder === '/' ? ['Root'] : ['Root', ...currentFolder.slice(1).split('/')];

  const navigateToFolder = (folderName) => {
    setCurrentFolder(currentFolder === '/' ? `/${folderName}` : `${currentFolder}/${folderName}`);
    setSearchQuery('');
  };

  const navigateUp = () => {
    if (currentFolder === '/') return;
    const parts = currentFolder.split('/');
    parts.pop();
    setCurrentFolder(parts.length <= 1 ? '/' : parts.join('/'));
  };

  const navigateToBreadcrumb = (idx) => {
    if (idx === 0) {
      setCurrentFolder('/');
    } else {
      const path = '/' + breadcrumbs.slice(1, idx + 1).join('/');
      setCurrentFolder(path);
    }
  };

  if (loading) {
    return <div className="p-6 text-surface-400 flex items-center justify-center h-full">Loading files...</div>;
  }

  return (
    <div 
      className="max-w-6xl mx-auto space-y-5 flex flex-col h-full pb-8 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-500/10 border-2 border-dashed border-brand-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <UploadCloud className="h-12 w-12 text-brand-600 mx-auto mb-3" />
            <p className="text-lg font-semibold text-surface-100">Drop files to upload</p>
            <p className="text-sm text-surface-400">Files will be uploaded to {currentFolder === '/' ? 'Root' : currentFolder}</p>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewFile(null); }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-950/80 border-b border-surface-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(previewFile.type, 'h-5 w-5')}
              <div className="min-w-0">
                <p className="text-surface-100 font-medium text-sm truncate">{previewFile.name}</p>
                <p className="text-surface-400 text-xs">
                  {formatSize(previewFile.size)} 
                  {previewFile.uploadedAt && ` • ${format(new Date(previewFile.uploadedAt), 'MMM d, yyyy')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-surface-400 hover:text-surface-100" asChild>
                <a href={previewFile.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-surface-400 hover:text-surface-100" asChild>
                <a href={previewFile.url} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-surface-400 hover:text-red-400"
                onClick={() => handleDelete(previewFile._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-surface-700 mx-1" />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-surface-400 hover:text-surface-100"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 relative overflow-hidden p-4 md:p-8 flex items-center justify-center">
            {/* Previous button */}
            {getPreviewableFiles().length > 1 && (
              <button
                onClick={() => navigatePreview('prev')}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-surface-900/80 border border-surface-700 flex items-center justify-center text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Content */}
            <div className="w-full h-full">
              {renderPreviewContent(previewFile)}
            </div>

            {/* Next button */}
            {getPreviewableFiles().length > 1 && (
              <button
                onClick={() => navigatePreview('next')}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-surface-900/80 border border-surface-700 flex items-center justify-center text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Bottom file counter */}
          {getPreviewableFiles().length > 1 && (
            <div className="flex justify-center pb-3">
              <span className="text-xs text-surface-400 bg-surface-900/80 px-3 py-1 rounded-full border border-surface-800">
                {getPreviewableFiles().findIndex(f => f._id === previewFile._id) + 1} / {getPreviewableFiles().length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-surface-100">Project Files</h2>
          <p className="text-surface-400 mt-1">Upload and manage all documents and assets for this project.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
            <Input 
              type="text" 
              placeholder="Search files..." 
              className="pl-9 bg-surface-900 border-surface-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowNewFolder(true)}
            className="shrink-0"
          >
            <FolderPlus className="mr-1.5 h-4 w-4" /> Folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="shrink-0">
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><UploadCloud className="mr-2 h-4 w-4" /> Upload</>
            )}
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-brand-500 h-1.5 transition-all duration-300" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        {currentFolder !== '/' && (
          <button onClick={navigateUp} className="p-1 rounded hover:bg-surface-800 text-surface-400 hover:text-surface-100 transition-colors mr-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="h-3 w-3 text-surface-600" />}
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`px-1.5 py-0.5 rounded text-sm transition-colors ${
                idx === breadcrumbs.length - 1 
                  ? 'text-surface-100 font-medium' 
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
              }`}
            >
              {idx === 0 ? <Folder className="h-3.5 w-3.5 inline mr-1" /> : null}
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 p-3 bg-surface-900/50 border border-surface-800 rounded-lg">
          <Folder className="h-5 w-5 text-amber-400 shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createFolder()}
            placeholder="Folder name..."
            autoFocus
            className="flex-1 bg-transparent text-surface-100 text-sm outline-none placeholder-surface-500"
          />
          <Button size="sm" onClick={createFolder} disabled={!newFolderName.trim()}>Create</Button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="p-1 text-surface-400 hover:text-surface-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content */}
      {folders.length === 0 && filteredFiles.length === 0 && !showNewFolder ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-surface-800 rounded-xl bg-surface-900/50 flex-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800 mb-4 text-brand-600">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-surface-100 mb-2">No files uploaded</h3>
          <p className="text-surface-400 mb-6 max-w-sm">
            Drag and drop files here, or click to browse and upload assets for your team.
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </Button>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1 pr-2 pb-10">
          {/* Folders */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {folders.map(folder => (
                <div
                  key={folder}
                  onClick={() => navigateToFolder(folder)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-surface-800 bg-surface-900/50 hover:border-amber-500/30 hover:bg-amber-500/5 cursor-pointer transition-colors group"
                >
                  <Folder className="h-5 w-5 text-amber-400 shrink-0" />
                  <span className="text-sm font-medium text-surface-200 truncate group-hover:text-surface-100">{folder}</span>
                </div>
              ))}
            </div>
          )}

          {/* Files Grid */}
          {filteredFiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <Card 
                  key={file._id} 
                  className="overflow-hidden border-surface-800 bg-surface-900/50 hover:border-surface-600 transition-colors group flex flex-col cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                >
                  <div className="flex items-center justify-center h-32 bg-surface-950/50 relative">
                    {file.type?.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      getFileIcon(file.type)
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8 rounded-full" 
                        onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" asChild onClick={(e) => e.stopPropagation()}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); handleDelete(file._id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <p className="font-medium text-sm text-surface-100 truncate mb-1" title={file.name}>{file.name}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] text-surface-400 uppercase">{formatSize(file.size)}</span>
                      <span className="text-[10px] text-surface-400">
                        {file.uploadedAt ? format(new Date(file.uploadedAt), 'MMM d, yyyy') : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
