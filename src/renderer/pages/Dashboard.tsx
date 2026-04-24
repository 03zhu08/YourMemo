import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, BarChart3 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import TaskDrawer from '../components/TaskDrawer';
import { cycleStatus, STATUS_COLORS } from '../utils/taskUtils';
import type { Task } from '../../../shared/types';

const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

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
const RENDER_DAYS = 35;
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
  const [dayWidth, setDayWidth] = useState(100);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ taskId: string; startX: number; origDate: string } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calSwipeX, setCalSwipeX] = useState(0);
  const [calSnapping, setCalSnapping] = useState(false);
  const calWidthRef = useRef(0);
  const calGesture = useRef<{ startX: number; startY: number } | null>(null);
  const pendingMonthDir = useRef<number>(0);
  const [dayOffset, setDayOffset] = useState(0);

  useEffect(() => { fetchAllTasks(); }, []);

  useEffect(() => {
    const el = timelineContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDayWidth(Math.max(40, Math.floor((entry.contentRect.width - LABEL_WIDTH) / 7)));
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
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setDayOffset(0); };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' });

  const tasksForDate = (dateKey: string) => allTasks.filter(tk => tk.due_date?.startsWith(dateKey));

  const handleCellClick = (dateKey: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!dateKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(popover?.dateKey === dateKey ? null : { dateKey, rect });
  };

  const handleStatusClick = useCallback(async (tk: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = cycleStatus(tk.status) as import('../../../shared/types').TaskStatus;
    await updateTask(tk.id, { status: next });
    fetchAllTasks();
  }, [updateTask, fetchAllTasks]);

  // Week-based timeline
  const timelineStart = useMemo(() => {
    const monday = getMonday(today);
    return addDays(monday, dayOffset);
  }, [dayOffset]);

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

  // Calendar swipe — smooth carousel
  useEffect(() => {
    const el = calendarRef.current;
    if (!el || dashView !== 'calendar') return;
    calWidthRef.current = el.getBoundingClientRect().width;
    const ro = new ResizeObserver(([e]) => { calWidthRef.current = e.contentRect.width; });
    ro.observe(el);

    let wheelTimer: ReturnType<typeof setTimeout>;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(dx) < 2) return;
      e.preventDefault();
      setCalSnapping(false);
      setCalSwipeX(prev => {
        const w = calWidthRef.current || 400;
        return Math.max(-w, Math.min(w, prev - dx));
      });
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { setCalSnapping(true); snapCalendar(); }, 120);
    };
    const onDown = (e: MouseEvent) => { calGesture.current = { startX: e.clientX, startY: e.clientY }; };
    const onMove = (e: MouseEvent) => {
      if (!calGesture.current) return;
      const dx = e.clientX - calGesture.current.startX;
      const dy = e.clientY - calGesture.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setCalSwipeX(Math.abs(dx) > Math.abs(dy) ? dx : -dy);
      }
    };
    const onUp = () => {
      calGesture.current = null;
      setCalSnapping(true);
      snapCalendar();
    };

    const snapCalendar = () => {
      setCalSwipeX(prev => {
        const w = calWidthRef.current || 400;
        const threshold = w * 0.15;
        if (prev > threshold) {
          pendingMonthDir.current = -1;
          setCalSnapping(true);
          return w;
        }
        if (prev < -threshold) {
          pendingMonthDir.current = 1;
          setCalSnapping(true);
          return -w;
        }
        pendingMonthDir.current = 0;
        setCalSnapping(true);
        return 0;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      clearTimeout(wheelTimer);
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dashView, viewMonth, viewYear]);

  // Timeline: compute render range (wider than viewport for native scroll)
  const timelineRenderStart = useMemo(() => addDays(timelineStart, -14), [timelineStart]);
  const timelineRenderDates = useMemo(() =>
    Array.from({ length: RENDER_DAYS }, (_, i) => addDays(timelineRenderStart, i)),
  [timelineRenderStart]);

  // Scroll timeline to center on initial load
  const timelineScrolledRef = useRef(false);
  useEffect(() => {
    if (dashView !== 'timeline' || timelineScrolledRef.current) return;
    const el = timelineContainerRef.current;
    if (!el || !dayWidth) return;
    el.scrollLeft = 14 * dayWidth;
    timelineScrolledRef.current = true;
  }, [dashView, dayWidth]);

  // When dayOffset changes (via buttons), re-center scroll
  const prevDayOffsetRef = useRef(dayOffset);
  useEffect(() => {
    if (prevDayOffsetRef.current === dayOffset) return;
    const el = timelineContainerRef.current;
    if (el && dayWidth) el.scrollLeft = 14 * dayWidth;
    prevDayOffsetRef.current = dayOffset;
    timelineScrolledRef.current = true;
  }, [dayOffset, dayWidth]);

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
            <button onClick={() => setDayOffset(dayOffset - 7)} className="text-lg px-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>‹</button>
            <button onClick={() => setDayOffset(dayOffset + 7)} className="text-lg px-2 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>›</button>
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
        <div ref={calendarRef} className="flex-1 min-h-0 overflow-auto border rounded-lg relative" style={{ borderColor: 'var(--border)' }}>
          <div style={{ transform: `translateX(${calSwipeX}px)`, transition: calSnapping ? 'transform 250ms ease-out' : 'none' }}
            onTransitionEnd={() => {
              setCalSnapping(false);
              const dir = pendingMonthDir.current;
              if (dir !== 0) {
                pendingMonthDir.current = 0;
                if (dir > 0) nextMonth(); else prevMonth();
                setCalSwipeX(0);
              }
            }}>
          <div className="grid grid-cols-7 sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
            {weekdays.map((d) => (
              <div key={d} className="text-xs font-medium py-2 px-2 border-b border-r" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
          {weekRows.map((week, wi) => {
            const weekEnd = addDays(week.startDate, 6);
            const weekBars = allTasks.filter(tk => {
              const s = tk.start_date ? parseDate(tk.start_date.slice(0, 10)) : tk.due_date ? parseDate(tk.due_date.slice(0, 10)) : null;
              const e = tk.due_date ? parseDate(tk.due_date.slice(0, 10)) : s;
              if (!s || !e) return false;
              return e >= week.startDate && s <= weekEnd;
            }).map((tk, idx) => {
              const s = tk.start_date ? parseDate(tk.start_date.slice(0, 10)) : tk.due_date ? parseDate(tk.due_date!.slice(0, 10)) : parseDate(tk.created_at.slice(0, 10));
              const e = tk.due_date ? parseDate(tk.due_date.slice(0, 10)) : s;
              const clampedStart = s < week.startDate ? week.startDate : s;
              const clampedEnd = e > weekEnd ? weekEnd : e;
              const startDow = clampedStart.getDay();
              const endDow = clampedEnd.getDay();
              const startCol = startDow === 0 ? 6 : startDow - 1;
              const endCol = endDow === 0 ? 6 : endDow - 1;
              const span = endCol - startCol + 1;
              return { task: tk, col: startCol, span: Math.max(1, span), colorIndex: idx % TASK_BAR_COLORS.length };
            });
            const maxRow = weekBars.length;
            return (
              <div key={wi} className="grid grid-cols-7 relative" style={{ minHeight: 90 }}>
                {week.days.map((day, col) => {
                  const dateKey = day ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                  const isToday = dateKey === todayKey;
                  return (
                    <div key={col} onClick={(e) => day !== null && handleCellClick(dateKey, e)}
                      className="border-b border-r px-1.5 pt-1 pb-0 cursor-pointer"
                      style={{ borderColor: 'var(--border)', background: day === null ? 'var(--bg-primary)' : 'var(--bg-secondary)', minHeight: 24 + maxRow * 22 }}>
                      {day !== null && (
                        <span className={`text-xs inline-flex items-center justify-center ${isToday ? 'rounded-full text-white font-bold' : ''}`}
                          style={isToday ? { background: 'var(--accent)', width: 22, height: 22 } : { color: 'var(--text-secondary)' }}>{day}</span>
                      )}
                    </div>
                  );
                })}
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none" style={{ paddingTop: 24 }}>
                  {weekBars.map((bar, bi) => (
                    <div key={bar.task.id} onClick={() => setDrawerTask(bar.task)}
                      className="pointer-events-auto cursor-pointer rounded px-1 truncate flex items-center gap-1 hover:opacity-80"
                      style={{ gridColumn: `${bar.col + 1} / span ${bar.span}`, gridRow: bi + 1, background: barColors[bar.colorIndex], height: 20, marginBottom: 1, marginLeft: 2, marginRight: 2, borderLeft: `3px solid ${projectMap[bar.task.project_id]?.color || 'var(--accent)'}` }}>
                      <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bar.task.title}</span>
                    </div>
                  ))}
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
        </div>
      ) : (
        /* Timeline / Gantt View — native scroll */
        <div ref={timelineContainerRef} className="flex-1 min-h-0 border rounded-lg overflow-auto" style={{ borderColor: 'var(--border)' }}>
          <div style={{ width: LABEL_WIDTH + RENDER_DAYS * dayWidth, minWidth: '100%' }}>
            {/* Date header */}
            <div className="flex sticky top-0 z-20" style={{ height: 32 }}>
              <div className="shrink-0 sticky left-0 z-30 border-b border-r px-3 flex items-center text-xs font-medium"
                style={{ width: LABEL_WIDTH, borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {isZh ? '项目 / 任务' : 'Project / Task'}
              </div>
              {timelineRenderDates.map((d, i) => {
                const key = toDateKey(d);
                const isT = key === todayKey;
                const dow = d.getDay();
                const dayName = weekdays[dow === 0 ? 6 : dow - 1];
                return (
                  <div key={i} className="border-b border-r flex flex-col items-center justify-center text-[10px] shrink-0"
                    style={{ width: dayWidth, borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: isT ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isT ? 700 : 400 }}>
                    <span className="text-[9px] leading-none">{dayName}</span>
                    <span>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {groupedTasks.map(group => (
              <div key={group.projectId}>
                {/* Project header row */}
                <div className="flex" style={{ height: ROW_HEIGHT }}>
                  <div className="sticky left-0 z-10 shrink-0 flex items-center gap-1.5 px-3 text-xs font-semibold border-b border-r"
                    style={{ width: LABEL_WIDTH, background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.projectColor }} />
                    <span className="truncate">{group.projectName}</span>
                  </div>
                  {timelineRenderDates.map((_, i) => (
                    <div key={i} className="shrink-0 border-b border-r" style={{ width: dayWidth, borderColor: 'var(--border)', background: 'var(--bg-primary)', opacity: 0.5 }} />
                  ))}
                </div>
                {/* Task rows */}
                {group.tasks.map(tk => {
                  const start = tk.start_date ? parseDate(tk.start_date.slice(0, 10)) : parseDate(tk.created_at.slice(0, 10));
                  const end = tk.due_date ? parseDate(tk.due_date.slice(0, 10)) : start;
                  const barStart = start < timelineRenderStart ? timelineRenderStart : start;
                  const barEndDate = end;
                  const offsetDays = diffDays(timelineRenderStart, barStart);
                  const spanDays = Math.max(1, diffDays(barStart, barEndDate) + 1);
                  const barLeft = LABEL_WIDTH + offsetDays * dayWidth;
                  const barWidth = spanDays * dayWidth - 4;
                  const visible = offsetDays < RENDER_DAYS && offsetDays + spanDays > 0;
                  return (
                    <div key={tk.id} className="relative flex" style={{ height: ROW_HEIGHT }}>
                      <div className="sticky left-0 z-10 shrink-0 px-3 pl-6 text-xs truncate cursor-pointer hover:opacity-80 border-b border-r flex items-center"
                        style={{ width: LABEL_WIDTH, background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        onClick={() => setDrawerTask(tk)}>
                        {tk.title}
                      </div>
                      {timelineRenderDates.map((_, i) => (
                        <div key={i} className="shrink-0 border-b border-r" style={{ width: dayWidth, borderColor: 'var(--border)' }} />
                      ))}
                      {visible && (
                        <div className="absolute top-1 rounded cursor-pointer hover:opacity-80 flex items-center px-2 truncate text-[11px]"
                          onClick={() => setDrawerTask(tk)}
                          style={{ left: Math.max(LABEL_WIDTH, barLeft), width: Math.min(barWidth, LABEL_WIDTH + RENDER_DAYS * dayWidth - barLeft), height: ROW_HEIGHT - 8, background: group.projectColor + '33', borderLeft: `3px solid ${group.projectColor}`, color: 'var(--text-primary)' }}>
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
