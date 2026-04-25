import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, type Area, type Goal, type Task, type Streak } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { applyRecurrenceMany } from "@/lib/recurrence";

export function useAreas() {
  return useQuery({
    queryKey: qk.areas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Area[];
    },
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: qk.streaks,
    queryFn: async () => {
      const { data, error } = await supabase.from("streaks").select("*");
      if (error) throw error;
      return (data ?? []) as Streak[];
    },
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: qk.allTasks,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) throw error;
      return applyRecurrenceMany((data ?? []) as Task[]);
    },
  });
}

export function useGoals(areaId: string | undefined) {
  return useQuery({
    queryKey: areaId ? qk.goals(areaId) : ["goals", "none"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").eq("area_id", areaId!).order("created_at");
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
    enabled: !!areaId,
  });
}

export function useAllGoals() {
  return useQuery({
    queryKey: ["goals", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });
}

export function useTasksForArea(areaId: string | undefined) {
  return useQuery({
    queryKey: areaId ? qk.tasks(areaId) : ["tasks", "none"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("area_id", areaId!).order("created_at", { ascending: true });
      if (error) throw error;
      return applyRecurrenceMany((data ?? []) as Task[]);
    },
    enabled: !!areaId,
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; emoji: string; color: string; description?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("areas")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Area;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.areas });
      qc.invalidateQueries({ queryKey: qk.streaks });
      toast.success("Domain added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Area> & { id: string }) => {
      const { error } = await supabase.from("areas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.areas }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReorderAreas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each area's sort_order based on its index
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("areas").update({ sort_order: idx + 1 }).eq("id", id),
        ),
      );
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: qk.areas });
      const prev = qc.getQueryData<Area[]>(qk.areas);
      if (prev) {
        const map = new Map(prev.map((a) => [a.id, a]));
        const next = orderedIds
          .map((id, idx) => {
            const a = map.get(id);
            return a ? { ...a, sort_order: idx + 1 } : null;
          })
          .filter(Boolean) as Area[];
        qc.setQueryData<Area[]>(qk.areas, next);
      }
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.areas, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.areas }),
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Domain removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { area_id: string; title: string; description?: string; target_date?: string | null; target_count?: number | null; unit?: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("goals").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: qk.goals(g.area_id) });
      qc.invalidateQueries({ queryKey: ["goals", "all"] });
      toast.success("Goal added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, area_id, ...patch }: Partial<Goal> & { id: string; area_id: string }) => {
      const { error } = await supabase.from("goals").update(patch).eq("id", id);
      if (error) throw error;
      return area_id;
    },
    onSuccess: (areaId) => {
      qc.invalidateQueries({ queryKey: qk.goals(areaId) });
      qc.invalidateQueries({ queryKey: ["goals", "all"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; area_id: string }) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.goals(vars.area_id) });
      qc.invalidateQueries({ queryKey: ["goals", "all"] });
      qc.invalidateQueries({ queryKey: qk.tasks(vars.area_id) });
      qc.invalidateQueries({ queryKey: qk.allTasks });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { goal_id?: string | null; area_id: string; title: string; due_date?: string | null; notes?: string; recurrence?: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("tasks").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: qk.tasks(t.area_id) });
      qc.invalidateQueries({ queryKey: qk.allTasks });
      toast.success("Task added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed, area_id }: { id: string; completed: boolean; area_id: string }) => {
      const today = new Date().toISOString().slice(0, 10);
      const patch = {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        ...(completed ? { last_completed_date: today } : {}),
      };
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
      return area_id;
    },
    // Optimistic: snapshot first, update immediately, then cancel in-flight queries
    onMutate: async ({ id, completed, area_id }) => {
      const prevAll = qc.getQueryData<Task[]>(qk.allTasks);
      const prevArea = qc.getQueryData<Task[]>(qk.tasks(area_id));
      const today = new Date().toISOString().slice(0, 10);
      const apply = (t: Task): Task => t.id !== id ? t : {
        ...t,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        ...(completed ? { last_completed_date: today } : {}),
      };
      qc.setQueryData<Task[]>(qk.allTasks, (old) => old?.map(apply));
      qc.setQueryData<Task[]>(qk.tasks(area_id), (old) => old?.map(apply));
      // Cancel after updating so any in-flight refetch doesn't overwrite the optimistic data
      await qc.cancelQueries({ queryKey: qk.allTasks });
      await qc.cancelQueries({ queryKey: qk.tasks(area_id) });
      return { prevAll, prevArea, area_id };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prevAll) qc.setQueryData(qk.allTasks, ctx.prevAll);
      if (ctx?.prevArea && ctx.area_id) qc.setQueryData(qk.tasks(ctx.area_id), ctx.prevArea);
      toast.error(e.message);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: qk.allTasks });
      qc.invalidateQueries({ queryKey: qk.tasks(vars.area_id) });
      qc.invalidateQueries({ queryKey: qk.streaks });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; area_id: string }) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.tasks(vars.area_id) });
      qc.invalidateQueries({ queryKey: qk.allTasks });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      area_id,
      ...patch
    }: { id: string; area_id: string } & Partial<Pick<Task, "title" | "due_date" | "notes" | "goal_id" | "recurrence">>) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
      return area_id;
    },
    onMutate: async ({ id, area_id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.allTasks });
      await qc.cancelQueries({ queryKey: qk.tasks(area_id) });
      const prevAll = qc.getQueryData<Task[]>(qk.allTasks);
      const prevArea = qc.getQueryData<Task[]>(qk.tasks(area_id));
      // Update the task in-place — preserves array position
      const apply = (t: Task): Task => t.id !== id ? t : { ...t, ...patch };
      qc.setQueryData<Task[]>(qk.allTasks, (old) => old?.map(apply));
      qc.setQueryData<Task[]>(qk.tasks(area_id), (old) => old?.map(apply));
      return { prevAll, prevArea, area_id };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prevAll) qc.setQueryData(qk.allTasks, ctx.prevAll);
      if (ctx?.prevArea && ctx.area_id) qc.setQueryData(qk.tasks(ctx.area_id), ctx.prevArea);
      toast.error(e.message);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: qk.tasks(vars.area_id) });
      qc.invalidateQueries({ queryKey: qk.allTasks });
    },
  });
}
