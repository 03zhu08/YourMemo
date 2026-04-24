import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDrawer from '../components/TaskDrawer';
import type { Task } from '../../../shared/types';
import { PRIORITY_COLORS } from '../../../shared/types';

const STATUS_COLORS: Record<string, string> = {
  backlog: 'var(--text-secondary)',
  todo: 'var(--text-secondary)',
  in_progress: 'var(--warning)',
  done: 'var(--success)',
  cancelled: 'var(--danger)',
};

interface Props {
  projectId: string | null;
  onClose: () => void;
}

export default function TaskBoard({ projectId, onClose }: Props) {
  const { t } = useTranslation();
  const { tasks, projects, fetchTasks, updateTask, deleteTask } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);

  useEffect(() => {
    if (projectId) fetchTasks(projectId);
  }, [projectId]);

  if (!projectId) return null;

  const project = projects.find(p => p.id === projectId);

  const cycleStatus = (current: string) => {
    const order = ['todo', 'in_progress', 'done'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  };

  return (
    <>
      <div className="fixed inset-0 z-30 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 z-40 h-full w-[600px] shadow-2xl flex flex-col animate-slideInRight"
        style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            {project && <span className="w-3 h-3 rounded-full" style={{ background: project.color }} />}
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{project?.name || '...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white cursor-pointer"
              style={{ background: 'var(--accent)' }}>
              <Plus size={13} /> {t('task.add')}
            </button>
            <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {tasks.length === 0 ? (
            <p className="text-center mt-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('task.noTasks')}
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} onClick={() => setDrawerTask(task)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer hover:opacity-80"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: cycleStatus(task.status) as any }); }}
                    className="w-4 h-4 rounded-full border-2 shrink-0 cursor-pointer"
                    style={{ borderColor: STATUS_COLORS[task.status], background: task.status === 'done' ? STATUS_COLORS[task.status] : 'transparent' }} />
                  <span className="flex-1 text-sm"
                    style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {task.title}
                  </span>
                  {task.due_date && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{task.due_date}</span>}
                  {task.priority === 'urgent' && <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: PRIORITY_COLORS.urgent }}>{task.priority}</span>}
                  {(task.priority === 'high' || task.priority === 'medium') && <span className="w-2 h-2 rounded-full inline-block" style={{ background: PRIORITY_COLORS[task.priority] }} title={task.priority} />}
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    className="text-xs cursor-pointer opacity-40 hover:opacity-100" style={{ color: 'var(--danger)' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} projectId={projectId} />
        <TaskDrawer task={drawerTask} onClose={() => setDrawerTask(null)} />
      </div>
    </>
  );
}