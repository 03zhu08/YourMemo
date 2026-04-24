export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  archived: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type Theme = 'light' | 'dark';
export type Locale = 'en' | 'zh';
