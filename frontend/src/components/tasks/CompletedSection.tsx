'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TaskRow } from '@/components/tasks/TaskRow';
import type { Task } from '@/types';

interface CompletedSectionProps {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function CompletedSection({ tasks, onToggle, onDelete, onRename }: CompletedSectionProps) {
  const [open, setOpen] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Completed ({tasks.length})
      </button>
      {open && (
        <div className="space-y-0">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onRename={onRename} />
          ))}
        </div>
      )}
    </div>
  );
}
