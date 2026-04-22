import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Calendar as CalendarIcon, FolderOpen, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, page: "Pg. 1" },
  { to: "/calendar", label: "Chronology", icon: CalendarIcon, page: "Pg. 12" },
  { to: "/areas", label: "Domains", icon: FolderOpen, page: "Pg. 48" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const isActive = (to: string) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-ruling px-5 py-4 bg-paper sticky top-0 z-30">
        <Link to="/" className="flex flex-col">
          <span className="font-serif text-xl tracking-tight">Monograph.</span>
          <span className="text-[10px] text-ink-muted tracking-widest uppercase mt-0.5">Vol. IV</span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="size-10 -mr-2 flex items-center justify-center text-ink"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 pt-[65px] bg-paper border-b border-ruling">
          <nav className="flex flex-col gap-1 px-6 py-6">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between py-3 border-b border-ruling/60 ${isActive(n.to) ? "text-ink" : "text-ink-muted"}`}
              >
                <span className="flex items-center gap-3">
                  <n.icon className="size-4" />
                  <span className="text-base">{n.label}</span>
                </span>
                <span className="text-xs text-ink-muted">{n.page}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="mt-6 flex items-center gap-3 py-3 text-sm text-ink-muted"
            >
              <LogOut className="size-4" /> Sign out
            </button>
            {user?.email && <p className="mt-2 text-xs text-ink-muted">{user.email}</p>}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-ruling flex-col justify-between py-12 px-8 shrink-0 sticky top-0 h-dvh">
        <div className="flex flex-col gap-16">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">Monograph.</h1>
            <p className="text-xs text-ink-muted mt-2 tracking-wide uppercase">Vol. IV — 2026</p>
          </div>
          <nav className="flex flex-col gap-6">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-muted border-b border-ruling pb-2 mb-2">
              Index
            </p>
            {NAV.map((n) => {
              const active = isActive(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`text-sm flex items-center justify-between group transition-colors ${active ? "text-ink" : "text-ink-muted hover:text-ink"}`}
                >
                  <span>{n.label}</span>
                  <span className={`text-xs text-ink-muted ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                    {n.page}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="text-xs text-ink-muted leading-relaxed">
          <p>Compiled by</p>
          <p className="text-ink truncate">{user?.email ?? "—"}</p>
          <button onClick={handleLogout} className="mt-3 text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors">
            <LogOut className="size-3" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
