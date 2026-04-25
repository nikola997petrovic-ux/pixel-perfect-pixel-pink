import { useState, type FormEvent } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useUpdateGoal, useDeleteGoal } from "@/lib/api";
import type { Goal } from "@/lib/types";

export function GoalRowEditable({ goal }: { goal: Goal }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [targetDate, setTargetDate] = useState(goal.target_date ?? "");
  const update = useUpdateGoal();
  const del = useDeleteGoal();

  const isCompleted = goal.status === "completed";
  const isPaused = goal.status === "paused";

  const openEdit = () => {
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setTargetDate(goal.target_date ?? "");
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { toast.error("Title required"); return; }
    if (trimmed.length > 120) { toast.error("Title too long"); return; }
    await update.mutateAsync({
      id: goal.id,
      area_id: goal.area_id,
      title: trimmed,
      description: description.trim() || null,
      target_date: targetDate || null,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        onSubmit={save}
        className="flex flex-col gap-2 py-3 px-3 mb-1 border border-ruling bg-paper-light"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
          placeholder="Goal title"
          className="bg-paper border border-ruling px-2 py-1.5 text-sm outline-none focus:border-ink w-full"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="Description (optional)"
          rows={2}
          className="bg-paper border border-ruling px-2 py-1.5 text-sm outline-none focus:border-ink w-full resize-none"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-paper border border-ruling px-2 py-1.5 text-sm outline-none focus:border-ink flex-1"
          />
          <button
            type="button"
            onClick={() => setTargetDate("")}
            aria-label="Clear date"
            className="w-8 h-8 flex items-center justify-center border border-ruling text-ink-muted hover:text-ink transition-colors shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex gap-2 pt-0.5">
          <button type="submit" disabled={update.isPending} className="px-3 py-1.5 bg-ink text-paper text-xs uppercase tracking-widest hover:bg-ink/80 transition-colors">
            Save
          </button>
          <button type="button" onClick={cancel} className="px-3 py-1.5 border border-ruling text-ink-muted text-xs uppercase tracking-widest hover:text-ink transition-colors">
            Cancel
          </button>
        </div>
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
          onClick={openEdit}
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
