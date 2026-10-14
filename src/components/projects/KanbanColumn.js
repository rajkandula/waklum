"use client"

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function KanbanColumn({ column, tasks, onAddTask, onTaskClick }) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold text-surface-100">{column.name}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-800 text-xs font-medium text-surface-400">
            {tasks.length}
          </span>
        </div>
        <button className="text-surface-400 hover:text-surface-100 p-1 rounded-md hover:bg-surface-800 transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-3 rounded-xl bg-surface-900/40 p-3 overflow-y-auto border border-surface-800/50"
      >
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task._id} task={task} onClick={() => onTaskClick?.(task)} />
          ))}
        </SortableContext>

        <Button 
          variant="ghost" 
          className="w-full justify-start text-surface-400 hover:text-surface-100 hover:bg-surface-800"
          onClick={onAddTask}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>
    </div>
  );
}
