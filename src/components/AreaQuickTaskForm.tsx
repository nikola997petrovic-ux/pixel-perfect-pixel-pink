import { useState, useRef, type FormEvent } from "react";
import { isPast, isToday, format } from "date-fns";
import { Plus, Trash2, Repeat } from "lucide-react"; // Repeat used in recurrence form
import { toast } from "sonner";
import { useCreateTask, useTasksForArea, useToggleTask, useDeleteTask } from "@/lib/api";
import { getDaysFromNotes, setDaysInNotes, formatDaysLabel } from "@/lib/recurrence";
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
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const { data: tasks = [] } = useTasksForArea(areaId);

  const sorted = [...tasks].sort(
    (a, b) => Number(a.completed) - Number(b.completed) || a.created_at.localeCompare(b.created_at),
  );
  const visibleTasks = expanded ? sorted : sorted.slice(0, 5);
  const hiddenCount = sorted.length - 5;

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) { toast.error("Title too long"); return; }

    const recurrence = recurMode !== "none" ? "daily" : null;
    const notes = recurMode === "weekly" && selectedDays.length > 0
      ? setDaysInNotes(selectedDays, "") : null;

    await createTask.mutateAsync({
      area_id: areaId,
      goal_id: null,
      title: trimmedTitle,
      due_date: null,
      recurrence,
      notes: notes ?? undefined,
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
            const days = getDaysFromNotes(t.notes);
            const recurLabel = t.recurrence === "daily"
              ? (days?.length ? formatDaysLabel(days) : "Daily")
              : null;
            const dateLabel = due
              ? (isToday(due) ? "Today" : format(due, "MMM d"))
              : null;
            const meta = recurLabel ?? dateLabel;
            return (
              <li key={t.id} className="group flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={t.completed}
                  onCheckedChange={(c) =>
                    toggleTask.mutate({ id: t.id, area_id: t.area_id, completed: !!c })
                  }
                  className="size-4 shrink-0 border-ink-muted data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                  style={{ accentColor: accent }}
                />
                <span className={`text-sm flex-1 min-w-0 truncate ${t.completed ? "line-through text-ink-muted" : "text-ink"}`}>
                  {t.title}
                </span>
                {meta && (
                  <span className={`text-xs shrink-0 tabular-nums ${overdue ? "text-overdue" : "text-ink-muted"}`}>
                    {meta}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask.mutate({ id: t.id, area_id: t.area_id })}
                  className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 text-ink-muted hover:text-overdue transition-opacity shrink-0"
                  aria-label="Delete task"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-ink-muted hover:text-ink text-left transition-colors"
        >
          +{hiddenCount} more
        </button>
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
