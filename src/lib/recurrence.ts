import type { Task } from "@/lib/types";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// "days:1,3" → [1, 3]
export function parseWeeklyDays(recurrence: string): number[] {
  return recurrence.slice("days:".length).split(",").map(Number);
}

// "days:1,3" → "Mon, Wed"
export function formatWeeklyLabel(recurrence: string): string {
  return parseWeeklyDays(recurrence).map((d) => DAY_ABBR[d]).join(", ");
}

/** True if a task with this recurrence should appear on the given date. */
export function isScheduledOn(recurrence: string | null, date: Date): boolean {
  if (!recurrence) return false;
  if (recurrence === "daily") return true;
  if (recurrence.startsWith("days:")) {
    return parseWeeklyDays(recurrence).includes(date.getDay());
  }
  return false;
}

export function isScheduledToday(recurrence: string | null): boolean {
  return isScheduledOn(recurrence, new Date());
}

export function applyRecurrence(task: Task): Task {
  const r = task.recurrence;
  if (!r) return task;

  const today = new Date().toISOString().slice(0, 10);

  if (r === "daily") {
    if (!task.completed) return task;
    if (task.last_completed_date && task.last_completed_date >= today) return task;
    return { ...task, completed: false };
  }

  if (r.startsWith("days:")) {
    const scheduledDays = parseWeeklyDays(r);
    const todayDow = new Date().getDay();
    if (!scheduledDays.includes(todayDow)) {
      // Not a scheduled day — treat as not-yet-due so it stays out of active lists
      return { ...task, completed: false };
    }
    // Scheduled day: reset if not completed yet today
    if (!task.completed) return task;
    if (task.last_completed_date && task.last_completed_date >= today) return task;
    return { ...task, completed: false };
  }

  return task;
}

export function applyRecurrenceMany(tasks: Task[]): Task[] {
  return tasks.map(applyRecurrence);
}
