import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/DashboardView";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardView,
  head: () => ({ meta: [{ title: "Dashboard — Monograph" }] }),
});
