import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { parseQuickInput } from '../utils/parseQuickInput';
import { Zap } from 'lucide-react';

export default function QuickCapture() {
  const { projects, fetchProjects, createTask } = useAppStore();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'creating' | 'done'>('idle');

  useEffect(() => { fetchProjects(); }, []);

  const handleSubmit = async () => {
    if (!input.trim() || status === 'creating') return;
    const parsed = parseQuickInput(input, projects);
    if (!parsed.title) return;

    const projectId = parsed.project_id || projects[0]?.id;
    if (!projectId) return;

    setStatus('creating');
    try {
      await createTask({
        project_id: projectId,
        title: parsed.title,
        priority: parsed.priority,
        due_date: parsed.due_date || null,
      });
      setStatus('done');
      setTimeout(() => window.close(), 200);
    } catch {
      setStatus('idle');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') window.close();
  };

  const parsed = input ? parseQuickInput(input, projects) : null;
  const matchedProject = parsed?.project_id
    ? projects.find(p => p.id === parsed.project_id)
    : projects[0];

  return (
    <div className="h-screen flex flex-col justify-center px-4 py-3"
      style={{ background: 'rgba(15,15,26,0.92)', borderRadius: 12 }}>
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} style={{ color: '#f39c12' }} />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入任务... 明天 提交报告 /urgent #项目"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#e8e8f0' }}
        />
      </div>
      <div className="flex items-center gap-2 text-[10px]" style={{ color: '#9ca3af' }}>
        {matchedProject && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: matchedProject.color }} />
            {matchedProject.name}
          </span>
        )}
        {parsed?.due_date && <span>{parsed.due_date}</span>}
        {parsed?.priority && <span style={{ color: parsed.priority === 'urgent' ? '#ef4444' : '#9ca3af' }}>{parsed.priority}</span>}
        <span className="ml-auto">Enter ↵ | Esc</span>
      </div>
    </div>
  );
}
