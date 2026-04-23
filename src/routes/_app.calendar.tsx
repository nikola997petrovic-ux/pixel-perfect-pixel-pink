import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, isPast, addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarPlus, X } from "lucide-react";
import { useAreas, useAllTasks, useToggleTask, useUpdateTask, useCreateTask } from "@/lib/api";
import type { Task } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { type FormEvent } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Chronology — Monograph" }] }),
});

function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const { data: areas = [] } = useAreas();
  const { data: tasks = [] } = useAllTasks();
  const toggle = useToggleTask();
  const update = useUpdateTask();
  const create = useCreateTask();
  const [newTitle, setNewTitle] = useState("");
  const [newAreaId, setNewAreaId] = useState<string>("");
  const newTitleRef = useRef<HTMLInputElement>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date;
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [tasks]);

  const unscheduled = tasks.filter((t) => !t.due_date && !t.completed);
  const selectedTasks = selected ? tasksByDay.get(format(selected, "yyyy-MM-dd")) ?? [] : [];
  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;

  return (
    <div className="py-10 md:py-12 px-4 md:px-16 lg:px-24 flex flex-col gap-8 max-w-[1200px]">
      <header className="flex flex-col gap-3 max-w-[65ch] px-2 md:px-0">
        <p className="text-xs text-ink-muted tracking-widest uppercase">Chronology</p>
        <h2 className="text-3xl md:text-4xl leading-tight font-serif">A timeline of your intentions and entries.</h2>
      </header>

      <div className="flex items-center justify-between border-b border-ruling pb-3 px-2 md:px-0">
        <button onClick={() => setCursor((c) => subMonths(c, 1))} className="size-9 flex items-center justify-center text-ink-muted hover:text-ink"><ChevronLeft className="size-4" /></button>
        <h3 className="font-serif text-xl md:text-2xl">{format(cursor, "MMMM yyyy")}</h3>
        <button onClick={() => setCursor((c) => addMonths(c, 1))} className="size-9 flex items-center justify-center text-ink-muted hover:text-ink"><ChevronRight className="size-4" /></button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] md:text-xs uppercase tracking-widest text-ink-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-l border-ruling -mt-6">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const dayTasks = tasksByDay.get(format(day, "yyyy-MM-dd")) ?? [];
          const dots = dayTasks.slice(0, 4);
          const hasOverdue = dayTasks.some((t) => !t.completed && isPast(day) && !isToday(day));
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelected(day)}
              className={`relative aspect-square md:aspect-[1/0.85] border-r border-b border-ruling p-1.5 md:p-2 text-left flex flex-col gap-1 transition-colors ${inMonth ? "bg-paper-light" : "bg-paper"} hover:bg-paper-light/80`}
            >
              <span className={`text-xs md:text-sm tabular-nums ${isToday(day) ? "font-bold text-ink" : inMonth ? "text-ink" : "text-ink-muted/50"} ${hasOverdue ? "text-overdue" : ""}`}>
                {format(day, "d")}
              </span>
              <div className="flex flex-wrap gap-0.5 mt-auto">
                {dots.map((t) => {
                  const a = areaMap.get(t.area_id);
                  const overdueDot = !t.completed && isPast(day) && !isToday(day);
                  return (
                    <span
                      key={t.id}
                      className={`size-1.5 rounded-full ${t.completed ? "opacity-40" : ""}`}
                      style={{ backgroundColor: overdueDot ? "var(--overdue)" : a?.color ?? "var(--ink-muted)" }}
                    />
                  );
                })}
                {dayTasks.length > 4 && (
                  <span className="text-[9px] text-ink-muted ml-0.5 leading-none">+{dayTasks.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <section className="flex flex-col gap-3 px-2 md:px-0 mt-4">
          <h3 className="text-xs uppercase tracking-widest text-ink-muted border-b border-ruling pb-2">Unscheduled · {unscheduled.length}</h3>
          <p className="text-xs text-ink-muted -mt-1">Tap a day above first, then schedule from inside.</p>
          <div className="flex flex-col">
            {unscheduled.map((t) => {
              const a = areaMap.get(t.area_id);
              return (
                <div key={t.id} className="flex justify-between items-center gap-3 py-3 border-b border-dashed border-ruling/60 last:border-0">
                  <span className="text-sm text-ink truncate flex-1">{t.title}</span>
                  {a && <span className="text-[10px] uppercase tracking-widest" style={{ color: a.color }}>{a.name}</span>}
                  <input
                    type="date"
                    aria-label={`Schedule ${t.title}`}
                    className="bg-paper border border-ruling rounded px-2 py-1 text-xs"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) update.mutate({ id: t.id, area_id: t.area_id, due_date: v });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="bg-paper border-ruling w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">{selected && format(selected, "EEEE, MMMM d")}</SheetTitle>
            <SheetDescription className="text-ink-muted">
              {selectedTasks.length === 0 ? "A blank page." : `${selectedTasks.length} ${selectedTasks.length === 1 ? "entry" : "entries"}`}
            </SheetDescription>
          </SheetHeader>

          {selectedKey && areas.length > 0 && (
            <form
              onSubmit={async (e: FormEvent) => {
                e.preventDefault();
                const trimmed = newTitle.trim();
                if (!trimmed) return;
                if (trimmed.length > 200) { toast.error("Title too long"); return; }
                const aid = newAreaId || areas[0]?.id;
                if (!aid) { toast.error("Add a domain first"); return; }
                await create.mutateAsync({
                  area_id: aid,
                  goal_id: null,
                  title: trimmed,
                  due_date: selectedKey,
                });
                setNewTitle("");
                newTitleRef.current?.focus();
              }}
              className="flex flex-col gap-2 mt-6 pb-4 border-b border-ruling"
            >
              <p className="text-xs uppercase tracking-widest text-ink-muted">New entry on this day</p>
              <Input
                ref={newTitleRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Write a task…"
                maxLength={200}
                className="bg-paper border-ruling"
              />
              <div className="flex gap-2">
                <select
                  value={newAreaId || areas[0]?.id || ""}
                  onChange={(e) => setNewAreaId(e.target.value)}
                  className="bg-paper border border-ruling rounded px-2 py-1.5 text-sm text-ink flex-1 min-w-0"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                  ))}
                </select>
                <Button type="submit" variant="outline" className="border-ruling text-ink hover:bg-paper-light" disabled={create.isPending}>
                  <CalendarPlus className="size-3.5 mr-1" /> Add
                </Button>
              </div>
            </form>
          )}

          <div className="flex flex-col mt-6">
            {selectedTasks.map((t) => {
              const a = areaMap.get(t.area_id);
              const overdue = selected && !t.completed && isPast(selected) && !isToday(selected);
              return (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b border-dashed border-ruling/60 last:border-0">
                  <Checkbox
                    checked={t.completed}
                    onCheckedChange={(c) => toggle.mutate({ id: t.id, area_id: t.area_id, completed: !!c })}
                    className="size-4 border-ink-muted data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.completed ? "line-through text-ink-muted" : overdue ? "text-overdue" : "text-ink"}`}>{t.title}</p>
                    {a && <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: a.color }}>{a.emoji} {a.name}</p>}
                  </div>
                  <input
                    type="date"
                    value={t.due_date ?? ""}
                    aria-label="Reschedule"
                    className="bg-paper border border-ruling rounded px-2 py-1 text-xs"
                    onChange={(e) => update.mutate({ id: t.id, area_id: t.area_id, due_date: e.target.value || null })}
                  />
                  <button
                    type="button"
                    onClick={() => update.mutate({ id: t.id, area_id: t.area_id, due_date: null })}
                    className="text-ink-muted hover:text-overdue p-1"
                    aria-label="Unschedule"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {unscheduled.length > 0 && selectedKey && (
            <div className="mt-8 flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-widest text-ink-muted border-b border-ruling pb-2">
                Schedule onto this day
              </h4>
              {unscheduled.map((t) => {
                const a = areaMap.get(t.area_id);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-ruling/60 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{t.title}</p>
                      {a && <p className="text-[10px] uppercase tracking-widest" style={{ color: a.color }}>{a.emoji} {a.name}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-ruling text-ink hover:bg-paper-light"
                      onClick={() => update.mutate({ id: t.id, area_id: t.area_id, due_date: selectedKey })}
                    >
                      <CalendarPlus className="size-3.5 mr-1" /> Add
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
