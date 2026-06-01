import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type PricingSectionProps = {
  standalone?: boolean;
  onLogin?: () => void;
};

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 9,
    websites: 3,
    questions: 1000,
    description: "For small businesses that want a clean voice guide on a few sites.",
    features: [
      "3 websites included",
      "1,000 AI questions/month",
      "Website scan",
      "Custom Yeti personality",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 19,
    websites: 10,
    questions: 5000,
    description: "For growing sites that want more room and a cleaner customer experience.",
    features: [
      "10 websites included",
      "5,000 AI questions/month",
      "Better analytics",
      "Priority retraining",
    ],
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 49,
    websites: 50,
    questions: 25000,
    description: "For freelancers and agencies adding Yeti to client websites.",
    features: [
      "50 websites included",
      "25,000 AI questions/month",
      "Client-friendly setup",
      "Priority support",
      "Agency dashboard later",
    ],
  },
];

export function PricingSection({ standalone = false, onLogin }: PricingSectionProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  async function startCheckout(planId: string) {
    setCheckoutError("");
    setLoadingPlan(planId);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billing: "monthly" }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Could not start Stripe checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start Stripe checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section id="pricing" className={standalone ? "px-4 py-10 sm:py-12" : "mx-auto w-full max-w-5xl px-4 py-12"}>
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Simple pricing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">
            Pricing that does not punish small websites.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Start with a 3-day trial, bring your card, and only pay when Yeti is ready to work.
          </p>
        </div>

        {checkoutError && (
          <div className="mx-auto mb-4 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
            {checkoutError}
          </div>
        )}

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isRecommended = Boolean(plan.featured);
            return (
              <article
                key={plan.name}
                className={`relative rounded-[1.5rem] border p-5 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)] ${
                  isRecommended
                    ? "border-primary bg-[linear-gradient(180deg,#ffffff,#f6f4ff)] ring-4 ring-primary/15"
                    : "border-border/70 bg-white/82"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary-foreground">
                    Recommended
                  </div>
                )}
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{plan.name}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-black tracking-[-0.08em] text-foreground">${plan.price}</span>
                  <span className="pb-1.5 text-xs font-bold text-muted-foreground">/month</span>
                </div>
                <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">{plan.description}</p>
                <div className="mt-4 space-y-2.5">
                  {plan.features.map((feature) => (
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
                    if (!standalone && onLogin) {
                      onLogin();
                      return;
                    }
                    startCheckout(plan.id);
                  }}
                  disabled={standalone && loadingPlan !== null}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
                >
                  {!standalone && onLogin
                    ? "Log in to choose this plan"
                    : loadingPlan === plan.id
                      ? "Opening Stripe..."
                      : "Start 3-day free trial"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <p className="mt-2.5 text-center text-[11px] font-semibold text-muted-foreground">
                  $0 today. Card required for auto-renewal after 3 days.
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
