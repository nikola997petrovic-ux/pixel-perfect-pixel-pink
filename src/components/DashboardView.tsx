import { format, isToday, isPast, isThisWeek, parseISO } from "date-fns";
import { Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, type FormEvent } from "react";
import { useAreas, useAllTasks, useStreaks, useToggleTask, useDeleteTask, useUpdateTask } from "@/lib/api";
import type { Area, Task, Streak } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NewAreaDialog } from "@/components/NewAreaDialog";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export function DashboardView() {
  const { data: areas = [], isLoading: la } = useAreas();
  const { data: tasks = [], isLoading: lt } = useAllTasks();
  const { data: streaks = [] } = useStreaks();

  const today = format(new Date(), "EEEE, MMMM d");

  const byArea = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const a of areas) map.set(a.id, { total: 0, done: 0 });
    for (const t of tasks) {
      const m = map.get(t.area_id);
      if (m) { m.total += 1; if (t.completed) m.done += 1; }
    }
    return map;
  }, [areas, tasks]);

  const streakByArea = useMemo(() => {
    const m = new Map<string, Streak>();
    for (const s of streaks) m.set(s.area_id, s);
    return m;
  }, [streaks]);

  const overdue = tasks.filter((t) => !t.completed && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const dueThisWeek = tasks
    .filter((t) => !t.completed && t.due_date && (isToday(parseISO(t.due_date)) || (isThisWeek(parseISO(t.due_date), { weekStartsOn: 1 }) && !isPast(parseISO(t.due_date)))))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const unscheduled = tasks
    .filter((t) => !t.completed && !t.due_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  return (
    <div className="py-10 md:py-12 px-6 md:px-16 lg:px-24 flex flex-col gap-14 max-w-[1200px]">
      <header className="flex flex-col gap-3 max-w-[65ch]">
        <p className="text-xs text-ink-muted tracking-widest uppercase">{today}</p>
        <h2 className="text-3xl md:text-4xl leading-tight font-serif">
          {areas.length === 0
            ? "A blank page. Begin by naming the domains you wish to cultivate."
            : tasks.length === 0
              ? "Your domains stand ready. Lay down the first goals and tasks."
              : "A quiet morning. The ink is fresh; your history awaits documentation."}
        </h2>
        {totalTasks > 0 && (
          <p className="text-sm text-ink-muted">
            <span className="text-ink tabular-nums">{completedTasks}</span> of <span className="tabular-nums">{totalTasks}</span> entries completed across all domains.
          </p>
        )}
      </header>

      {/* Domains */}
      <section className="flex flex-col gap-6">
        <header className="flex items-baseline justify-between border-b border-ruling pb-3">
          <h3 className="text-xl font-serif">Active Domains</h3>
          <NewAreaDialog
            trigger={
              <button className="text-xs text-ink-muted hover:text-ink uppercase tracking-widest flex items-center gap-1.5">
                <Plus className="size-3" /> Add
              </button>
            }
          />
        </header>

        {la ? (
          <p className="text-sm text-ink-muted">Opening the ledger…</p>
        ) : areas.length === 0 ? (
          <div className="border border-dashed border-ruling p-10 text-center">
            <p className="font-serif text-lg mb-2">No domains yet</p>
            <p className="text-sm text-ink-muted mb-5 max-w-md mx-auto">
              Domains are the broad areas of life you want to grow — Craft, Vitality, Intellect, or whatever names yours.
            </p>
            <NewAreaDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {areas.map((a) => <DomainCard key={a.id} area={a} stats={byArea.get(a.id)} streak={streakByArea.get(a.id)} />)}
          </div>
        )}
      </section>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section className="flex flex-col gap-3">
          <header className="flex items-baseline justify-between border-b border-ruling pb-3">
            <h3 className="text-xl font-serif text-overdue">Overdue</h3>
            <span className="text-xs text-ink-muted uppercase tracking-widest tabular-nums">{overdue.length}</span>
          </header>
          <TaskList tasks={overdue} areas={areas} overdue />
        </section>
      )}

      {/* Imminent intentions */}
      <section className="flex flex-col gap-3 max-w-[800px]">
        <header className="flex items-baseline justify-between border-b border-ruling pb-3">
          <h3 className="text-xl font-serif">Imminent Intentions</h3>
          <span className="text-xs text-ink-muted uppercase tracking-widest">For the week</span>
        </header>
        {lt ? (
          <p className="text-sm text-ink-muted">…</p>
        ) : dueThisWeek.length === 0 ? (
          <p className="text-sm text-ink-muted py-4">Nothing due this week. A clear horizon.</p>
        ) : (
          <TaskList tasks={dueThisWeek} areas={areas} />
        )}
      </section>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <section className="flex flex-col gap-3 max-w-[800px]">
          <header className="flex items-baseline justify-between border-b border-ruling pb-3">
            <h3 className="text-xl font-serif">Unscheduled</h3>
            <span className="text-xs text-ink-muted uppercase tracking-widest tabular-nums">{unscheduled.length}</span>
          </header>
          <p className="text-xs text-ink-muted -mt-1">Tasks without a date. Click a title to set one.</p>
          <TaskList tasks={unscheduled} areas={areas} />
        </section>
      )}
    </div>
  );
}

function DomainCard({ area, stats, streak }: { area: Area; stats?: { total: number; done: number }; streak?: Streak }) {
  const total = stats?.total ?? 0;
  const done = stats?.done ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <Link
      to="/areas/$areaId"
      params={{ areaId: area.id }}
      className="bg-paper-light border border-ruling p-6 flex flex-col gap-7 relative hover:border-ink/40 transition-colors group"
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: area.color }} />
      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <span
            className="text-[10px] font-medium tracking-widest uppercase truncate"
            style={{ color: area.color }}
          >
            {area.emoji} {area.name}
          </span>
          <h4 className="text-xl font-serif text-ink truncate">
            {area.description || "Untitled chapter"}
          </h4>
        </div>
        {streak && streak.current_streak > 0 ? (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-ink-muted">Streak</span>
            <span className="text-sm tabular-nums text-ink">{String(streak.current_streak).padStart(2, "0")} ✦</span>
          </div>
        ) : (
          <span className="text-xs text-ink-muted shrink-0">—</span>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex justify-between text-xs text-ink-muted tabular-nums">
          <span>{pct}% capacity</span>
          <span>{done} / {total} entries</span>
        </div>
        <div className="w-full h-[2px] bg-ruling relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full transition-all" style={{ width: `${pct}%`, backgroundColor: area.color }} />
        </div>
      </div>
    </Link>
  );
}

export function TaskList({ tasks, areas, overdue = false }: { tasks: Task[]; areas: Area[]; overdue?: boolean }) {
  const areaMap = new Map(areas.map((a) => [a.id, a]));
  return (
    <div className="flex flex-col">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} area={areaMap.get(t.area_id)} overdue={overdue} />
      ))}
    </div>
  );
}

function TaskRow({ task, area, overdue }: { task: Task; area?: Area; overdue: boolean }) {
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const update = useUpdateTask();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due_date ?? "");
  const dateRef = useRef<HTMLInputElement>(null);

  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const dueLabel = dueDate ? (isToday(dueDate) ? "Today" : format(dueDate, "EEE, MMM d")) : "Unscheduled";

  const startEdit = () => {
    setTitle(task.title);
    setDue(task.due_date ?? "");
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Title required"); return; }
    if (trimmed.length > 200) { toast.error("Title too long"); return; }
    await update.mutateAsync({ id: task.id, area_id: task.area_id, title: trimmed, due_date: due || null });
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        onSubmit={saveEdit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-3 border-b border-ruling border-dashed last:border-0 -mx-3 md:-mx-4 px-3 md:px-4 bg-paper-light/60"
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus className="bg-paper border-ruling flex-1" />
        <Input ref={dateRef} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-paper border-ruling sm:w-44" />
        <div className="flex items-center gap-1">
          <button type="submit" className="p-2 text-ink hover:bg-paper rounded" aria-label="Save">
            <Check className="size-4" />
          </button>
          <button type="button" onClick={cancelEdit} className="p-2 text-ink-muted hover:text-ink hover:bg-paper rounded" aria-label="Cancel">
            <X className="size-4" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-4 py-3.5 border-b border-ruling border-dashed last:border-0 hover:bg-paper-light/60 transition-colors -mx-3 md:-mx-4 px-3 md:px-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Checkbox
          checked={task.completed}
          onCheckedChange={(c) => toggle.mutate({ id: task.id, area_id: task.area_id, completed: !!c })}
          className="size-4 border-ink-muted data-[state=checked]:bg-ink data-[state=checked]:border-ink"
        />
        <button
          type="button"
          onClick={startEdit}
          className={`text-sm md:text-base text-left truncate ${task.completed ? "line-through text-ink-muted" : "text-ink"} hover:underline underline-offset-4 decoration-dotted`}
        >
          {task.title}
        </button>
      </div>
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {area && (
          <span className="text-[10px] md:text-xs tracking-widest uppercase truncate max-w-[80px] md:max-w-none" style={{ color: area.color }}>
            {area.name}
          </span>
        )}
        <span className={`text-xs tabular-nums min-w-[64px] md:min-w-[80px] text-right ${overdue ? "text-overdue" : "text-ink-muted"}`}>
          {dueLabel}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={startEdit} className="p-1.5 text-ink-muted hover:text-ink rounded" aria-label="Edit task">
            <Pencil className="size-3.5" />
          </button>
          <button type="button" onClick={() => del.mutate({ id: task.id, area_id: task.area_id })} className="p-1.5 text-ink-muted hover:text-overdue rounded" aria-label="Delete task">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
