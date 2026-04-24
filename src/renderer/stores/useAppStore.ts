import { create } from 'zustand';
import type { Project, Task, Theme, Locale, TaskCreatePayload, TaskUpdatePayload } from '../../../shared/types';
import { apiFetch } from '../api/client';
import { applyAccentColor } from '../utils/color';

interface AppState {
  theme: Theme;
  locale: Locale;
  primaryColor: string;
  projects: Project[];
  tasks: Task[];
  allTasks: Task[];
  activeProjectId: string | null;
  selectedTask: Task | null;

  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  setPrimaryColor: (hex: string) => void;
  setActiveProject: (id: string | null) => void;
  setSelectedTask: (t: Task | null) => void;
  fetchProjects: () => Promise<void>;
  fetchTasks: (projectId?: string) => Promise<void>;
  fetchAllTasks: () => Promise<void>;
  createProject: (name: string, color?: string, icon?: string, description?: string, deadline?: string | null) => Promise<void>;
  createTask: (payload: TaskCreatePayload) => Promise<void>;
  updateTask: (id: string, fields: TaskUpdatePayload) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
const savedPrimaryColor = localStorage.getItem('primaryColor') || '#374151';
document.documentElement.classList.toggle('dark', savedTheme === 'dark');
applyAccentColor(savedPrimaryColor, savedTheme === 'dark');

export const useAppStore = create<AppState>((set, get) => ({
  theme: savedTheme,
  locale: (localStorage.getItem('locale') as Locale) || 'en',
  primaryColor: savedPrimaryColor,
  projects: [],
  tasks: [],
  allTasks: [],
  activeProjectId: null,
  selectedTask: null,

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    applyAccentColor(get().primaryColor, t === 'dark');
    set({ theme: t });
  },

  setLocale: (l) => {
    localStorage.setItem('locale', l);
    set({ locale: l });
  },

  setPrimaryColor: (hex) => {
    localStorage.setItem('primaryColor', hex);
    applyAccentColor(hex, get().theme === 'dark');
    set({ primaryColor: hex });
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id, selectedTask: null });
    if (id) get().fetchTasks(id);
  },

  setSelectedTask: (t) => set({ selectedTask: t }),

  fetchProjects: async () => {
    const projects = await apiFetch<Project[]>('/projects/');
    set({ projects });
  },

  fetchTasks: async (projectId) => {
    const query = projectId ? `?project_id=${projectId}` : '';
    const tasks = await apiFetch<Task[]>(`/tasks/${query}`);
    set({ tasks });
  },

  fetchAllTasks: async () => {
    const allTasks = await apiFetch<Task[]>('/tasks/');
    set({ allTasks });
  },

  createProject: async (name, color, icon, description, deadline) => {
    const body: any = { name };
    if (color) body.color = color;
    if (icon) body.icon = icon;
    if (description) body.description = description;
    if (deadline) body.deadline = deadline;
    await apiFetch('/projects/', { method: 'POST', body: JSON.stringify(body) });
    await get().fetchProjects();
  },

  createTask: async (payload) => {
    await apiFetch('/tasks/', { method: 'POST', body: JSON.stringify(payload) });
    const pid = get().activeProjectId;
    if (pid) await get().fetchTasks(pid);
    await get().fetchAllTasks();
  },

  updateTask: async (id, fields) => {
    const updated = await apiFetch<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
    const pid = get().activeProjectId;
    if (pid) await get().fetchTasks(pid);
    await get().fetchAllTasks();
    if (get().selectedTask?.id === id) set({ selectedTask: updated });
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
    await get().fetchAllTasks();
    if (get().selectedTask?.id === id) set({ selectedTask: null });
  },
}));
