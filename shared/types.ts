export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#d1d5db',
  medium: '#93c5fd',
  high: '#fdba74',
  urgent: '#ef4444',
};

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  deadline: string | null;
  created_at: string;
  archived: boolean;
}

export interface TaskLink {
  id: string;
  task_id: string;
  label: string;
  url: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  links: TaskLink[];
}

export interface TaskCreatePayload {
  project_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  links?: { label: string; url: string }[];
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  links?: { label: string; url: string }[];
}

export type Theme = 'light' | 'dark';
export type Locale = 'en' | 'zh';
