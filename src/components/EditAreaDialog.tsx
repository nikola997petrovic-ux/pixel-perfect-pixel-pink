import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AREA_COLORS, COMMON_EMOJI } from "@/lib/area-colors";
import { useUpdateArea } from "@/lib/api";
import type { Area } from "@/lib/types";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  emoji: z.string().min(1).max(8),
  color: z.string(),
  description: z.string().max(300).optional(),
});

export function EditAreaDialog({ area, trigger }: { area: Area; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(area.name);
  const [emoji, setEmoji] = useState(area.emoji);
  const [color, setColor] = useState(area.color);
  const [description, setDescription] = useState(area.description ?? "");
  const update = useUpdateArea();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, emoji, color, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    await update.mutateAsync({ id: area.id, ...parsed.data });
    toast.success("Domain updated");
    setOpen(false);
  };

  const colorChoices = AREA_COLORS.some((c) => c.value === area.color)
    ? AREA_COLORS
    : [{ name: "Current", value: area.color }, ...AREA_COLORS];
  const emojiChoices = COMMON_EMOJI.includes(area.emoji) ? COMMON_EMOJI : [area.emoji, ...COMMON_EMOJI];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="border-ruling text-ink hover:bg-paper-light">
            <Pencil className="size-3.5 mr-1.5" /> Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-paper border-ruling">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit domain</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="bg-paper-light border-ruling" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Symbol</Label>
            <div className="flex flex-wrap gap-2">
              {emojiChoices.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`size-9 text-lg flex items-center justify-center border ${emoji === e ? "border-ink bg-paper-light" : "border-ruling"} rounded`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Accent</Label>
            <div className="flex flex-wrap gap-2">
              {colorChoices.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`size-8 rounded-full border-2 transition-transform ${color === c.value ? "border-ink scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="bg-paper-light border-ruling" rows={2} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button type="button" variant="outline" className="border-ruling text-ink hover:bg-paper-light" asChild>
              <Link to="/areas/$areaId" params={{ areaId: area.id }} onClick={() => setOpen(false)}>
                Add tasks
              </Link>
            </Button>
            <Button type="submit" disabled={update.isPending} className="bg-ink text-paper hover:bg-ink/90">
              {update.isPending ? "…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
