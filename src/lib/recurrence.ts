import type { Task } from "@/lib/types";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Days are stored as a hidden prefix in the notes field because the DB
// constraint only allows recurrence = NULL | 'daily'.
// Format: <!--days:1,3-->user notes here
const DAYS_RE = /^<!--days:(\d(?:,\d)*)-->/;

export function getDaysFromNotes(notes: string | null | undefined): number[] | null {
  if (!notes) return null;
  const m = notes.match(DAYS_RE);
  return m ? m[1].split(",").map(Number) : null;
}

export function setDaysInNotes(days: number[] | null, userNotes: string): string {
  const base = userNotes.replace(DAYS_RE, "");
  if (!days || days.length === 0) return base;
  return `<!--days:${[...days].sort().join(",")}-->${base}`;
}

export function getDisplayNotes(notes: string | null | undefined): string {
  return notes?.replace(DAYS_RE, "") ?? "";
}

export function formatDaysLabel(days: number[]): string {
  return days.map((d) => DAY_ABBR[d]).join(", ");
}

export function isTaskScheduledOn(task: Task, date: Date): boolean {
  if (!task.recurrence) return false;
  const days = getDaysFromNotes(task.notes);
  if (days && days.length > 0) return days.includes(date.getDay());
  return true; // plain daily
}

export function isTaskScheduledToday(task: Task): boolean {
  return isTaskScheduledOn(task, new Date());
}

export function applyRecurrence(task: Task): Task {
  if (!task.recurrence) return task;

  const today = new Date().toISOString().slice(0, 10);
  const days = getDaysFromNotes(task.notes);

  if (days && days.length > 0) {
    const todayDow = new Date().getDay();
    if (!days.includes(todayDow)) return { ...task, completed: false };
    if (!task.completed) return task;
    if (task.last_completed_date && task.last_completed_date >= today) return task;
    return { ...task, completed: false };
  }

  // Plain daily
  if (!task.completed) return task;
  if (task.last_completed_date && task.last_completed_date >= today) return task;
  return { ...task, completed: false };
}

export function applyRecurrenceMany(tasks: Task[]): Task[] {
  return tasks.map(applyRecurrence);
}
