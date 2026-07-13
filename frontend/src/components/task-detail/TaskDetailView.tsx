'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Sun, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPut, getErrorMessage } from '@/services/api-client';
import { useToast } from '@/contexts/ToastContext';
import { useAutosave } from '@/hooks/useAutosave';
import type { Task } from '@/types';
import { COLORS, cardStyle, localDateKey } from './theme';
import { RepeatPicker, type RecurrenceValue } from './RepeatPicker';
import { StepsList } from './StepsList';

function weekdayBitOf(dateStr: string | null): number {
  let d = new Date();
  if (dateStr) {
    const [y, m, day] = dateStr.split('-').map(Number);
    d = new Date(y, m - 1, day);
  }
  // getDay(): 0 = Sunday; our bitmask: bit 0 = Monday
  return 1 << ((d.getDay() + 6) % 7);
}

export function TaskDetailView({ taskId }: { taskId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const taskKey = ['task', taskId];

  const taskQuery = useQuery({
    queryKey: taskKey,
    queryFn: () => apiGet<Task>(`/tasks/${taskId}`),
  });
  const task = taskQuery.data;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (task && !seeded) {
      setTitle(task.title);
      setNotes(task.description ?? '');
      setSeeded(true);
    }
  }, [task, seeded]);

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<Task>) => apiPut<Task>(`/tasks/${taskId}`, patch),
    onMutate: (patch) => {
      qc.setQueryData<Task>(taskKey, (old) => (old ? { ...old, ...patch } : old));
    },
    onSuccess: (serverTask) => {
      qc.setQueryData(taskKey, serverTask);
    },
    onError: (error) => showToast(`Couldn't save — ${getErrorMessage(error)}`, 'error'),
    onSettled: () => {
      // Re-sync the day/week/month lists (due date or completion may have
      // moved this task between groups, or spawned a recurring successor).
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const save = (patch: Partial<Task>) => saveMutation.mutate(patch);

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/tasks/${taskId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      router.push('/');
    },
    onError: (error) => showToast(`Couldn't delete — ${getErrorMessage(error)}`, 'error'),
  });

  useAutosave(title, (value) => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task?.title) save({ title: trimmed });
  });
  useAutosave(notes, (value) => {
    if (value !== (task?.description ?? '')) save({ description: value || null });
  });

  if (taskQuery.isPending) {
    return (
      <Shell onBack={() => router.back()}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${COLORS.border}`, borderTopColor: COLORS.accent, animation: 'taskDetailSpin 0.7s linear infinite' }} />
        </div>
      </Shell>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <Shell onBack={() => router.back()}>
        <div style={{ ...cardStyle, textAlign: 'center', color: COLORS.mid, fontSize: 14 }}>
          Couldn&apos;t load this task.{' '}
          <button onClick={() => taskQuery.refetch()} style={{ color: COLORS.accent, cursor: 'pointer', textDecoration: 'underline' }}>
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  const done = task.status === 'completed';
  const today = localDateKey();
  const inMyDay = task.my_day_date === today;
  const recurrence: RecurrenceValue = {
    recurrence_unit: task.recurrence_unit,
    recurrence_interval: task.recurrence_interval,
    recurrence_weekdays: task.recurrence_weekdays,
  };
  const saveState = saveMutation.isPending ? 'Saving…' : saveMutation.isSuccess ? 'Saved' : '';

  return (
    <Shell onBack={() => router.back()} status={saveState} onDelete={() => deleteMutation.mutate()}>
      {/* Title row */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          onClick={() => save({ status: done ? 'pending' : 'completed' })}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `1.5px solid ${done ? COLORS.mint : COLORS.borderStrong}`,
            background: done ? COLORS.mint : 'transparent',
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4.5 8.5L11 1.5" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Task title"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 17,
            fontWeight: 600,
            color: done ? COLORS.low : COLORS.hi,
            textDecoration: done ? 'line-through' : 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Steps */}
      <StepsList taskId={taskId} />

      {/* My Day */}
      <button
        onClick={() => save({ my_day_date: inMyDay ? null : today })}
        style={{
          ...cardStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
          color: inMyDay ? COLORS.accent : COLORS.mid,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Sun size={18} />
        {inMyDay ? 'Added to My Day' : 'Add to My Day'}
      </button>

      {/* Due date */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Calendar size={18} color={task.due_date ? COLORS.accent : COLORS.mid} />
        <label style={{ fontSize: 14, fontWeight: 600, color: COLORS.hi, flexShrink: 0 }} htmlFor="task-due-date">
          Due date
        </label>
        <input
          id="task-due-date"
          type="date"
          value={task.due_date ?? ''}
          onChange={(e) => save({ due_date: e.target.value || null })}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: task.due_date ? COLORS.hi : COLORS.low,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        />
        {task.due_date && (
          <button onClick={() => save({ due_date: null })} style={{ color: COLORS.low, cursor: 'pointer', fontSize: 12 }}>
            Clear
          </button>
        )}
      </div>

      {/* Repeat */}
      <RepeatPicker
        value={recurrence}
        defaultWeekdayBit={weekdayBitOf(task.due_date)}
        onChange={(next) => save(next)}
      />

      {/* Notes */}
      <div style={cardStyle}>
        <label htmlFor="task-notes" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: COLORS.hi, marginBottom: 8 }}>
          Note
        </label>
        <textarea
          id="task-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add note"
          rows={4}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: COLORS.hi,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>
    </Shell>
  );
}

function Shell({
  children,
  onBack,
  status,
  onDelete,
}: {
  children: React.ReactNode;
  onBack: () => void;
  status?: string;
  onDelete?: () => void;
}) {
  return (
    <div style={{ background: COLORS.bg, minHeight: '100dvh', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`@keyframes taskDetailSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: COLORS.accent, cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <span style={{ fontSize: 12, color: COLORS.low, minHeight: 16 }}>{status}</span>
          {onDelete ? (
            <button aria-label="Delete task" onClick={onDelete} style={{ color: COLORS.coral, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <Trash2 size={18} />
            </button>
          ) : (
            <span style={{ width: 26 }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </div>
    </div>
  );
}
