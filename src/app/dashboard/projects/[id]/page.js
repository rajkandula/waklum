"use client"

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from '@/components/projects/KanbanColumn';
import TaskCard from '@/components/projects/TaskCard';
import { Button } from '@/components/ui/Button';
import { Plus, X, Check } from 'lucide-react';
import TaskDetailModal from '@/components/projects/TaskDetailModal';
import CreateTaskModal from '@/components/projects/CreateTaskModal';

export default function KanbanBoardPage() {
  const params = useParams();
  const projectId = params.id;
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  
  // New Task Modal State
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskColId, setNewTaskColId] = useState(null);

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState(null);

  // Add Column inline state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [addingColumnLoading, setAddingColumnLoading] = useState(false);
  
  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const fetchProjectAndTasks = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`)
      ]);
      
      if (projRes.ok) {
        const data = await projRes.json();
        setProject(data.project);
      }
      
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t._id === activeId);
        const overIndex = tasks.findIndex((t) => t._id === overId);

        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const updatedTasks = [...tasks];
          updatedTasks[activeIndex].columnId = tasks[overIndex].columnId;
          return arrayMove(updatedTasks, activeIndex, overIndex);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t._id === activeId);
        const updatedTasks = [...tasks];
        updatedTasks[activeIndex].columnId = overId;
        return arrayMove(updatedTasks, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const task = tasks.find((t) => t._id === activeId);
    if (task) {
      await fetch(`/api/tasks/${activeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          columnId: task.columnId,
          order: tasks.findIndex(t => t._id === activeId)
        })
      });
    }
  };

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  if (loading || !project) {
    return <div className="flex h-full items-center justify-center">Loading board...</div>;
  }

  const columns = project.columns || [];

  return (
    <div className="absolute inset-0 p-6 overflow-x-auto overflow-y-hidden flex gap-6 pb-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {columns.map((col) => (
          <KanbanColumn 
            key={col.id} 
            column={col} 
            tasks={tasks.filter(t => t.columnId === col.id)}
            onAddTask={() => {
              setNewTaskColId(col.id);
              setIsNewTaskOpen(true);
            }}
            onTaskClick={(task) => setSelectedTask(task)}
          />
        ))}

        {isAddingColumn ? (
          <div className="shrink-0 w-80 bg-panel/70 border border-brand-500/30 rounded-xl p-4 space-y-3">
            <input
              autoFocus
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newColumnName.trim()) {
                  setAddingColumnLoading(true);
                  const newCol = {
                    id: newColumnName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                    title: newColumnName.trim(),
                    color: '#6366f1'
                  };
                  try {
                    const res = await fetch(`/api/projects/${projectId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ columns: [...columns, newCol] })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setProject(data.project);
                    }
                  } catch (e) { /* ignore */ }
                  setNewColumnName('');
                  setIsAddingColumn(false);
                  setAddingColumnLoading(false);
                }
                if (e.key === 'Escape') {
                  setNewColumnName('');
                  setIsAddingColumn(false);
                }
              }}
              placeholder="Column name..."
              className="w-full px-3 py-2 bg-surface-900/60 border border-surface-700 rounded-lg text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                disabled={!newColumnName.trim() || addingColumnLoading}
                onClick={async () => {
                  if (!newColumnName.trim()) return;
                  setAddingColumnLoading(true);
                  const newCol = {
                    id: newColumnName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                    title: newColumnName.trim(),
                    color: '#6366f1'
                  };
                  try {
                    const res = await fetch(`/api/projects/${projectId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ columns: [...columns, newCol] })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setProject(data.project);
                    }
                  } catch (e) { /* ignore */ }
                  setNewColumnName('');
                  setIsAddingColumn(false);
                  setAddingColumnLoading(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {addingColumnLoading ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => { setNewColumnName(''); setIsAddingColumn(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-900 text-surface-400 text-xs font-medium rounded-lg hover:bg-surface-800 hover:text-surface-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="shrink-0 w-80 h-14 border border-dashed border-surface-700 bg-surface-900/30 rounded-xl flex items-center justify-center text-surface-400 hover:border-brand-500/50 hover:text-brand-500 transition-colors cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Column
          </button>
        )}

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        projectId={projectId}
        columnId={newTaskColId}
        columns={columns}
        onTaskCreated={(task) => {
          setTasks(prev => [...prev, task]);
        }}
      />

      <TaskDetailModal 
        taskId={selectedTask?._id}
        projectId={projectId}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(updated) => {
          setTasks(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
        }}
      />
    </div>
  );
}
