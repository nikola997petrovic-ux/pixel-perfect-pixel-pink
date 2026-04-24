import { createFileRoute, Link } from "@tanstack/react-router";
import { useAreas, useAllTasks, useStreaks, useDeleteArea, useReorderAreas } from "@/lib/api";
import { AreaQuickTaskForm } from "@/components/AreaQuickTaskForm";
import { NewAreaDialog } from "@/components/NewAreaDialog";
import { EditAreaDialog } from "@/components/EditAreaDialog";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { Area } from "@/lib/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_app/areas")({
  component: AreasPage,
  head: () => ({ meta: [{ title: "Domains — Monograph" }] }),
});

function AreasPage() {
  const { data: areas = [], isLoading } = useAreas();
  const { data: tasks = [] } = useAllTasks();
  const { data: streaks = [] } = useStreaks();
  const del = useDeleteArea();

  const stats = (id: string) => {
    const ts = tasks.filter((t) => t.area_id === id);
    const done = ts.filter((t) => t.completed).length;
    return { total: ts.length, done, pct: ts.length === 0 ? 0 : Math.round((done / ts.length) * 100) };
  };
  const streakOf = (id: string) => streaks.find((s) => s.area_id === id);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {areas.map((a) => {
            const s = stats(a.id);
            const st = streakOf(a.id);
            return (
              <div key={a.id} className="bg-paper-light border border-ruling p-6 relative flex flex-col gap-5">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: a.color }} />
                <div className="flex justify-between items-start gap-3">
                  <Link to="/areas/$areaId" params={{ areaId: a.id }} className="flex-1 min-w-0">
                    <span className="text-[10px] tracking-widest uppercase" style={{ color: a.color }}>{a.emoji} {a.name}</span>
                    <h4 className="font-serif text-xl mt-1 truncate">{a.description || "Untitled chapter"}</h4>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <EditAreaDialog area={a} trigger={<Button variant="outline" size="sm" className="border-ruling text-ink hover:bg-paper">Edit</Button>} />
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
                          <AlertDialogAction onClick={() => del.mutate(a.id)} className="bg-overdue text-paper hover:bg-overdue/90">Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-ink-muted tabular-nums">
                  <span>{s.total === 0 ? "No tasks yet" : `${s.pct}% · ${s.done}/${s.total} tasks`}</span>
                  <span>{st?.current_streak ? `${st.current_streak} ✦` : "—"}</span>
                </div>
                <div className="w-full h-[2px] bg-ruling overflow-hidden">
                  <div className="h-full" style={{ width: `${s.pct}%`, backgroundColor: a.color }} />
                </div>
                <AreaQuickTaskForm areaId={a.id} accent={a.color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
