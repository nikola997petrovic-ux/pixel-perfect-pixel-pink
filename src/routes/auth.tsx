import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome. Your ledger awaits.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper text-ink flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl tracking-tight">Monograph.</h1>
          <p className="text-xs text-ink-muted mt-2 tracking-widest uppercase">A Ledger of Personal Progress</p>
        </div>

        <div className="bg-paper-light border border-ruling p-8">
          <h2 className="font-serif text-xl mb-1">{mode === "login" ? "Continue your work" : "Begin a new volume"}</h2>
          <p className="text-sm text-ink-muted mb-6">
            {mode === "login" ? "Sign in to your ledger." : "Create a private space to track your progress."}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-ink-muted">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-paper border-ruling focus-visible:ring-ink"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-ink-muted">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-paper border-ruling focus-visible:ring-ink"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={busy} className="bg-ink text-paper hover:bg-ink/90 mt-2">
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-xs text-ink-muted hover:text-ink mt-6 w-full text-center transition-colors"
          >
            {mode === "login" ? "No account yet? Begin a new volume." : "Already have a ledger? Sign in."}
          </button>
        </div>
      </div>
    </div>
  );
}
