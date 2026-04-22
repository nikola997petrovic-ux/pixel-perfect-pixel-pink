// Re-export of supabase client + shared query key helpers
export type Area = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  area_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: "active" | "completed" | "paused";
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  goal_id: string | null;
  area_id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  recurrence: "daily" | null;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Streak = {
  id: string;
  user_id: string;
  area_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

export const qk = {
  areas: ["areas"] as const,
  area: (id: string) => ["area", id] as const,
  goals: (areaId: string) => ["goals", areaId] as const,
  tasks: (areaId?: string) => (areaId ? (["tasks", areaId] as const) : (["tasks"] as const)),
  allTasks: ["tasks", "all"] as const,
  streaks: ["streaks"] as const,
};
