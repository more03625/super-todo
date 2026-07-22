'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { apiDelete, apiGet, apiPost, apiPut, getErrorMessage } from '@/services/api-client';
import { useToast } from '@/contexts/ToastContext';
import { taskStepsKey } from '@/hooks/useRitualTasks';
import type { TaskStep } from '@/types';
import { COLORS, cardStyle } from './theme';

export function StepsList({ taskId }: { taskId: string }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');
  const stepsKey = taskStepsKey(taskId);

  const stepsQuery = useQuery({
    queryKey: stepsKey,
    queryFn: () => apiGet<TaskStep[]>(`/tasks/${taskId}/steps`),
  });
  const steps = stepsQuery.data ?? [];

  function patchCache(updater: (steps: TaskStep[]) => TaskStep[]) {
    qc.setQueryData<TaskStep[]>(stepsKey, (old) => updater(old ?? []));
  }

  const createStep = useMutation({
    mutationFn: (title: string) => apiPost<TaskStep>(`/tasks/${taskId}/steps`, { title }),
    onSuccess: (step) => patchCache((old) => [...old, step]),
    onError: (error) => showToast(`Couldn't add step — ${getErrorMessage(error)}`, 'error'),
  });

  const updateStep = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TaskStep> }) =>
      apiPut<TaskStep>(`/tasks/${taskId}/steps/${id}`, patch),
    onMutate: ({ id, patch }) => {
      const prev = qc.getQueryData<TaskStep[]>(stepsKey);
      patchCache((old) => old.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return { prev };
    },
    onError: (error, _vars, context) => {
      if (context?.prev) qc.setQueryData(stepsKey, context.prev);
      showToast(`Couldn't update step — ${getErrorMessage(error)}`, 'error');
    },
  });

  const deleteStep = useMutation({
    mutationFn: (id: string) => apiDelete(`/tasks/${taskId}/steps/${id}`),
    onMutate: (id) => {
      const prev = qc.getQueryData<TaskStep[]>(stepsKey);
      patchCache((old) => old.filter((s) => s.id !== id));
      return { prev };
    },
    onError: (error, _vars, context) => {
      if (context?.prev) qc.setQueryData(stepsKey, context.prev);
      showToast(`Couldn't delete step — ${getErrorMessage(error)}`, 'error');
    },
  });

  function submitDraft() {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    createStep.mutate(title);
  }

  return (
    <div style={cardStyle}>
      {steps.map((step) => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${COLORS.bg}` }}>
          <button
            aria-label={step.is_completed ? 'Mark step incomplete' : 'Mark step complete'}
            onClick={() => updateStep.mutate({ id: step.id, patch: { is_completed: !step.is_completed } })}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `1.5px solid ${step.is_completed ? COLORS.mint : COLORS.borderStrong}`,
              background: step.is_completed ? COLORS.mint : 'transparent',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {step.is_completed && (
              <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span
            style={{
              flex: 1,
              fontSize: 14,
              color: step.is_completed ? COLORS.low : COLORS.hi,
              textDecoration: step.is_completed ? 'line-through' : 'none',
            }}
          >
            {step.title}
          </span>
          <button
            aria-label="Delete step"
            onClick={() => deleteStep.mutate(step.id)}
            style={{ color: COLORS.low, cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: steps.length ? 10 : 0 }}>
        <Plus size={18} color={COLORS.accent} style={{ flexShrink: 0 }} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitDraft()}
          onBlur={submitDraft}
          placeholder={steps.length ? 'Next step' : 'Add step'}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: COLORS.hi,
            fontFamily: 'inherit',
            padding: '6px 0',
          }}
        />
      </div>
    </div>
  );
}
