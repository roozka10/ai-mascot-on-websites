import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

type PricingSectionProps = {
  standalone?: boolean;
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
      "Yeti branding",
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
      "Remove Yeti branding",
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function PricingSection({ standalone = false }: PricingSectionProps) {
  const [websites, setWebsites] = useState(3);
  const [questions, setQuestions] = useState(1000);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const recommendedPlan = useMemo(() => {
    return plans.find((plan) => websites <= plan.websites && questions <= plan.questions) ?? plans[plans.length - 1];
  }, [questions, websites]);

  const yearlyPrice = (price: number) => Math.round((price * 10) / 12);

  async function startCheckout(planId: string) {
    setCheckoutError("");
    setLoadingPlan(planId);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billing }),
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
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" />
            Simple pricing
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">
            Pick by websites and questions, not confusing chatbot seats.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Start cheap, cover a few sites, and upgrade only when Yeti is actually getting used.
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-4xl rounded-[1.5rem] border border-white/10 bg-[oklch(0.18_0.02_270)] p-4 text-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.9)] md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">How many websites?</span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={websites}
                    onChange={(event) => setWebsites(Number(event.target.value))}
                    className="h-1.5 w-full accent-[#7B6FE6]"
                  />
                  <span className="min-w-10 rounded-full bg-white px-2.5 py-1 text-center text-xs font-black text-[#0b0f1a]">
                    {websites}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Monthly AI questions?</span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="100"
                    max="25000"
                    step="100"
                    value={questions}
                    onChange={(event) => setQuestions(Number(event.target.value))}
                    className="h-1.5 w-full accent-[#7B6FE6]"
                  />
                  <span className="min-w-16 rounded-full bg-white px-2.5 py-1 text-center text-xs font-black text-[#0b0f1a]">
                    {formatNumber(questions)}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-white/10 p-1">
                {(["monthly", "yearly"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBilling(value)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black capitalize transition ${
                      billing === value ? "bg-white text-[#0b0f1a]" : "text-white/65 hover:text-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-bold text-secondary">Yearly saves 2 months</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-xs text-white/72">
            Recommended:{" "}
            <span className="font-black text-white">{recommendedPlan.name}</span>
            {" "}for {websites} website{websites === 1 ? "" : "s"} and {formatNumber(questions)} questions/month.
          </div>
          {checkoutError && (
            <div className="mt-3 rounded-2xl border border-red-300/30 bg-red-500/12 px-4 py-3 text-sm font-bold text-red-100">
              {checkoutError}
            </div>
          )}
        </div>

        <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isRecommended = plan.name === recommendedPlan.name;
            const displayPrice = billing === "yearly" ? yearlyPrice(plan.price) : plan.price;
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
                  <span className="text-4xl font-black tracking-[-0.08em] text-foreground">${displayPrice}</span>
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
                  onClick={() => startCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
                >
                  {loadingPlan === plan.id ? "Opening Stripe..." : "Start 7-day free trial"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <p className="mt-2.5 text-center text-[11px] font-semibold text-muted-foreground">
                  $0 today. Card required for auto-renewal after trial.
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
