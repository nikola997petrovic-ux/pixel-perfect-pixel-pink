import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AREA_COLORS, COMMON_EMOJI } from "@/lib/area-colors";
import { useCreateArea } from "@/lib/api";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  emoji: z.string().min(1).max(8),
  color: z.string(),
  description: z.string().max(300).optional(),
});

export function NewAreaDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(COMMON_EMOJI[0]);
  const [color, setColor] = useState(AREA_COLORS[0].value);
  const [description, setDescription] = useState("");
  const create = useCreateArea();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, emoji, color, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    await create.mutateAsync(parsed.data);
    setOpen(false);
    setName(""); setDescription(""); setEmoji(COMMON_EMOJI[0]); setColor(AREA_COLORS[0].value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-ink text-paper hover:bg-ink/90"><Plus className="size-4 mr-1.5" />New Domain</Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-paper border-ruling">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">A new domain</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Photoredox Research" maxLength={60} className="bg-paper-light border-ruling" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Symbol</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_EMOJI.map((e) => (
                <button
                  type="button" key={e}
                  onClick={() => setEmoji(e)}
                  className={`size-9 text-lg flex items-center justify-center border ${emoji === e ? "border-ink bg-paper-light" : "border-ruling"} rounded`}
                >{e}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Accent</Label>
            <div className="flex flex-wrap gap-2">
              {AREA_COLORS.map((c) => (
                <button
                  type="button" key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`size-8 rounded-full border-2 transition-transform ${color === c.value ? "border-ink scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-widest text-ink-muted">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="bg-paper-light border-ruling" rows={2} />
          </div>
          <Button type="submit" disabled={create.isPending} className="bg-ink text-paper hover:bg-ink/90">
            {create.isPending ? "…" : "Add domain"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
