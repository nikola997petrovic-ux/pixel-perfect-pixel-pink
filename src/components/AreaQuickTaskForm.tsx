import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCreateTask } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AreaQuickTaskForm({ areaId }: { areaId: string }) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) return;
    if (trimmedTitle.length > 200) {
      toast.error("Title too long");
      return;
    }

    await createTask.mutateAsync({
      area_id: areaId,
      goal_id: null,
      title: trimmedTitle,
      due_date: null,
    });

    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-ruling/60 border-dashed">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task to this domain…"
        maxLength={200}
        className="bg-paper border-ruling flex-1"
      />
      <Button type="submit" variant="outline" className="border-ruling text-ink hover:bg-paper" disabled={createTask.isPending}>
        <Plus className="size-3.5" />
        Add task
      </Button>
    </form>
  );
}