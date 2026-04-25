import { format, isToday, isPast, isThisWeek, isTomorrow, addDays } from "date-fns";
import { Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, type FormEvent } from "react";
import { useAreas, useAllTasks, useStreaks, useToggleTask, useDeleteTask, useUpdateTask, useReorderAreas } from "@/lib/api";
import { isTaskScheduledToday, isTaskScheduledOn, getDaysFromNotes, setDaysInNotes, getDisplayNotes, formatDaysLabel } from "@/lib/recurrence";
import type { Area, Task, Streak } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NewAreaDialog } from "@/components/NewAreaDialog";
import { EditAreaDialog } from "@/components/EditAreaDialog";
import { Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Parse date-only strings (e.g. "2026-04-25") as local midnight.
// date-fns v3+ parseISO returns UTC midnight for date-only strings, which
// shifts comparisons like isToday/isPast by the user's UTC offset.
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DashboardView() {
  const { data: areas = [], isLoading: la } = useAreas();
  const { data: tasks = [], isLoading: lt } = useAllTasks();
  const { data: streaks = [] } = useStreaks();

  const today = format(new Date(), "EEEE, MMMM d");
  const tomorrowDateObj = addDays(new Date(), 1);
  const tomorrowKey = format(tomorrowDateObj, "yyyy-MM-dd");

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

  const overdue = tasks.filter((t) => !t.completed && t.due_date && isPast(parseDate(t.due_date)) && !isToday(parseDate(t.due_date)));
  const dueThisWeek = tasks
    .filter((t) => !t.completed && t.due_date && (isToday(parseDate(t.due_date)) || (isThisWeek(parseDate(t.due_date), { weekStartsOn: 1 }) && !isPast(parseDate(t.due_date)))))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const dailies = tasks.filter((t) => isTaskScheduledToday(t));
  // Tomorrow: tasks dated for tomorrow + all tasks recurring tomorrow
  const tomorrowRecurring = tasks.filter((t) => isTaskScheduledOn(t, tomorrowDateObj));
  const tomorrowDated = tasks.filter((t) => t.due_date === tomorrowKey && !tomorrowRecurring.some((r) => r.id === t.id));
  const tomorrow = [...tomorrowDated, ...tomorrowRecurring].sort((a, b) => a.title.localeCompare(b.title));
  const unscheduled = tasks
    .filter((t) => !t.completed && !t.due_date && !t.recurrence)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  type TabKey = "week" | "tomorrow" | "daily" | "unscheduled";
  const tabDefs: { key: TabKey; label: string; count: number; visible: boolean }[] = [
    { key: "week", label: "This Week", count: dueThisWeek.length, visible: true },
    { key: "tomorrow", label: "Tomorrow", count: tomorrow.length, visible: true },
    { key: "daily", label: "Daily Rituals", count: dailies.length, visible: dailies.length > 0 },
    { key: "unscheduled", label: "Unscheduled", count: unscheduled.length, visible: unscheduled.length > 0 },
  ];
  const visibleTabs = tabDefs.filter((t) => t.visible);
  const [activeTab, setActiveTab] = useState<TabKey>("week");

  const EXCELLENCE_QUOTES = [
    "We are what we repeatedly do. Excellence, then, is not an act, but a habit. — Aristotle",
    "Quality is not an act, it is a habit. — Aristotle",
    "Excellence is the gradual result of always striving to do better. — Pat Riley",
    "Success is the sum of small efforts repeated day in and day out. — Robert Collier",
    "Brilliance is a thousand quiet repetitions nobody sees.",
    "The difference between ordinary and extraordinary is that little extra — done consistently.",
    "Discipline is choosing between what you want now and what you want most. — Abraham Lincoln",
    "Small disciplines repeated with consistency every day lead to great achievements. — John Maxwell",
    "Habits are the compound interest of self-improvement. — James Clear",
    "Motivation gets you going. Habit keeps you growing. — John Maxwell",
    "Mastery is not a function of genius or talent. It is a function of time and intense focus. — Robert Greene",
    "Excellence is doing ordinary things extraordinarily well. — John W. Gardner",
    "You don't rise to the level of your goals. You fall to the level of your systems. — James Clear",
    "Long-term consistency beats short-term intensity. — Bruce Lee",
  ];
  const _now = new Date();
  const dayOfYear = Math.floor((_now.getTime() - new Date(_now.getFullYear(), 0, 1).getTime()) / 86400000);
  const dailyQuote = EXCELLENCE_QUOTES[dayOfYear % EXCELLENCE_QUOTES.length];

  return (
    <div className="py-10 md:py-12 px-6 md:px-16 lg:px-24 flex flex-col gap-14 max-w-[1200px]">
      <header className="flex flex-col gap-3 max-w-[65ch]">
        <p className="text-xs text-ink-muted tracking-widest uppercase">{today}</p>
        <h2 className="text-3xl md:text-4xl leading-tight font-serif">
          {areas.length === 0
            ? "A blank page. Name the domains where you intend to be excellent."
            : tasks.length === 0
              ? "Excellence begins with the first small entry. Set a goal, log a task."
              : `“${dailyQuote}”`}
        </h2>
        {totalTasks > 0 && (
          <p className="text-sm text-ink-muted">
            <span className="text-ink tabular-nums">{completedTasks}</span> of <span className="tabular-nums">{totalTasks}</span> entries completed across all domains.
          </p>
        )}
      </header>

      {/* Tabbed task views */}
      <section className="flex flex-col gap-4 max-w-[900px]">
        <header className="border-b border-ruling pb-3">
          <h3 className="text-xl font-serif">Intentions</h3>
        </header>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="bg-paper-light border border-ruling rounded-none h-auto p-0 flex flex-wrap justify-start w-full">
            {visibleTabs.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="rounded-none border-r border-ruling last:border-r-0 data-[state=active]:bg-paper data-[state=active]:shadow-none data-[state=active]:text-ink text-ink-muted px-4 py-2.5 text-xs uppercase tracking-widest font-medium"
              >
                {t.label}
                <span className="ml-2 tabular-nums opacity-60">{t.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="week" className="mt-4">
            {lt ? (
              <p className="text-sm text-ink-muted">…</p>
            ) : dueThisWeek.length === 0 ? (
              <p className="text-sm text-ink-muted py-4">Nothing due this week. A clear horizon.</p>
            ) : (
              <TaskList tasks={dueThisWeek} areas={areas} />
            )}
          </TabsContent>

          <TabsContent value="tomorrow" className="mt-4">
            {tomorrow.length === 0 ? (
              <p className="text-sm text-ink-muted py-4">Tomorrow stands empty.</p>
            ) : (
              <>
                {dailies.length > 0 && (
                  <p className="text-xs text-ink-muted mb-2">Includes daily rituals — they reset for tomorrow.</p>
                )}
                <TaskList tasks={tomorrow} areas={areas} />
              </>
            )}
          </TabsContent>

          {dailies.length > 0 && (
            <TabsContent value="daily" className="mt-4">
              <p className="text-xs text-ink-muted mb-2 tabular-nums">
                {dailies.filter((t) => t.completed).length}/{dailies.length} done today
              </p>
              <TaskList tasks={dailies} areas={areas} />
            </TabsContent>
          )}

          {unscheduled.length > 0 && (
            <TabsContent value="unscheduled" className="mt-4">
              <p className="text-xs text-ink-muted mb-2">Tasks without a date. Click a title to set one.</p>
              <TaskList tasks={unscheduled} areas={areas} />
            </TabsContent>
          )}
        </Tabs>
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
          <SortableDomainGrid
            areas={areas}
            byArea={byArea}
            streakByArea={streakByArea}
          />
        )}
      </section>
    </div>
  );
}

function SortableDomainGrid({
  areas,
  byArea,
  streakByArea,
}: {
  areas: Area[];
  byArea: Map<string, { total: number; done: number }>;
  streakByArea: Map<string, Streak>;
}) {
  const reorder = useReorderAreas();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = areas.map((a) => a.id);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    reorder.mutate(arrayMove(ids, oldIdx, newIdx));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {areas.map((a) => (
            <DomainCard key={a.id} area={a} stats={byArea.get(a.id)} streak={streakByArea.get(a.id)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function DomainCard({ area, stats, streak }: { area: Area; stats?: { total: number; done: number }; streak?: Streak }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: area.id });
  const total = stats?.total ?? 0;
  const done = stats?.done ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group/card bg-paper-light border border-ruling p-6 flex flex-col gap-7 hover:border-ink/40 transition-colors"
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: area.color }} />
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        onClick={(e) => e.preventDefault()}
        className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-2 bg-paper border border-ruling text-ink cursor-grab active:cursor-grabbing touch-none shadow-sm md:px-2 md:py-2 md:bg-transparent md:border-transparent md:text-ink-muted md:shadow-none md:opacity-0 md:group-hover/card:opacity-100 transition-opacity"
      >
        <GripVertical className="size-4 shrink-0" />
        <span className="text-[10px] uppercase tracking-widest md:hidden">Move</span>
      </button>
      <div className="flex justify-between items-start gap-3 pr-16">
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
      <div className="flex justify-between items-center">
        <EditAreaDialog
          area={area}
          trigger={
            <button type="button" className="text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink flex items-center gap-1">
              <Pencil className="size-3" /> Edit
            </button>
          }
        />
        <Link
          to="/areas/$areaId"
          params={{ areaId: area.id }}
          className="text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink"
        >
          Open
        </Link>
      </div>
    </div>
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

const WEEK_DAYS = [
  { label: "M", dow: 1 }, { label: "T", dow: 2 }, { label: "W", dow: 3 },
  { label: "T", dow: 4 }, { label: "F", dow: 5 }, { label: "S", dow: 6 }, { label: "S", dow: 0 },
] as const;

function TaskRow({ task, area, overdue }: { task: Task; area?: Area; overdue: boolean }) {
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const update = useUpdateTask();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due_date ?? "");
  const [recurMode, setRecurMode] = useState<"none" | "daily" | "weekly">("none");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const dateRef = useRef<HTMLInputElement>(null);

  const dueDate = task.due_date ? parseDate(task.due_date) : null;
  const dueLabel = dueDate
    ? isToday(dueDate)
      ? "Today"
      : isTomorrow(dueDate)
        ? "Tomorrow"
        : format(dueDate, "EEE, MMM d")
    : task.recurrence === "daily"
      ? (() => { const d = getDaysFromNotes(task.notes); return d?.length ? formatDaysLabel(d) : "Daily"; })()
      : "Unscheduled";

  const startEdit = () => {
    setTitle(task.title);
    setDue(task.due_date ?? "");
    if (task.recurrence === "daily") {
      const days = getDaysFromNotes(task.notes);
      if (days && days.length > 0) {
        setRecurMode("weekly");
        setSelectedDays(days);
      } else {
        setRecurMode("daily");
        setSelectedDays([]);
      }
    } else {
      setRecurMode("none");
      setSelectedDays([]);
    }
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Title required"); return; }
    if (trimmed.length > 200) { toast.error("Title too long"); return; }
    const recurrence = recurMode !== "none" ? "daily" : null;
    const days = recurMode === "weekly" && selectedDays.length > 0 ? selectedDays : null;
    const notes = setDaysInNotes(days, getDisplayNotes(task.notes)) || null;
    await update.mutateAsync({ id: task.id, area_id: task.area_id, title: trimmed, due_date: due || null, recurrence, notes });
    setEditing(false);
  };
  const toggleDay = (d: number) =>
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  if (editing) {
    return (
      <form
        onSubmit={saveEdit}
        className="flex flex-col gap-2 py-3 border-b border-ruling border-dashed last:border-0 -mx-3 md:-mx-4 px-3 md:px-4 bg-paper-light/60"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus className="bg-paper border-ruling flex-1" />
          <div className="flex items-stretch gap-1">
            <Input ref={dateRef} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-paper border-ruling flex-1 sm:w-36" />
            <button type="button" onClick={() => setDue("")} title="Clear date" aria-label="Clear date" className="w-9 h-9 flex items-center justify-center border border-ruling text-ink-muted hover:text-ink hover:border-ink rounded transition-colors shrink-0">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button type="submit" className="p-2 text-ink hover:bg-paper rounded" aria-label="Save">
              <Check className="size-4" />
            </button>
            <button type="button" onClick={cancelEdit} className="p-2 text-ink-muted hover:text-ink hover:bg-paper rounded" aria-label="Cancel">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-ink-muted mr-0.5">Repeat</span>
          {(["none", "daily", "weekly"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setRecurMode(m)}
              className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
                recurMode === m ? "border-ink text-ink" : "border-ruling text-ink-muted hover:text-ink"
              }`}
            >
              {m === "none" ? "None" : m === "daily" ? "Daily" : "Days"}
            </button>
          ))}
          {recurMode === "weekly" && (
            <div className="flex gap-1 ml-1">
              {WEEK_DAYS.map(({ label, dow }) => (
                <button
                  type="button"
                  key={dow}
                  onClick={() => toggleDay(dow)}
                  className={`w-6 h-6 text-[10px] font-medium border transition-colors ${
                    selectedDays.includes(dow) ? "border-ink text-ink bg-paper-light" : "border-ruling text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
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
        <div className="flex items-center gap-1">
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
