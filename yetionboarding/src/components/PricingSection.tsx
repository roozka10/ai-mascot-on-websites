import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

type PricingSectionProps = {
  onStart?: () => void;
  standalone?: boolean;
};

const plans = [
  {
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

export function PricingSection({ onStart, standalone = false }: PricingSectionProps) {
  const [websites, setWebsites] = useState(3);
  const [questions, setQuestions] = useState(1000);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const recommendedPlan = useMemo(() => {
    return plans.find((plan) => websites <= plan.websites && questions <= plan.questions) ?? plans[plans.length - 1];
  }, [questions, websites]);

  const yearlyPrice = (price: number) => Math.round((price * 10) / 12);

  return (
    <section id="pricing" className={standalone ? "px-5 py-16 sm:py-20" : "mx-auto w-full max-w-6xl px-5 py-16"}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Simple pricing
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-[-0.05em] text-foreground sm:text-5xl">
            Pick by websites and questions, not confusing chatbot seats.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Start cheap, cover a few sites, and upgrade only when Yeti is actually getting used.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-[oklch(0.18_0.02_270)] p-5 text-white shadow-[0_30px_90px_-52px_rgba(15,23,42,0.9)] md:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/55">How many websites?</span>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={websites}
                    onChange={(event) => setWebsites(Number(event.target.value))}
                    className="h-2 w-full accent-[#7B6FE6]"
                  />
                  <span className="min-w-12 rounded-full bg-white px-3 py-1 text-center text-sm font-black text-[#0b0f1a]">
                    {websites}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Monthly AI questions?</span>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="25000"
                    step="100"
                    value={questions}
                    onChange={(event) => setQuestions(Number(event.target.value))}
                    className="h-2 w-full accent-[#7B6FE6]"
                  />
                  <span className="min-w-20 rounded-full bg-white px-3 py-1 text-center text-sm font-black text-[#0b0f1a]">
                    {formatNumber(questions)}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-white/10 p-1">
                {(["monthly", "yearly"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBilling(value)}
                    className={`rounded-full px-4 py-2 text-xs font-black capitalize transition ${
                      billing === value ? "bg-white text-[#0b0f1a]" : "text-white/65 hover:text-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-secondary">Yearly saves 2 months</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white/72">
            Recommended:{" "}
            <span className="font-black text-white">{recommendedPlan.name}</span>
            {" "}for {websites} website{websites === 1 ? "" : "s"} and {formatNumber(questions)} questions/month.
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isRecommended = plan.name === recommendedPlan.name;
            const displayPrice = billing === "yearly" ? yearlyPrice(plan.price) : plan.price;
            return (
              <article
                key={plan.name}
                className={`relative rounded-[2rem] border p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] ${
                  isRecommended
                    ? "border-primary bg-[linear-gradient(180deg,#ffffff,#f6f4ff)] ring-4 ring-primary/15"
                    : "border-border/70 bg-white/82"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground">
                    Recommended
                  </div>
                )}
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{plan.name}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-5xl font-black tracking-[-0.08em] text-foreground">${displayPrice}</span>
                  <span className="pb-2 text-sm font-bold text-muted-foreground">/month</span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm font-bold text-foreground">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {feature}
                    </div>
                  ))}
                </div>
                {onStart ? (
                  <button
                    type="button"
                    onClick={onStart}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
                  >
                    Start 7-day free trial
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <a
                    href="/"
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
                  >
                    Start 7-day free trial
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">$0 due today. No card required.</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
