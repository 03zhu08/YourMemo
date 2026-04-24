import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

const PRESET_COLORS = [
  '#374151', '#1e3a5f', '#2d5016', '#9a3412', '#3498db',
  '#e74c3c', '#f39c12', '#27ae60', '#636e72', '#2d3436',
];

const PRESET_ICONS = [
  '📋','📁','🎯','💡','🔧','📊','🎨','📝','🚀','💻',
  '📱','🌐','🏠','📚','🎵','🎮','🛒','✈️','🏋️','🍳',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { createProject } = useAppStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createProject(name.trim(), color, icon || undefined, description.trim() || undefined, deadline || null);
      setName(''); setColor(PRESET_COLORS[0]); setIcon(''); setDescription(''); setDeadline('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.4)' }} />
      <div
        className="relative w-[460px] max-h-[85vh] overflow-y-auto rounded-xl p-6 shadow-xl animate-scaleIn"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('project.create')}
          </h2>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('project.name')}</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('project.description')}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3 resize-none font-mono"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('project.deadline')}</label>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('common.color') || 'Color'}</label>
        <div className="flex gap-2 mb-3 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full cursor-pointer transition-transform"
              style={{ background: c, outline: color === c ? '2px solid var(--text-primary)' : 'none', outlineOffset: 2, transform: color === c ? 'scale(1.15)' : 'scale(1)' }} />
          ))}
        </div>

        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Icon</label>
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {PRESET_ICONS.map((e) => (
            <button key={e} onClick={() => setIcon(e)}
              className="w-8 h-8 flex items-center justify-center rounded cursor-pointer text-base"
              style={{ background: icon === e ? 'var(--border)' : 'transparent' }}>
              {e}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
            {t('common.cancel')}
          </button>
          <button onClick={handleCreate} disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-lg text-sm text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {t('project.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
