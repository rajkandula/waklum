"use client"

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { MessageSquare, Paperclip, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskCard({ task, onClick }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const priorityColors = {
    low: 'bg-brand-500 text-brand-100',
    medium: 'bg-amber-500 text-amber-900',
    high: 'bg-orange-500 text-white',
    urgent: 'bg-red-500 text-white'
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-surface-800 border-2 border-brand-500 rounded-lg h-32 opacity-50" 
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-surface-950 border border-surface-800 p-4 rounded-lg shadow-elevation-1 hover:border-surface-600 cursor-grab active:cursor-grabbing group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-1">
          {task.priority && (
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          )}
          {task.labels?.map((label, idx) => (
            <span key={idx} className="text-[10px] bg-surface-800 text-surface-300 px-1.5 py-0.5 rounded">
              {label}
            </span>
          ))}
        </div>
      </div>
      
      <p className="text-sm font-medium text-surface-100 mb-3 line-clamp-2 leading-snug">
        {task.title}
      </p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3 text-surface-400">
          {task.description && (
            <AlignLeft className="h-3.5 w-3.5" />
          )}
          {(task.commentCount > 0) && (
            <div className="flex items-center gap-1 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{task.commentCount}</span>
            </div>
          )}
          {(task.attachments?.length > 0) && (
            <div className="flex items-center gap-1 text-xs">
              <Paperclip className="h-3.5 w-3.5" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          {task.dueDate && (
            <span className="text-[10px] text-surface-400 mr-2">
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {/* Stacked avatars: primary + additional assignees */}
          {(() => {
            const allAssignees = [];
            if (task.assignee) allAssignees.push(task.assignee);
            if (task.assignees?.length) {
              task.assignees.forEach(a => {
                if (a && (a._id || a) !== (task.assignee?._id || task.assignee)) {
                  allAssignees.push(a);
                }
              });
            }
            if (allAssignees.length === 0) {
              return (
                <div className="h-6 w-6 rounded-full border border-dashed border-surface-600 flex items-center justify-center bg-surface-900">
                  <span className="text-surface-500 text-[10px]">?</span>
                </div>
              );
            }
            const visible = allAssignees.slice(0, 3);
            const remaining = allAssignees.length - 3;
            return (
              <div className="flex items-center -space-x-1.5">
                {visible.map((a, i) => (
                  <Avatar key={a._id || i} className="h-6 w-6 ring-2 ring-surface-950" title={a.name}>
                    <AvatarImage src={a.avatar} />
                    <AvatarFallback className="text-[10px] bg-brand-500 text-white">
                      {a.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {remaining > 0 && (
                  <div className="h-6 w-6 rounded-full bg-surface-700 ring-2 ring-surface-950 flex items-center justify-center">
                    <span className="text-[9px] font-medium text-surface-300">+{remaining}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
