import { create } from 'zustand';
import type { Project, Task, Theme, Locale } from '../types';
import { apiFetch } from '../api/client';

interface AppState {
  theme: Theme;
  locale: Locale;
  projects: Project[];
  tasks: Task[];
  activeProjectId: string | null;

  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  setActiveProject: (id: string | null) => void;
  fetchProjects: () => Promise<void>;
  fetchTasks: (projectId?: string) => Promise<void>;
  createProject: (name: string) => Promise<void>;
  createTask: (projectId: string, title: string) => Promise<void>;
  updateTask: (id: string, fields: Partial<Task>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  locale: 'en',
  projects: [],
  tasks: [],
  activeProjectId: null,

  setTheme: (t) => set({ theme: t }),
  setLocale: (l) => set({ locale: l }),

  setActiveProject: (id) => {
    set({ activeProjectId: id });
    if (id) get().fetchTasks(id);
  },

  fetchProjects: async () => {
    const projects = await apiFetch<Project[]>('/projects/');
    set({ projects });
  },

  fetchTasks: async (projectId) => {
    const query = projectId ? `?project_id=${projectId}` : '';
    const tasks = await apiFetch<Task[]>(`/tasks/${query}`);
    set({ tasks });
  },

  createProject: async (name) => {
    await apiFetch('/projects/', { method: 'POST', body: JSON.stringify({ name }) });
    await get().fetchProjects();
  },

  createTask: async (projectId, title) => {
    await apiFetch('/tasks/', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, title }),
    });
    await get().fetchTasks(projectId);
  },

  updateTask: async (id, fields) => {
    await apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
    const pid = get().activeProjectId;
    if (pid) await get().fetchTasks(pid);
  },

  deleteProject: async (id) => {
    await apiFetch(`/projects/${id}`, { method: 'DELETE' });
    await get().fetchProjects();
    if (get().activeProjectId === id) set({ activeProjectId: null, tasks: [] });
  },

  deleteTask: async (id) => {
    await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    const pid = get().activeProjectId;
    if (pid) await get().fetchTasks(pid);
  },
}));
