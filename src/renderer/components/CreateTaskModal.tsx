import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { TaskPriority } from '../../../shared/types';
import { PRIORITY_COLORS } from '../../../shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export default function CreateTaskModal({ open, onClose, projectId }: Props) {
  const { t } = useTranslation();
  const { createTask } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority !== 'low' ? priority : undefined,
        due_date: dueDate || null,
        start_date: startDate || null,
        links: links.filter(l => l.label && l.url),
      });
      setTitle(''); setDescription(''); setPriority('low'); setDueDate(''); setStartDate(''); setLinks([]);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const addLink = () => setLinks([...links, { label: '', url: '' }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: 'label' | 'url', val: string) => {
    const next = [...links];
    next[i] = { ...next[i], [field]: val };
    setLinks(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.4)' }} />
      <div
        className="relative w-[520px] max-h-[85vh] overflow-y-auto rounded-xl p-6 shadow-xl animate-scaleIn"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('task.add')}
          </h2>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('task.title')}</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('task.description') || 'Description'}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3 resize-none font-mono"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

        <div className="flex gap-3 mb-3">
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

        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Links</label>
          <button onClick={addLink} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--accent)' }}>
            <Plus size={14} /> Add
          </button>
        </div>
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} placeholder="Label"
              className="w-28 px-2 py-1.5 rounded text-sm outline-none"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} placeholder="https://..."
              className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            <button onClick={() => removeLink(i)} className="cursor-pointer" style={{ color: 'var(--danger)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
            {t('common.cancel')}
          </button>
          <button onClick={handleCreate} disabled={loading || !title.trim()}
            className="px-4 py-2 rounded-lg text-sm text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {t('task.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
