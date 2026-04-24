import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../i18n';
import { useAppStore } from '../stores/useAppStore';
import CreateProjectModal from './CreateProjectModal';
import TaskBoard from '../pages/TaskBoard';
import { Plus } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { projects, allTasks, activeProjectId, theme, locale, primaryColor, fetchProjects, fetchAllTasks, setActiveProject, setTheme, setLocale, setPrimaryColor } = useAppStore();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [customHex, setCustomHex] = useState('');

  useEffect(() => { fetchProjects(); fetchAllTasks(); }, []);

  const stats = useMemo(() => {
    const total = allTasks.length;
    const todo = allTasks.filter(t => t.status === 'todo').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const overdue = allTasks.filter(t => {
      if (!t.due_date || t.status === 'done' || t.status === 'cancelled') return false;
      return new Date(t.due_date) < new Date(new Date().toDateString());
    }).length;
    return { total, todo, inProgress, done, overdue };
  }, [allTasks]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const toggleLocale = () => {
    const next = locale === 'en' ? 'zh' : 'en';
    setLocale(next);
    i18nInstance.changeLanguage(next);
  };

  const isZh = locale === 'zh';

  return (
    <div className="flex flex-col h-screen">
      <div
        className="titlebar-drag shrink-0 flex items-end justify-end px-4"
        style={{ height: 38, background: 'var(--bg-sidebar)' }}
      />

      <div className="flex flex-1 min-h-0">
        <aside
          className="w-64 flex flex-col shrink-0 border-r"
          style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
        >
          {/* App title */}
          <div className="px-4 pb-2 font-bold text-lg" style={{ color: 'var(--accent)' }}>
            YourMemo
          </div>

          {/* Stats panel */}
          <div className="px-3 mb-3">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{stats.total}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{isZh ? '全部任务' : 'Total'}</div>
              </div>
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--warning)' }}>{stats.inProgress}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{isZh ? '进行中' : 'Active'}</div>
              </div>
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>{stats.done}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{isZh ? '已完成' : 'Done'}</div>
              </div>
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-lg font-bold" style={{ color: stats.overdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{stats.overdue}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{isZh ? '已逾期' : 'Overdue'}</div>
              </div>
            </div>
          </div>

          {/* New project button */}
          <div className="px-3 mb-2">
            <button
              onClick={() => setShowProjectModal(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-sm cursor-pointer text-white"
              style={{ background: 'var(--accent)' }}
            >
              <Plus size={14} /> {t('sidebar.addProject')}
            </button>
          </div>

          {/* Project list */}
          <nav className="flex-1 overflow-y-auto px-2">
            <div className="text-xs uppercase px-2 py-2" style={{ color: 'var(--text-secondary)' }}>
              {t('sidebar.projects')}
            </div>

            <button
              onClick={() => setActiveProject(null)}
              className="w-full text-left px-3 py-2 rounded text-sm cursor-pointer transition-colors mb-1"
              style={{
                background: activeProjectId === null ? 'var(--accent)' : 'transparent',
                color: activeProjectId === null ? '#fff' : 'var(--text-primary)',
              }}
            >
              {t('sidebar.dashboard')}
            </button>

            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p.id)}
                className="w-full text-left px-3 py-2 rounded text-sm cursor-pointer transition-colors"
                style={{
                  background: activeProjectId === p.id ? 'var(--accent)' : 'transparent',
                  color: activeProjectId === p.id ? '#fff' : 'var(--text-primary)',
                }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </nav>

          {/* Footer controls */}
          <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: isZh ? '石墨' : 'Graphite', hex: '#374151' },
                { label: isZh ? '普鲁士蓝' : 'Prussian', hex: '#1e3a5f' },
                { label: isZh ? '深林绿' : 'Forest', hex: '#2d5016' },
                { label: isZh ? '铁锈红' : 'Rust', hex: '#9a3412' },
              ].map((p) => (
                <button key={p.hex} onClick={() => setPrimaryColor(p.hex)} title={p.label}
                  className="w-5 h-5 rounded-full cursor-pointer transition-transform"
                  style={{ background: p.hex, outline: primaryColor === p.hex ? '2px solid var(--text-primary)' : 'none', outlineOffset: 1, transform: primaryColor === p.hex ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
              <input value={customHex} onChange={(e) => setCustomHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(customHex)) setPrimaryColor(customHex); }}
                placeholder="#hex" className="w-16 text-[10px] px-1.5 py-0.5 rounded outline-none"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={toggleTheme} className="text-xs px-2 py-1 rounded cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button onClick={toggleLocale} className="text-xs px-2 py-1 rounded cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {t(`lang.${locale === 'en' ? 'zh' : 'en'}`)}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden p-5" style={{ background: 'var(--bg-primary)' }}>
          {children}
        </main>
      </div>

      <TaskBoard projectId={activeProjectId} onClose={() => setActiveProject(null)} />
      <CreateProjectModal open={showProjectModal} onClose={() => setShowProjectModal(false)} />
    </div>
  );
}
