import { useState, type FormEvent } from "react";
import { parseISO, isPast, isToday, format } from "date-fns";
import { Plus, Trash2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useCreateTask, useTasksForArea, useToggleTask, useDeleteTask } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function AreaQuickTaskForm({ areaId, accent }: { areaId: string; accent: string }) {
  const [title, setTitle] = useState("");
  const [daily, setDaily] = useState(false);
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const { data: tasks = [] } = useTasksForArea(areaId);

  const visibleTasks = [...tasks]
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.created_at.localeCompare(b.created_at))
    .slice(0, 5);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) {
      toast.error("Title too long");
      return;
    }

    await createTask.mutateAsync({
      area_id: areaId,
      goal_id: null,
      title: trimmedTitle,
      due_date: null,
      recurrence: daily ? "daily" : null,
    });

    setTitle("");
    setDaily(false);
  };

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-ruling/60 border-dashed">
      {visibleTasks.length > 0 && (
        <ul className="flex flex-col">
          {visibleTasks.map((t) => {
            const due = t.due_date ? parseISO(t.due_date) : null;
            const overdue = due && !t.completed && isPast(due) && !isToday(due);
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
                <span
                  className={`text-sm flex-1 truncate ${t.completed ? "line-through text-ink-muted" : "text-ink"}`}
                >
                  {t.title}
                  {t.recurrence === "daily" && (
                    <Repeat className="inline-block size-3 ml-1.5 text-ink-muted" aria-label="Daily" />
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
                  className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-overdue transition-opacity"
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
        <p className="text-xs text-ink-muted">+{tasks.length - visibleTasks.length} more — open domain to see all</p>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task to this domain…"
          maxLength={200}
          className="bg-paper border-ruling flex-1"
        />
        <button
          type="button"
          onClick={() => setDaily((d) => !d)}
          aria-pressed={daily}
          title={daily ? "Daily — repeats every day" : "Mark as daily"}
          className={`p-2 border rounded transition-colors ${daily ? "border-ink bg-paper-light text-ink" : "border-ruling text-ink-muted hover:text-ink"}`}
        >
          <Repeat className="size-3.5" />
        </button>
        <Button type="submit" variant="outline" className="border-ruling text-ink hover:bg-paper" disabled={createTask.isPending}>
          <Plus className="size-3.5" />
          Add task
        </Button>
      </form>
    </div>
  );
}