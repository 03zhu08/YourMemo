import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, BarChart3 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import TaskDrawer from '../components/TaskDrawer';
import { cycleStatus, STATUS_COLORS } from '../utils/taskUtils';
import type { Task } from '../../../shared/types';
import { PRIORITY_COLORS } from '../../../shared/types';

const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const STATUS_BADGE: Record<string, { label: string; bg: string }> = {
  backlog: { label: 'Backlog', bg: '#6b7280' },
  todo: { label: 'To Do', bg: '#e74c3c' },
  in_progress: { label: 'Active', bg: '#f39c12' },
  done: { label: 'Done', bg: '#27ae60' },
  cancelled: { label: 'Cancel', bg: '#9ca3af' },
};

const TASK_BAR_COLORS = [
  'rgba(209,196,233,0.55)', 'rgba(255,236,179,0.55)', 'rgba(187,222,251,0.55)',
  'rgba(255,205,178,0.55)', 'rgba(200,230,201,0.55)', 'rgba(248,187,208,0.55)',
];
const TASK_BAR_COLORS_DARK = [
  'rgba(126,87,194,0.35)', 'rgba(255,179,0,0.30)', 'rgba(66,165,245,0.30)',
  'rgba(255,138,101,0.30)', 'rgba(102,187,106,0.30)', 'rgba(236,64,122,0.30)',
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function diffDays(a: Date, b: Date) { return Math.floor((b.getTime() - a.getTime()) / 86400000); }

interface WeekRow { startDate: Date; days: (number | null)[]; }

function getWeekRows(year: number, month: number): WeekRow[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let dow = firstOfMonth.getDay(); dow = dow === 0 ? 6 : dow - 1;
  const rows: WeekRow[] = [];
  let currentDay = 1;
  let weekStart = addDays(firstOfMonth, -dow);
  while (currentDay <= daysInMonth) {
    const days: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      const cellDate = addDays(weekStart, col);
      if (cellDate.getMonth() === month && cellDate.getFullYear() === year) {
        days.push(cellDate.getDate());
        if (cellDate.getDate() >= currentDay) currentDay = cellDate.getDate() + 1;
      } else { days.push(null); }
    }
    rows.push({ startDate: new Date(weekStart), days });
    weekStart = addDays(weekStart, 7);
  }
  return rows;
}

const ROW_HEIGHT = 36;
const TIMELINE_DAYS = 7;
const LABEL_WIDTH = 192;

function getMonday(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay();
  r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

export default function Dashboard() {
  const { i18n, t } = useTranslation();
  const { allTasks, projects, fetchAllTasks, updateTask, theme } = useAppStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [dashView, setDashView] = useState<'calendar' | 'timeline'>('calendar');
  const [popover, setPopover] = useState<{ dateKey: string; rect: DOMRect } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayWidth, setDayWidth] = useState(100);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ taskId: string; startX: number; origDate: string } | null>(null);

  useEffect(() => { fetchAllTasks(); }, []);

  useEffect(() => {
    const el = timelineContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDayWidth(Math.floor((entry.contentRect.width - LABEL_WIDTH) / 7));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [dashView]);

  const isZh = i18n.language?.startsWith('zh');
  const weekdays = isZh ? WEEKDAYS_ZH : WEEKDAYS_EN;
  const weekRows = useMemo(() => getWeekRows(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayKey = toDateKey(today);
  const barColors = theme === 'dark' ? TASK_BAR_COLORS_DARK : TASK_BAR_COLORS;

  const projectMap = useMemo(() => {
    const m: Record<string, { name: string; color: string }> = {};
    for (const p of projects) m[p.id] = { name: p.name, color: p.color };
    return m;
  }, [projects]);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setWeekOffset(0); };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' });

  const tasksForDate = (dateKey: string) => allTasks.filter(tk => tk.due_date?.startsWith(dateKey));

  const handleCellClick = (dateKey: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!dateKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(popover?.dateKey === dateKey ? null : { dateKey, rect });
  };

  const handleStatusClick = useCallback(async (tk: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = cycleStatus(tk.status);
    await updateTask(tk.id, { status: next });
    fetchAllTasks();
  }, [updateTask, fetchAllTasks]);

  // Week-based timeline
  const timelineStart = useMemo(() => {
    const monday = getMonday(today);
    return addDays(monday, weekOffset * 7);
  }, [weekOffset]);

  const timelineDates = useMemo(() => {
    return Array.from({ length: TIMELINE_DAYS }, (_, i) => addDays(timelineStart, i));
  }, [timelineStart]);

  const weekLabel = useMemo(() => {
    const end = addDays(timelineStart, 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
    const fmtEn = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return isZh ? `${fmt(timelineStart)} - ${fmt(end)}` : `${fmtEn(timelineStart)} - ${fmtEn(end)}`;
  }, [timelineStart, isZh]);

  const handleDragStart = useCallback((taskId: string, origDate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ taskId, startX: e.clientX, origDate });
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onUp = async (e: MouseEvent) => {
      const delta = Math.round((e.clientX - dragState.startX) / dayWidth);
      if (delta !== 0) {
        const orig = parseDate(dragState.origDate);
        const newDate = addDays(orig, delta);
        await updateTask(dragState.taskId, { due_date: toDateKey(newDate) });
        fetchAllTasks();
      }
      setDragState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragState, dayWidth, updateTask, fetchAllTasks]);

  const groupedTasks = useMemo(() => {
    const groups: { projectId: string; projectName: string; projectColor: string; tasks: Task[] }[] = [];
    const byProject: Record<string, Task[]> = {};
    for (const tk of allTasks) {
      (byProject[tk.project_id] ||= []).push(tk);
    }
    for (const [pid, tasks] of Object.entries(byProject)) {
      groups.push({ projectId: pid, projectName: projectMap[pid]?.name || '?', projectColor: projectMap[pid]?.color || '#6b7280', tasks });
    }
    return groups;
  }, [allTasks, projectMap]);

  const todayTasks = useMemo(() => allTasks.filter(tk =>
    tk.due_date?.startsWith(todayKey) && tk.status !== 'done' && tk.status !== 'cancelled'
  ), [allTasks, todayKey]);

  const overdueTasks = useMemo(() => allTasks.filter(tk => {
    if (!tk.due_date || tk.status === 'done' || tk.status === 'cancelled') return false;
    return tk.due_date.slice(0, 10) < todayKey;
  }), [allTasks, todayKey]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 shrink-0 flex-wrap">
        <div className="flex border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => setDashView('calendar')}
            className="flex items-center gap-1 text-xs px-3 py-1.5 cursor-pointer"
            style={{ background: dashView === 'calendar' ? 'var(--accent)' : 'var(--bg-secondary)', color: dashView === 'calendar' ? '#fff' : 'var(--text-secondary)' }}>
            <Calendar size={13} /> {isZh ? '日历' : 'Calendar'}
          </button>
          <button onClick={() => setDashView('timeline')}
            className="flex items-center gap-1 text-xs px-3 py-1.5 cursor-pointer border-l"
            style={{ borderColor: 'var(--border)', background: dashView === 'timeline' ? 'var(--accent)' : 'var(--bg-secondary)', color: dashView === 'timeline' ? '#fff' : 'var(--text-secondary)' }}>
            <BarChart3 size={13} /> {isZh ? '时间线' : 'Timeline'}
          </button>
        </div>
        <button onClick={goToday} className="text-xs px-3 py-1.5 rounded cursor-pointer border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>
          {isZh ? '今天' : 'Today'}
        </button>
        {dashView === 'calendar' ? (
          <>
            <button onClick={prevMonth} className="text-lg px-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>‹</button>
            <button onClick={nextMonth} className="text-lg px-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>›</button>
            <span className="text-base font-semibold">{monthLabel}</span>
          </>
        ) : (
          <>
            <button onClick={() => setWeekOffset(weekOffset - 1)} className="text-lg px-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>‹</button>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="text-lg px-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>›</button>
            <span className="text-base font-semibold">{weekLabel}</span>
          </>
        )}
      </div>

      {/* Today overview */}
      {(overdueTasks.length > 0 || todayTasks.length > 0) ? (
        <div className="mb-3 shrink-0">
          {overdueTasks.length > 0 && (
            <div className="rounded-lg px-3 py-2 mb-2 flex items-center gap-2 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)' }}>
              <span className="font-semibold">{t('dashboard.overdue')}: {overdueTasks.length}</span>
              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                {overdueTasks.slice(0, 3).map(tk => tk.title).join(', ')}
              </span>
            </div>
          )}
          {todayTasks.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {todayTasks.map(tk => (
                <div key={tk.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer hover:opacity-80"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  onClick={() => setDrawerTask(tk)}>
                  <span className="w-2 h-2 rounded-full shrink-0 cursor-pointer"
                    style={{ background: STATUS_COLORS[tk.status] || 'var(--text-secondary)' }}
                    onClick={(e) => handleStatusClick(tk, e)} />
                  <span style={{ color: 'var(--text-primary)' }}>{tk.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 shrink-0 flex items-center gap-2 text-xs py-2" style={{ color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('dashboard.allClear')}
        </div>
      )}

      {dashView === 'calendar' ? (
        /* Calendar View */
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg relative" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-7 sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
            {weekdays.map((d) => (
              <div key={d} className="text-xs font-medium py-2 px-2 border-b border-r" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
          {weekRows.map((week, wi) => {
            const weekEnd = addDays(week.startDate, 6);
            const weekBars = allTasks.filter(tk => {
              if (!tk.due_date) return false;
              const d = parseDate(tk.due_date.slice(0, 10));
              return d >= week.startDate && d <= weekEnd && d.getMonth() === viewMonth && d.getFullYear() === viewYear;
            }).map((tk, idx) => {
              const d = parseDate(tk.due_date!.slice(0, 10));
              const dow = d.getDay();
              return { task: tk, col: dow === 0 ? 6 : dow - 1, colorIndex: idx % TASK_BAR_COLORS.length };
            });
            const MAX_VIS = 3;
            return (
              <div key={wi} className="grid grid-cols-7 relative" style={{ minHeight: 110 }}>
                {week.days.map((day, col) => {
                  const dateKey = day ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                  const isToday = dateKey === todayKey;
                  return (
                    <div key={col} onClick={(e) => day !== null && handleCellClick(dateKey, e)}
                      className="border-b border-r px-1.5 pt-1 pb-0 cursor-pointer"
                      style={{ borderColor: 'var(--border)', background: day === null ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}>
                      {day !== null && (
                        <span className={`text-xs inline-flex items-center justify-center ${isToday ? 'rounded-full text-white font-bold' : ''}`}
                          style={isToday ? { background: 'var(--accent)', width: 22, height: 22 } : { color: 'var(--text-secondary)' }}>{day}</span>
                      )}
                    </div>
                  );
                })}
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none" style={{ paddingTop: 26 }}>
                  {weekBars.slice(0, MAX_VIS).map((bar, bi) => (
                    <div key={bar.task.id} onClick={() => setDrawerTask(bar.task)}
                      className="pointer-events-auto cursor-pointer rounded px-1.5 py-0.5 mb-0.5 mx-0.5 truncate flex items-center gap-1.5 hover:opacity-80"
                      style={{ gridColumn: `${bar.col + 1} / span 1`, gridRow: bi + 1, background: barColors[bar.colorIndex], minHeight: 24, borderLeft: `3px solid ${projectMap[bar.task.project_id]?.color || 'var(--accent)'}` }}>
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bar.task.title}</span>
                      <span className="text-[10px] px-1 py-px rounded shrink-0 text-white" style={{ background: STATUS_BADGE[bar.task.status]?.bg || '#9ca3af' }}>
                        {STATUS_BADGE[bar.task.status]?.label || bar.task.status}
                      </span>
                    </div>
                  ))}
                  {weekBars.length > MAX_VIS && (
                    <div className="text-[10px] px-2 col-span-1" style={{ gridRow: MAX_VIS + 1, gridColumn: '1', color: 'var(--text-secondary)' }}>+{weekBars.length - MAX_VIS} more</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Popover */}
          {popover && (() => {
            const dayTasks = tasksForDate(popover.dateKey);
            const grouped: Record<string, Task[]> = {};
            dayTasks.forEach(tk => { (grouped[tk.project_id] ||= []).push(tk); });
            const top = Math.min(popover.rect.bottom + 4, window.innerHeight - 260);
            const left = Math.min(popover.rect.left, window.innerWidth - 280);
            return (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setPopover(null)} />
                <div className="fixed z-30 w-64 max-h-60 overflow-y-auto rounded-lg shadow-xl p-3"
                  style={{ top, left, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{popover.dateKey}</div>
                  {dayTasks.length === 0 && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isZh ? '无任务' : 'No tasks'}</div>}
                  {Object.entries(grouped).map(([pid, tasks]) => (
                    <div key={pid} className="mb-2">
                      <div className="text-[10px] font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: projectMap[pid]?.color || '#6b7280' }} />
                        {projectMap[pid]?.name || '?'}
                      </div>
                      {tasks.map(tk => (
                        <div key={tk.id} className="text-xs py-1 px-2 rounded cursor-pointer hover:opacity-80 truncate flex items-center gap-1.5"
                          style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}>
                          <span className="w-2 h-2 rounded-full shrink-0 cursor-pointer"
                            style={{ background: STATUS_COLORS[tk.status] || 'var(--text-secondary)' }}
                            onClick={(e) => handleStatusClick(tk, e)} />
                          <span className="truncate" onClick={() => { setPopover(null); setDrawerTask(tk); }}>{tk.title}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        /* Timeline / Gantt View — Week */
        <div ref={timelineContainerRef} className="flex-1 min-h-0 flex border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {/* Left: labels */}
          <div className="shrink-0 border-r overflow-y-auto" style={{ width: LABEL_WIDTH, borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="h-8 border-b px-3 flex items-center text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              {isZh ? '项目 / 任务' : 'Project / Task'}
            </div>
            {groupedTasks.map(group => (
              <div key={group.projectId}>
                <div className="flex items-center gap-1.5 px-3 text-xs font-semibold" style={{ height: ROW_HEIGHT, color: 'var(--text-primary)' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.projectColor }} />
                  <span className="truncate">{group.projectName}</span>
                </div>
                {group.tasks.map(tk => (
                  <div key={tk.id} className="px-3 pl-6 text-xs truncate cursor-pointer hover:opacity-80"
                    style={{ height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, color: 'var(--text-secondary)' }}
                    onClick={() => setDrawerTask(tk)}>
                    {tk.title}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: bars */}
          <div className="flex-1 overflow-y-auto">
            {/* Date header */}
            <div className="flex sticky top-0 z-10" style={{ background: 'var(--bg-secondary)', height: 32 }}>
              {timelineDates.map((d, i) => {
                const key = toDateKey(d);
                const isT = key === todayKey;
                const dayName = weekdays[i];
                return (
                  <div key={i} className="flex-1 border-b border-r flex flex-col items-center justify-center text-[10px]"
                    style={{ borderColor: 'var(--border)', color: isT ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isT ? 700 : 400 }}>
                    <span className="text-[9px] leading-none">{dayName}</span>
                    <span>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {groupedTasks.map(group => (
              <div key={group.projectId}>
                <div className="flex" style={{ height: ROW_HEIGHT }}>
                  {timelineDates.map((_, i) => (
                    <div key={i} className="flex-1 border-b border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', opacity: 0.5 }} />
                  ))}
                </div>
                {group.tasks.map(tk => {
                  const created = parseDate(tk.created_at.slice(0, 10));
                  const end = tk.due_date ? parseDate(tk.due_date.slice(0, 10)) : created;
                  const barStart = created < timelineStart ? timelineStart : created;
                  const barEndDate = end;
                  const offsetDays = diffDays(timelineStart, barStart);
                  const spanDays = Math.max(1, diffDays(barStart, barEndDate) + 1);
                  const left = offsetDays * dayWidth;
                  const width = spanDays * dayWidth - 4;
                  const visible = offsetDays < TIMELINE_DAYS && offsetDays + spanDays > 0;
                  return (
                    <div key={tk.id} className="relative flex" style={{ height: ROW_HEIGHT }}>
                      {timelineDates.map((_, i) => (
                        <div key={i} className="flex-1 border-b border-r" style={{ borderColor: 'var(--border)' }} />
                      ))}
                      {visible && (
                        <div className="absolute top-1 rounded cursor-pointer hover:opacity-80 flex items-center px-2 truncate text-[11px]"
                          onClick={() => setDrawerTask(tk)}
                          style={{ left: Math.max(0, left), width: Math.min(width, TIMELINE_DAYS * dayWidth - left), height: ROW_HEIGHT - 8, background: group.projectColor + '33', borderLeft: `3px solid ${group.projectColor}`, color: 'var(--text-primary)' }}>
                          <span className="w-2 h-2 rounded-full shrink-0 cursor-pointer mr-1.5"
                            style={{ background: STATUS_COLORS[tk.status] || 'var(--text-secondary)' }}
                            onClick={(e) => handleStatusClick(tk, e)} />
                          <span className="truncate">{tk.title}</span>
                          {tk.due_date && (
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/20 rounded-r"
                              onMouseDown={(e) => handleDragStart(tk.id, tk.due_date!, e)} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <TaskDrawer task={drawerTask} onClose={() => setDrawerTask(null)} />
    </div>
  );
}
