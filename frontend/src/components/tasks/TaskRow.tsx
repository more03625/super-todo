'use client';

import { useLayoutEffect, useRef } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function TaskRow({ task, onToggle, onDelete, onRename }: TaskRowProps) {
  const isDone = task.status === 'completed';
  const titleRef = useRef<HTMLSpanElement>(null);
  const isFocused = useRef(false);

  useLayoutEffect(() => {
    if (!isFocused.current && titleRef.current) {
      titleRef.current.innerText = task.title;
    }
  }, [task.title, task.id]);

  const revertTitle = () => {
    if (titleRef.current) titleRef.current.innerText = task.title;
  };

  const commitTitle = () => {
    const text = titleRef.current?.innerText.replace(/\n/g, ' ').trim() ?? '';
    if (!text) {
      revertTitle();
      return;
    }
    if (titleRef.current) titleRef.current.innerText = text;
    if (text !== task.title) onRename(task.id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      revertTitle();
      titleRef.current?.blur();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\n/g, ' ');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/80',
        isDone && 'opacity-70',
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={cn('todo-checkbox', isDone && 'todo-checkbox-completed')}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>
      <span
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Task title"
        spellCheck={false}
        onFocus={() => { isFocused.current = true; }}
        onBlur={() => {
          isFocused.current = false;
          commitTitle();
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          'min-w-0 flex-1 cursor-text rounded px-1 text-[15px] outline-none focus:bg-navy-50/60',
          isDone && 'text-muted line-through',
        )}
      />
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="rounded p-1.5 text-muted opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
