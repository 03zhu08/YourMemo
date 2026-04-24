import type { TaskPriority } from '../../../shared/types';

export function cycleStatus(current: string): string {
  const order = ['todo', 'in_progress', 'done'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export const STATUS_COLORS: Record<string, string> = {
  backlog: 'var(--text-secondary)',
  todo: 'var(--text-secondary)',
  in_progress: 'var(--warning)',
  done: 'var(--success)',
  cancelled: 'var(--danger)',
};
