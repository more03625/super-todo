import type { TaskPriority } from '@/types';
import { cn } from '@/lib/utils';

const STYLES: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-navy-500/15 text-navy-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn('badge capitalize', STYLES[priority])}>{priority}</span>
  );
}
