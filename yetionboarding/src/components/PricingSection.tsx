import { ArrowRight, Check, Sparkles } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";

type PricingSectionProps = {
  standalone?: boolean;
  onLogin?: () => void;
};

const freeFeatures = [
  "10 websites included",
  "5,000 AI answers per month",
  "Deep website scan",
  "Custom Yeti personality",
  "No credit card required",
  "Free forever",
];

export function PricingSection({ standalone = false, onLogin }: PricingSectionProps) {
  return (
    <section id="free" className={standalone ? "px-4 py-10 sm:py-12" : "mx-auto w-full max-w-5xl px-4 py-12"}>
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Free forever
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">
            Yeti is free. Set up in minutes.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Sign in with Google, paste your website, and launch a talking guide. No trials, no billing, no card on file.
          </p>
        </div>

        <article className="relative mx-auto max-w-lg rounded-[1.5rem] border border-primary bg-[linear-gradient(180deg,#ffffff,#f6f4ff)] p-6 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] ring-4 ring-primary/15">
          <div className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary-foreground">
            Everyone gets this
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Free plan</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-black tracking-[-0.08em] text-foreground">$0</span>
            <span className="pb-1.5 text-xs font-bold text-muted-foreground">forever</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Generous limits for real businesses. Upgrade paths removed — we keep Yeti free and supported by light ads on this site.
          </p>
          <div className="mt-4 space-y-2.5">
            {freeFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-xs font-bold text-foreground">
                <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {feature}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (onLogin) {
                onLogin();
                return;
              }
              window.location.href = "/?start=setup";
            }}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground transition hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {onLogin ? "Start free setup" : "Go to setup"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <AdBanner className="mx-auto mt-8 max-w-lg" />
      </div>
    </section>
  );
}
