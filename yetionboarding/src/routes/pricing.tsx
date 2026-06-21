import { createFileRoute, redirect } from "@tanstack/react-router";
import { PricingSection } from "@/components/PricingSection";

export const Route = createFileRoute("/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "free", search: { start: "setup" } });
  },
  head: () => ({
    meta: [
      { title: "Yeti Guide — Free forever" },
      {
        name: "description",
        content: "Yeti Guide is free. Set up a voice AI website guide in minutes.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(191,239,255,0.85),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(123,111,230,0.22),transparent_30%),linear-gradient(180deg,#FAFBFF,#F7F8FF)]">
      <PricingSection standalone />
    </main>
  );
}
