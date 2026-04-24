import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/useAppStore';

export default function ProjectList() {
  const { t } = useTranslation();
  const { projects } = useAppStore();

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'var(--text-secondary)' }}>{t('project.empty')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{t('sidebar.projects')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-4 border cursor-pointer transition-shadow hover:shadow-md"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            onClick={() => useAppStore.getState().setActiveProject(p.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              <span className="font-medium">{p.name}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {new Date(p.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
