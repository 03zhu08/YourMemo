import type { Project, TaskPriority } from '../../../shared/types';

export interface ParsedInput {
  title: string;
  due_date?: string;
  priority?: TaskPriority;
  project_id?: string;
}

const PRIORITY_MAP: Record<string, TaskPriority> = {
  urgent: 'urgent', high: 'high', medium: 'medium', low: 'low',
};

const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextWeekday(dayIndex: number, nextWeek: boolean): Date {
  const now = new Date();
  const current = now.getDay();
  let diff = dayIndex - current;
  if (diff <= 0 || nextWeek) diff += 7;
  if (nextWeek && diff <= 7) diff += 7;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  return d;
}

export function parseQuickInput(input: string, projects: Project[]): ParsedInput {
  let remaining = input.trim();
  let priority: TaskPriority | undefined;
  let due_date: string | undefined;
  let project_id: string | undefined;

  // 1. Extract priority: /urgent, /high, /medium, /low
  remaining = remaining.replace(/\/(urgent|high|medium|low)/i, (_, p) => {
    priority = PRIORITY_MAP[p.toLowerCase()];
    return '';
  });

  // 2. Extract project: #ProjectName
  remaining = remaining.replace(/#(\S+)/g, (_, name) => {
    const match = projects.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (match) project_id = match.id;
    return '';
  });

  // 3. Extract date — Chinese relative
  const today = new Date();
  const zhDateMap: [RegExp, () => Date][] = [
    [/今天/, () => today],
    [/明天/, () => { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }],
    [/后天/, () => { const d = new Date(today); d.setDate(d.getDate() + 2); return d; }],
  ];
  for (const [re, fn] of zhDateMap) {
    if (re.test(remaining)) {
      due_date = formatDate(fn());
      remaining = remaining.replace(re, '');
      break;
    }
  }

  if (!due_date) {
    // 下周X
    const nextWeekMatch = remaining.match(/下周([一二三四五六日天])/);
    if (nextWeekMatch) {
      const dayChar = nextWeekMatch[1] === '天' ? '日' : nextWeekMatch[1];
      const idx = ZH_WEEKDAYS.indexOf(dayChar);
      if (idx >= 0) { due_date = formatDate(getNextWeekday(idx, true)); remaining = remaining.replace(/下周[一二三四五六日天]/, ''); }
    }
  }
  if (!due_date) {
    // 周X (this week)
    const weekMatch = remaining.match(/周([一二三四五六日天])/);
    if (weekMatch) {
      const dayChar = weekMatch[1] === '天' ? '日' : weekMatch[1];
      const idx = ZH_WEEKDAYS.indexOf(dayChar);
      if (idx >= 0) { due_date = formatDate(getNextWeekday(idx, false)); remaining = remaining.replace(/周[一二三四五六日天]/, ''); }
    }
  }

  // 4. Extract date — English relative
  if (!due_date) {
    const enMap: [RegExp, () => Date][] = [
      [/\btoday\b/i, () => today],
      [/\btomorrow\b/i, () => { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }],
    ];
    for (const [re, fn] of enMap) {
      if (re.test(remaining)) { due_date = formatDate(fn()); remaining = remaining.replace(re, ''); break; }
    }
  }
  if (!due_date) {
    const enWeekMatch = remaining.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (enWeekMatch) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const idx = dayNames.indexOf(enWeekMatch[1].toLowerCase());
      if (idx >= 0) { due_date = formatDate(getNextWeekday(idx, true)); remaining = remaining.replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, ''); }
    }
  }

  // 5. Extract date — YYYY-MM-DD or MM/DD
  if (!due_date) {
    const isoMatch = remaining.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) { due_date = isoMatch[1]; remaining = remaining.replace(isoMatch[0], ''); }
  }
  if (!due_date) {
    const slashMatch = remaining.match(/(\d{1,2})\/(\d{1,2})/);
    if (slashMatch) {
      const m = parseInt(slashMatch[1]), d = parseInt(slashMatch[2]);
      due_date = `${today.getFullYear()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      remaining = remaining.replace(slashMatch[0], '');
    }
  }

  // Strip time patterns (not stored but removed from title)
  remaining = remaining.replace(/\d{1,2}:\d{2}/, '');

  const title = remaining.replace(/\s+/g, ' ').trim();
  return { title, due_date, priority, project_id };
}
