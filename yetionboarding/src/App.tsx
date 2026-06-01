import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";

import Onboarding from "@/components/Onboarding";
import { PricingSection } from "@/components/PricingSection";
import { FeatureRequestButton } from "@/components/FeatureRequestButton";
import mainMascot from "@/assets/mainmascot.png";

const queryClient = new QueryClient();

function MobileDesktopOnlyBlocker() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_20%_12%,rgba(191,239,255,0.9),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(123,111,230,0.28),transparent_32%),linear-gradient(180deg,#FAFBFF,#F7F8FF)] px-5 py-8 md:hidden">
      <section className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/95 p-6 text-center shadow-[0_28px_80px_-42px_rgba(15,23,42,0.6)] backdrop-blur">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 shadow-inner">
          <img src={mainMascot} alt="Yeti Guide" className="h-16 w-16 object-contain drop-shadow-lg" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
          Tiny screen detected
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.06em] text-foreground">
          Yeti needs a bigger cave.
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-6 text-muted-foreground">
          Our app only works on desktop right now. Please open Yeti Guide on your computer to set up, manage, or edit your mascot.
        </p>
        <div className="mt-5 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-black text-primary">
          Go to your desktop. Yeti will wait.
        </div>
      </section>
    </main>
  );
}

function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(191,239,255,0.85),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(123,111,230,0.22),transparent_30%),linear-gradient(180deg,#FAFBFF,#F7F8FF)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <a href="/?start=setup" className="flex items-center gap-2 text-sm font-black text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
            <img src={mainMascot} alt="" className="h-7 w-7 object-contain" />
          </span>
          Yeti Guide
        </a>
        <a href="/?start=setup" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background">
          Setup home
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
      <MobileDesktopOnlyBlocker />
      <div className="hidden md:block">
        {path.startsWith("/pricing") ? <PricingPage /> : <Onboarding />}
        <FeatureRequestButton />
      </div>
      <Analytics />
    </QueryClientProvider>
  );
}
