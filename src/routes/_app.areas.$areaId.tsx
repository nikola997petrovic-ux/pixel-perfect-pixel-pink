import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAreas, useGoals, useTasksForArea, useStreaks,
  useCreateGoal, useDeleteGoal, useCreateTask, useToggleTask, useDeleteTask,
} from "@/lib/api";
import type { Goal, Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EditAreaDialog } from "@/components/EditAreaDialog";

export const Route = createFileRoute("/_app/areas/$areaId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("areas").select("*").eq("id", params.areaId).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { area: data };
  },
  component: AreaDetail,
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.area.name ?? "Domain"} — Monograph` }] }),
});

function AreaDetail() {
  const { areaId } = Route.useParams();
  const { area } = Route.useLoaderData();
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals(areaId);
  const { data: tasks = [] } = useTasksForArea(areaId);
  const { data: streaks = [] } = useStreaks();

  // Use the freshest version of the area (in case it was updated)
  const a = areas.find((x) => x.id === areaId) ?? area;
  const streak = streaks.find((s) => s.area_id === areaId);

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="py-10 md:py-12 px-6 md:px-16 lg:px-24 flex flex-col gap-10 max-w-[1100px]">
      <Link to="/areas" className="text-xs text-ink-muted hover:text-ink uppercase tracking-widest flex items-center gap-1 -mb-4">
        <ChevronLeft className="size-3" /> Domains
      </Link>

      <header className="flex flex-col gap-4 max-w-[65ch]">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs tracking-widest uppercase" style={{ color: a.color }}>{a.emoji} {a.name}</p>
          <EditAreaDialog area={a} />
        </div>
        <h2 className="text-3xl md:text-4xl leading-tight font-serif">{a.description || "An ongoing chapter."}</h2>
        <div className="flex gap-8 text-sm text-ink-muted pt-2">
          <span><span className="text-ink tabular-nums">{pct}%</span> capacity</span>
          <span><span className="text-ink tabular-nums">{done}/{total}</span> entries</span>
          <span>Streak <span className="text-ink tabular-nums">{streak?.current_streak ?? 0} ✦</span></span>
        </div>
        <div className="w-full h-[2px] bg-ruling overflow-hidden mt-2">
          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: a.color }} />
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <header className="flex items-baseline justify-between border-b border-ruling pb-3">
          <h3 className="text-xl font-serif">Tasks</h3>
          <span className="text-xs text-ink-muted uppercase tracking-widest">In this domain</span>
        </header>
        <TaskListInline tasks={tasks.filter((t) => !t.goal_id)} accent={a.color} />
        <NewTaskInline areaId={areaId} goalId={null} placeholder="A task in this domain…" />
      </section>

      <section className="flex flex-col gap-6">
        <header className="flex items-baseline justify-between border-b border-ruling pb-3">
          <h3 className="text-xl font-serif">Goals</h3>
          <NewGoalDialog areaId={areaId} />
        </header>
        {goals.length === 0 ? (
          <div className="border border-dashed border-ruling p-8 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-ink-muted max-w-[42ch]">Goals are optional sub-groups with a target date. Use them to bundle related tasks.</p>
            <NewGoalDialog areaId={areaId} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} tasks={tasks.filter((t) => t.goal_id === g.id)} accent={a.color} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GoalCard({ goal, tasks, accent }: { goal: Goal; tasks: Task[]; accent: string }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const del = useDeleteGoal();

  return (
    <div className="bg-paper-light border border-ruling p-5 md:p-6 flex flex-col gap-5">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-lg md:text-xl">{goal.title}</h4>
          {goal.description && <p className="text-sm text-ink-muted mt-1">{goal.description}</p>}
          {goal.target_date && (
            <p className="text-xs text-ink-muted mt-2 uppercase tracking-widest">
              Target · {format(parseISO(goal.target_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-8 text-ink-muted hover:text-overdue" onClick={() => del.mutate({ id: goal.id, area_id: goal.area_id })}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-ink-muted tabular-nums">
          <span>{pct}%</span>
          <span>{done}/{total}</span>
        </div>
        <div className="w-full h-[1.5px] bg-ruling overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
        </div>
      </div>

      <TaskListInline tasks={tasks} accent={accent} />

      <NewTaskInline goalId={goal.id} areaId={goal.area_id} />
    </div>
  );
}

function TaskListInline({ tasks, accent }: { tasks: Task[]; accent: string }) {
  const toggle = useToggleTask();
  const del = useDeleteTask();
  if (tasks.length === 0) return null;
  return (
    <div className="flex flex-col">
      {tasks.map((t) => {
        const due = t.due_date ? parseISO(t.due_date) : null;
        const overdue = due && !t.completed && isPast(due) && !isToday(due);
        return (
          <div key={t.id} className="group flex items-center gap-3 py-2.5 border-b border-ruling/60 border-dashed last:border-0">
            <Checkbox
              checked={t.completed}
              onCheckedChange={(c) => toggle.mutate({ id: t.id, area_id: t.area_id, completed: !!c })}
              className="size-4 border-ink-muted data-[state=checked]:bg-ink data-[state=checked]:border-ink"
              style={{ accentColor: accent }}
            />
            <span className={`text-sm flex-1 truncate ${t.completed ? "line-through text-ink-muted" : "text-ink"}`}>{t.title}</span>
            <span className={`text-xs tabular-nums ${overdue ? "text-overdue" : "text-ink-muted"}`}>
              {due ? (isToday(due) ? "Today" : format(due, "MMM d")) : "—"}
            </span>
            <button
              onClick={() => del.mutate({ id: t.id, area_id: t.area_id })}
              className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-overdue transition-opacity"
              aria-label="Delete task"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NewTaskInline({ goalId, areaId, placeholder = "A task…" }: { goalId: string | null; areaId: string; placeholder?: string }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const create = useCreateTask();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (t.length > 200) { toast.error("Title too long"); return; }
    await create.mutateAsync({ goal_id: goalId, area_id: areaId, title: t, due_date: due || null });
    setTitle(""); setDue("");
  };
  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-ruling/60 border-dashed">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} maxLength={200} className="bg-paper border-ruling flex-1" />
      <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-paper border-ruling sm:w-44" />
      <Button type="submit" variant="outline" className="border-ruling text-ink hover:bg-paper">
        <Plus className="size-3.5 mr-1" /> Add task
      </Button>
    </form>
  );
}

const goalSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  target_date: z.string().optional(),
});

function NewGoalDialog({ areaId }: { areaId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const create = useCreateGoal();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = goalSchema.safeParse({ title, description, target_date: target });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    await create.mutateAsync({ area_id: areaId, title: parsed.data.title, description: parsed.data.description, target_date: target || null });
    setOpen(false); setTitle(""); setDescription(""); setTarget("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-ink text-paper hover:bg-ink/90"><Plus className="size-3.5 mr-1" />New Goal</Button>
      </DialogTrigger>
      <DialogContent className="bg-paper border-ruling">
        <DialogHeader><DialogTitle className="font-serif text-2xl">A new goal</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="bg-paper-light border-ruling" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} className="bg-paper-light border-ruling" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Target date</Label>
            <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="bg-paper-light border-ruling" />
          </div>
          <Button type="submit" disabled={create.isPending} className="bg-ink text-paper hover:bg-ink/90">Add goal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
