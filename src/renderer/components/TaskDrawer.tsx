import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { Task, TaskPriority, TaskStatus } from '../../../shared/types';
import { PRIORITY_COLORS } from '../../../shared/types';

declare global {
  interface Window {
    electronAPI?: { openExternal: (url: string) => void };
  }
}

interface Props {
  task: Task | null;
  onClose: () => void;
}

export default function TaskDrawer({ task, onClose }: Props) {
  const { t } = useTranslation();
  const { updateTask, deleteTask } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.due_date?.slice(0, 10) || '');
    setStartDate(task.start_date?.slice(0, 10) || '');
    setLinks(task.links?.map(l => ({ label: l.label, url: l.url })) || []);
    setShowDesc(!!task.description);
    setShowLinks((task.links?.length || 0) > 0);
    setCopiedIdx(null);
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
        start_date: startDate || null,
        links: links.filter(l => l.label && l.url),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  const openLink = (url: string) => {
    window.electronAPI?.openExternal(url);
  };

  const addLink = () => setLinks([...links, { label: '', url: '' }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: 'label' | 'url', val: string) => {
    const next = [...links];
    next[i] = { ...next[i], [field]: val };
    setLinks(next);
  };

  const copyMarkdown = (i: number) => {
    const l = links[i];
    navigator.clipboard.writeText(`[${l.label || l.url}](${l.url})`);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-[460px] shadow-2xl flex flex-col overflow-y-auto animate-slideInRight"
        style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Task Detail</span>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-semibold outline-none bg-transparent"
            style={{ color: 'var(--text-primary)' }} />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                <option value="backlog">{t('task.status.backlog')}</option>
                <option value="todo">{t('task.status.todo')}</option>
                <option value="in_progress">{t('task.status.in_progress')}</option>
                <option value="done">{t('task.status.done')}</option>
                <option value="cancelled">{t('task.status.cancelled')}</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-primary)', color: PRIORITY_COLORS[priority], border: '1px solid var(--border)' }}>
                <option value="low">{t('task.priority.low')}</option>
                <option value="medium">{t('task.priority.medium')}</option>
                <option value="high">{t('task.priority.high')}</option>
                <option value="urgent">{t('task.priority.urgent')}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('task.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('task.dueDate')}</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
          </div>

          <div>
            {showDesc ? (
              <>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              </>
            ) : (
              <button onClick={() => setShowDesc(true)} className="text-xs cursor-pointer hover:underline"
                style={{ color: 'var(--text-secondary)' }}>
                {t('task.addDescription', '+ Add description...')}
              </button>
            )}
          </div>

          <div>
            {showLinks ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Links</label>
                  <button onClick={addLink} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--accent)' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} placeholder="Label"
                      className="w-24 px-2 py-1.5 rounded text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    <input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} placeholder="https://..."
                      className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    {link.url && (
                      <>
                        <button onClick={() => copyMarkdown(i)} className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                          {copiedIdx === i ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                        </button>
                        <button onClick={() => openLink(link.url)} className="cursor-pointer" style={{ color: 'var(--accent)' }}>
                          <ExternalLink size={14} />
                        </button>
                      </>
                    )}
                    <button onClick={() => removeLink(i)} className="cursor-pointer" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <button onClick={() => { setShowLinks(true); if (links.length === 0) addLink(); }} className="text-xs cursor-pointer hover:underline"
                style={{ color: 'var(--text-secondary)' }}>
                {t('task.addLinks', '+ Add links...')}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleDelete} className="text-sm cursor-pointer px-3 py-1.5 rounded" style={{ color: 'var(--danger)' }}>
            {t('common.delete')}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 rounded text-sm cursor-pointer"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saving || !title.trim()}
              className="px-4 py-1.5 rounded text-sm text-white cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent)' }}>{t('common.save')}</button>
          </div>
        </div>
      </div>
    </>
  );
}
