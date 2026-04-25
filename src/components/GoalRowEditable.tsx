import { useState, type FormEvent } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useUpdateGoal, useDeleteGoal } from "@/lib/api";
import type { Goal } from "@/lib/types";

export function GoalRowEditable({ goal }: { goal: Goal }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const update = useUpdateGoal();
  const del = useDeleteGoal();

  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Title required"); return; }
    if (trimmed.length > 120) { toast.error("Title too long"); return; }
    await update.mutateAsync({ id: goal.id, area_id: goal.area_id, title: trimmed });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(goal.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        onSubmit={save}
        className="flex items-center gap-2 py-2 border-b border-ruling border-dashed last:border-0"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
          className="flex-1 min-w-0 bg-paper border border-ruling px-2 py-1 text-sm outline-none focus:border-ink"
        />
        <button type="submit" className="p-1.5 text-ink hover:bg-paper-light rounded" aria-label="Save">
          <Check className="size-3.5" />
        </button>
        <button type="button" onClick={cancel} className="p-1.5 text-ink-muted hover:text-ink rounded" aria-label="Cancel">
          <X className="size-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="group flex items-center gap-2 py-2 border-b border-ruling border-dashed last:border-0">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isCompleted ? "bg-ink-muted" : isPaused ? "bg-ruling" : "bg-ink"
        }`}
      />
      <span
        className={`text-sm flex-1 min-w-0 truncate ${
          isCompleted
            ? "line-through text-ink-muted"
            : isPaused
              ? "text-ink-muted"
              : "text-ink"
        }`}
      >
        {goal.title}
      </span>
      {goal.target_date && !isPaused && !isCompleted && (
        <span className="text-xs text-ink-muted tabular-nums shrink-0">
          {new Date(goal.target_date.replace(/-/g, "/")).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
      {isPaused && <span className="text-[10px] uppercase tracking-widest text-ink-muted shrink-0">Paused</span>}
      {isCompleted && <span className="text-[10px] uppercase tracking-widest text-ink-muted shrink-0">Done</span>}
      <div className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
        <button
          type="button"
          onClick={() => { setTitle(goal.title); setEditing(true); }}
          className="p-1 text-ink-muted hover:text-ink transition-colors"
          aria-label="Edit goal"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => del.mutate({ id: goal.id, area_id: goal.area_id })}
          className="p-1 text-ink-muted hover:text-overdue transition-colors"
          aria-label="Delete goal"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}
