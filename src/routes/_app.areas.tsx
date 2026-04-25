import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAreas, useAllTasks, useAllGoals, useStreaks, useDeleteArea, useReorderAreas } from "@/lib/api";
import { AreaQuickTaskForm } from "@/components/AreaQuickTaskForm";
import { GoalRowEditable } from "@/components/GoalRowEditable";
import { NewAreaDialog } from "@/components/NewAreaDialog";
import { EditAreaDialog } from "@/components/EditAreaDialog";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { Area, Goal } from "@/lib/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_app/areas")({
  component: AreasLayout,
  head: () => ({ meta: [{ title: "Domains — Monograph" }] }),
});

function AreasLayout() {
  const { pathname } = useLocation();
  if (pathname !== "/areas") return <Outlet />;
  return <AreasPage />;
}

function AreasPage() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: tasks = [] } = useAllTasks();
  const { data: goals = [] } = useAllGoals();
  const { data: streaks = [] } = useStreaks();
  const del = useDeleteArea();
  const reorder = useReorderAreas();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = areas.map((a) => a.id);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    reorder.mutate(arrayMove(ids, oldIdx, newIdx));
  };

  const stats = (id: string) => {
    const ts = tasks.filter((t) => t.area_id === id);
    const done = ts.filter((t) => t.completed).length;
    return { total: ts.length, done, pct: ts.length === 0 ? 0 : Math.round((done / ts.length) * 100) };
  };
  const streakOf = (id: string) => streaks.find((s) => s.area_id === id);
  const goalsFor = (id: string) => goals.filter((g) => g.area_id === id);

  return (
    <div className="py-10 md:py-12 px-6 md:px-16 lg:px-24 flex flex-col gap-10 max-w-[1200px]">
      <header className="flex flex-col gap-3 max-w-[65ch]">
        <p className="text-xs text-ink-muted tracking-widest uppercase">All Domains</p>
        <h2 className="text-3xl md:text-4xl leading-tight font-serif">The constellation of areas you tend to.</h2>
      </header>

      <div className="flex justify-between items-center border-b border-ruling pb-3">
        <span className="text-xs text-ink-muted uppercase tracking-widest tabular-nums">{areas.length} entries</span>
        <NewAreaDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Opening the ledger…</p>
      ) : areas.length === 0 ? (
        <div className="border border-dashed border-ruling p-10 text-center">
          <p className="font-serif text-lg mb-2">A clean page</p>
          <p className="text-sm text-ink-muted mb-5">Add your first domain to begin.</p>
          <NewAreaDialog />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {areas.map((a) => (
                <SortableAreaCard
                  key={a.id}
                  area={a}
                  stats={stats(a.id)}
                  streak={streakOf(a.id)}
                  goals={goalsFor(a.id)}
                  onDelete={() => del.mutate(a.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableAreaCard({
  area,
  stats,
  streak,
  goals,
  onDelete,
}: {
  area: Area;
  stats: { total: number; done: number; pct: number };
  streak: { current_streak: number } | undefined;
  goals: Goal[];
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: area.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="bg-paper-light border border-ruling p-6 relative flex flex-col gap-5">
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: area.color }} />
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            onClick={(e) => e.preventDefault()}
            className="-ml-1 mt-0.5 flex items-center gap-1.5 px-2.5 py-2 bg-paper border border-ruling text-ink cursor-grab active:cursor-grabbing touch-none shrink-0 md:px-2 md:py-1.5 md:text-ink-muted"
          >
            <GripVertical className="size-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest md:hidden">Move</span>
          </button>
          <Link to="/areas/$areaId" params={{ areaId: area.id }} className="flex-1 min-w-0">
            <span className="text-[10px] tracking-widest uppercase" style={{ color: area.color }}>{area.emoji} {area.name}</span>
            <h4 className="font-serif text-xl mt-1 truncate">{area.description || "Untitled chapter"}</h4>
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <EditAreaDialog area={area} trigger={<Button variant="outline" size="sm" className="border-ruling text-ink hover:bg-paper">Edit</Button>} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-ink-muted hover:text-overdue"><Trash2 className="size-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-paper border-ruling">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-serif">Remove this domain?</AlertDialogTitle>
                <AlertDialogDescription>This will also remove all goals and tasks within it. The action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-overdue text-paper hover:bg-overdue/90">Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex justify-between text-xs text-ink-muted tabular-nums">
        <span>{stats.total === 0 ? "No tasks yet" : `${stats.pct}% · ${stats.done}/${stats.total} tasks`}</span>
        <span>{streak?.current_streak ? `${streak.current_streak} ✦` : "—"}</span>
      </div>
      <div className="w-full h-[2px] bg-ruling overflow-hidden">
        <div className="h-full" style={{ width: `${stats.pct}%`, backgroundColor: area.color }} />
      </div>
      {goals.length > 0 && (
        <div className="flex flex-col pt-1 border-t border-ruling/60 border-dashed">
          <p className="text-[10px] uppercase tracking-widest text-ink-muted mb-1">Goals</p>
          {goals.map((g) => <GoalRowEditable key={g.id} goal={g} />)}
        </div>
      )}
      <AreaQuickTaskForm areaId={area.id} accent={area.color} />
    </div>
  );
}

