import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Onboarding from "@/components/Onboarding";
import { PricingSection } from "@/components/PricingSection";

const queryClient = new QueryClient();

function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(191,239,255,0.85),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(123,111,230,0.22),transparent_30%),linear-gradient(180deg,#FAFBFF,#F7F8FF)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <a href="/" className="flex items-center gap-2 text-sm font-black text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">Y</span>
          Yeti Guide
        </a>
        <a href="/" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background">
          Back home
        </a>
      </div>
      <PricingSection standalone />
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;

  return (
    <QueryClientProvider client={queryClient}>
      {path.startsWith("/pricing") ? <PricingPage /> : <Onboarding />}
    </QueryClientProvider>
  );
}
