'use client';

import { useState } from 'react';
import { Circle } from 'lucide-react';

interface QuickAddInputProps {
  onAdd: (title: string) => Promise<void>;
  disabled?: boolean;
}

export function QuickAddInput({ onAdd, disabled }: QuickAddInputProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="todo-quick-add">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-center gap-3">
        <Circle className="h-5 w-5 shrink-0 text-gray-400" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          disabled={disabled || submitting}
          className="input flex-1 border-0 bg-transparent px-0 shadow-none focus:ring-0"
          autoComplete="off"
        />
      </form>
    </div>
  );
}
