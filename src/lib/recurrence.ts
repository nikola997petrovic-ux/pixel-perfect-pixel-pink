import type { Task } from "@/lib/types";

/**
 * For a daily-recurring task, treat it as "open" again the moment the
 * calendar day rolls over from when it was last completed.
 * Returns the task with `completed` adjusted for display purposes.
 */
export function applyRecurrence(task: Task): Task {
  if (task.recurrence !== "daily") return task;
  if (!task.completed) return task;
  const today = new Date().toISOString().slice(0, 10);
  if (task.last_completed_date && task.last_completed_date >= today) return task;
  return { ...task, completed: false };
}

export function applyRecurrenceMany(tasks: Task[]): Task[] {
  return tasks.map(applyRecurrence);
}