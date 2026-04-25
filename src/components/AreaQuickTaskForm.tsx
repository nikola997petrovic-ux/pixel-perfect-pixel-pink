import { useState, useRef, type FormEvent } from "react";
import { isPast, isToday, format } from "date-fns";
import { Plus, Trash2, Repeat } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateTask, useTasksForArea, useToggleTask, useDeleteTask } from "@/lib/api";
import { formatWeeklyLabel } from "@/lib/recurrence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const WEEK_DAYS = [
  { label: "M", dow: 1 }, { label: "T", dow: 2 }, { label: "W", dow: 3 },
  { label: "T", dow: 4 }, { label: "F", dow: 5 }, { label: "S", dow: 6 }, { label: "S", dow: 0 },
] as const;

export function AreaQuickTaskForm({ areaId, accent }: { areaId: string; accent: string }) {
  const [title, setTitle] = useState("");
  const [recurMode, setRecurMode] = useState<"none" | "daily" | "weekly">("none");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const { data: tasks = [] } = useTasksForArea(areaId);

  const visibleTasks = [...tasks]
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.created_at.localeCompare(b.created_at))
    .slice(0, 5);

  const cycleRecur = () => {
    setRecurMode((m) => {
      if (m === "none") return "daily";
      if (m === "daily") return "weekly";
      setSelectedDays([]);
      return "none";
    });
  };

  const toggleDay = (d: number) =>
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const getRecurrence = (): string | null => {
    if (recurMode === "daily") return "daily";
    if (recurMode === "weekly" && selectedDays.length > 0)
      return `weekly:${[...selectedDays].sort().join(",")}`;
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) { toast.error("Title too long"); return; }

    await createTask.mutateAsync({
      area_id: areaId,
      goal_id: null,
      title: trimmedTitle,
      due_date: null,
      recurrence: getRecurrence(),
    });

    setTitle("");
    setRecurMode("none");
    setSelectedDays([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-ruling/60 border-dashed">
      {visibleTasks.length > 0 && (
        <ul className="flex flex-col">
          {visibleTasks.map((t) => {
            const due = t.due_date ? parseDate(t.due_date) : null;
            const overdue = due && !t.completed && isPast(due) && !isToday(due);
            const recurLabel = t.recurrence === "daily"
              ? "Daily"
              : t.recurrence?.startsWith("weekly:")
                ? formatWeeklyLabel(t.recurrence)
                : null;
            return (
              <li key={t.id} className="group flex items-center gap-3 py-1.5">
                <Checkbox
                  checked={t.completed}
                  onCheckedChange={(c) =>
                    toggleTask.mutate({ id: t.id, area_id: t.area_id, completed: !!c })
                  }
                  className="size-4 border-ink-muted data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                  style={{ accentColor: accent }}
                />
                <span className={`text-sm flex-1 truncate ${t.completed ? "line-through text-ink-muted" : "text-ink"}`}>
                  {t.title}
                  {recurLabel && (
                    <Repeat className="inline-block size-3 ml-1.5 text-ink-muted" aria-label={recurLabel} />
                  )}
                </span>
                {due && (
                  <span className={`text-xs tabular-nums ${overdue ? "text-overdue" : "text-ink-muted"}`}>
                    {isToday(due) ? "Today" : format(due, "MMM d")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask.mutate({ id: t.id, area_id: t.area_id })}
                  className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 text-ink-muted hover:text-overdue transition-opacity"
                  aria-label="Delete task"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {tasks.length > visibleTasks.length && (
        <Link
          to="/areas/$areaId"
          params={{ areaId }}
          className="text-xs text-ink-muted hover:text-ink underline underline-offset-2 transition-colors"
        >
          +{tasks.length - visibleTasks.length} more — open domain to see all
        </Link>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a task to this domain…"
            maxLength={200}
            className="bg-paper border-ruling flex-1"
          />
          <button
            type="button"
            onClick={cycleRecur}
            aria-pressed={recurMode !== "none"}
            title={recurMode === "none" ? "No recurrence" : recurMode === "daily" ? "Daily" : "Specific days"}
            className={`p-2 border rounded transition-colors ${recurMode !== "none" ? "border-ink bg-paper-light text-ink" : "border-ruling text-ink-muted hover:text-ink"}`}
          >
            <Repeat className="size-3.5" />
          </button>
          <Button type="submit" variant="outline" className="border-ruling text-ink hover:bg-paper" disabled={createTask.isPending}>
            <Plus className="size-3.5" />
            Add task
          </Button>
        </div>
        {recurMode === "weekly" && (
          <div className="flex items-center gap-1.5 pl-0.5">
            <span className="text-[10px] uppercase tracking-widest text-ink-muted">Days</span>
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
        {recurMode !== "none" && (
          <p className="text-[10px] text-ink-muted pl-0.5">
            {recurMode === "daily"
              ? "Repeats every day"
              : selectedDays.length === 0
                ? "Select days below"
                : `Repeats every ${selectedDays.map((d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")}`}
          </p>
        )}
      </form>
    </div>
  );
}
