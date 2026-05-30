import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroWidget } from "@/components/HeroWidget";
import { useReveal } from "@/hooks/use-reveal";
import yeti from "@/assets/yeti-mascot.png";
import {
  ArrowRight,
  BotOff,
  Check,
  Code2,
  Keyboard,
  MessageSquareText,
  Mic,
  ScanSearch,
  Smile,
  Volume2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yeti Guide — A voice-first website guide, not a chatbot" },
      {
        name: "description",
        content:
          "Yeti listens, speaks, and knows your website. Voice-first answers in seconds — no forms, no typing, no chatbot essays.",
      },
      { property: "og:title", content: "Yeti Guide — Not a chatbot. A guide." },
      {
        property: "og:description",
        content:
          "Voice-first AI mascot that actually helps your visitors. One script tag. Learns your site. Talks like a human.",
      },
    ],
  }),
  component: Index,
});

const problems = [
  {
    Icon: MessageSquareText,
    title: "Interview Before Answers",
    body: "You just want to know the return policy. They need your name, email, and the reason for your visit first.",
  },
  {
    Icon: BotOff,
    title: "Nobody Asked for an Essay",
    body: "You asked one question. It responded with six paragraphs, three bullet points, and a disclaimer.",
  },
  {
    Icon: Smile,
    title: "Corner Haunter",
    body: "It hides in the bottom-right corner of every page waiting to jump out and ask if you need help. You always say no.",
  },
  {
    Icon: Keyboard,
    title: "Typing Feels Like Homework",
    body: "It's 2026. You shouldn't have to type a paragraph to get a 5-second answer.",
  },
];

const features = [
  { Icon: Zap, title: "Voice is faster", body: "People speak faster than they type. Less friction means visitors get unstuck sooner." },
  { Icon: Mic, title: "Ask like a human", body: "No exact search phrase. No magic command. Visitors just ask out loud." },
  { Icon: Volume2, title: "Short spoken replies", body: "Yeti answers like a helpful guide, not a PDF wearing sunglasses." },
  { Icon: Smile, title: "Less effort, more trust", body: "A friendly voice feels easier than another corporate chatbot box." },
];

const steps = [
  { n: 1, Icon: ScanSearch, title: "Paste your website", body: "Yeti scans important pages and turns your site into a compact knowledge base." },
  { n: 2, Icon: WandSparkles, title: "Train the personality", body: "Add a quick voice note if you want tone, rules, offers, or details your pages missed." },
  { n: 3, Icon: Code2, title: "Add one script", body: "Paste it in your footer, or ask Cursor, Claude Code, Codex, or any coding agent to do it." },
];

const takes = [
  {
    title: "AI is not the problem.",
    body: "The problem is making visitors type into a tiny box before they get help.",
  },
  {
    title: "Answer first. Ask later.",
    body: "A good guide should help before it tries to collect emails, tickets, or extra forms.",
  },
  {
    title: "Helpful beats clever.",
    body: "Short, clear spoken answers build more trust than a chatbot trying to sound smart.",
  },
];

const comparisonRows = [
  { label: "Voice answers", yeti: true, chatbot: false },
  { label: "Scans your website", yeti: true, chatbot: false },
  { label: "Short human replies", yeti: true, chatbot: false },
  { label: "Learns your brand personality", yeti: true, chatbot: false },
  { label: "One script install", yeti: true, chatbot: true },
  { label: "No form before helping", yeti: true, chatbot: false },
];

function Index() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute inset-0 -z-10 shimmer-bg opacity-70" aria-hidden />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold text-foreground shadow-soft">
              <span className="w-2 h-2 rounded-full bg-accent" /> Voice-first help for websites
            </span>
            <h1 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] text-balance">
              Your website doesn't need another{" "}
              <span className="line-through text-muted-foreground/70 font-bold">chatbot</span>.
              <br />
              It needs a <span className="text-primary">guide</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Yeti scans your site, learns what matters, and gives visitors short spoken answers. No forms. No typing. No 500-word chatbot essays.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#cta" className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-soft hover:shadow-glow transition-all">
                Create Your Yeti
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#how" className="inline-flex items-center px-7 py-4 rounded-full border border-border bg-background/60 backdrop-blur font-semibold hover:bg-muted transition-colors">
                See How It Works
              </a>
            </div>
            <p className="mt-10 text-sm text-muted-foreground">
              Works on any website. <span className="text-foreground/80 font-medium">Shopify · Webflow · WordPress · Custom · Anything.</span>
            </p>
          </div>

          <div className="reveal lg:pl-8">
            <HeroWidget />
          </div>
        </div>
      </section>

      <section id="how" className="py-20 lg:py-28 bg-gradient-to-b from-background to-secondary/25">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="reveal max-w-3xl">
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
              Three steps. No support-bot ceremony.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              Yeti is made to install fast, learn fast, and start helping without a 19-step onboarding ritual.
            </p>
          </div>

          <div className="mt-14 grid lg:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.title} className="reveal rounded-[28px] border border-border/70 bg-white/70 p-7 shadow-soft card-lift">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                  <step.Icon size={25} />
                </div>
                <p className="mt-6 text-sm font-extrabold text-primary">Step {step.n}</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">{step.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-10 rounded-[2rem] bg-dark-surface p-6 text-white shadow-lift md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-secondary">Agent install prompt</p>
            <p className="mt-3 text-lg font-semibold">
              "Add this Yeti Guide script to my website footer before the closing body tag."
            </p>
            <p className="mt-3 text-white/60">
              Works great with Cursor, Claude Code, Codex, or the friend who says "send me the repo."
            </p>
          </div>
        </div>
      </section>

      <section id="problem" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="reveal max-w-3xl">
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
              Chatbots are exhausting.{" "}
              <span className="text-muted-foreground">(Everyone knows it. Nobody says it.)</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              Nobody woke up excited to type into a tiny popup in the corner of a website. We didn't either.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 gap-6">
            {problems.map((p, i) => {
              const tints = [
                "var(--color-primary)",
                "var(--color-accent)",
                "var(--color-secondary)",
              ];
              const tint = tints[i % tints.length];
              return (
                <div
                  key={p.title}
                  className="reveal group rounded-[28px] p-2 card-lift"
                  style={{ background: "var(--color-dark-surface)" }}
                >
                  <div
                    className="rounded-[22px] aspect-[16/10] grid place-items-center relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in oklab, ${tint} 22%, var(--color-dark-surface-2)), var(--color-dark-surface-2))`,
                    }}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-70"
                      style={{
                        background: `radial-gradient(55% 55% at 50% 50%, color-mix(in oklab, ${tint} 30%, transparent), transparent 70%)`,
                      }}
                    />
                    <p.Icon className="relative h-14 w-14 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110" strokeWidth={2.2} />
                  </div>
                  <div className="px-6 pt-6 pb-7">
                    <h3 className="text-xl font-bold text-white">{p.title}</h3>
                    <p className="mt-3 text-white/60 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      <section id="voice" className="py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="reveal max-w-3xl">
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
              Talking is the original user interface.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              People have been talking for a very long time. Typing into chatbot jail is the weird part.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="reveal rounded-[28px] border border-border/70 bg-white/70 p-6 shadow-soft card-lift">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <f.Icon size={23} />
                </div>
                <h3 className="mt-5 text-lg font-black">{f.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="takes" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="reveal overflow-hidden rounded-[32px] bg-dark-surface p-7 text-white shadow-lift md:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-secondary">
                  Honest takes
                </p>
                <h2 className="mt-5 font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
                  Websites need guides, not louder chatbots.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/65">
                  The point is not to add another widget. The point is to make getting help feel effortless.
                </p>
              </div>
              <div className="space-y-4">
                {takes.map((take, index) => (
                  <article key={take.title} className="rounded-[24px] border border-white/10 bg-white/[0.07] p-5">
                    <div className="flex items-start gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-glow">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">{take.title}</h3>
                        <p className="mt-1 text-white/65 leading-relaxed">{take.body}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="py-24 lg:py-32 bg-gradient-to-b from-secondary/20 to-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="reveal grid items-center gap-12 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">The clean comparison</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
                The choice is clear.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Yeti feels like a guide because it learns your site, speaks out loud, and keeps answers short.
              </p>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-lift">
              <div className="grid grid-cols-[1.35fr_0.75fr_0.75fr] bg-dark-surface text-sm font-black text-white">
                <div className="px-4 py-4 md:px-6">Feature</div>
                <div className="px-3 py-4 text-center md:px-5">Yeti Guide</div>
                <div className="px-3 py-4 text-center md:px-5">Old chatbot</div>
              </div>
              {comparisonRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[1.35fr_0.75fr_0.75fr] border-t border-white text-sm">
                  <div className="bg-muted/40 px-4 py-4 font-bold text-foreground md:px-6">{row.label}</div>
                  <div className="grid place-items-center bg-secondary/35 px-3 py-4 md:px-5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check size={16} />
                    </span>
                  </div>
                  <div className="grid place-items-center bg-red-50 px-3 py-4 md:px-5">
                    {row.chatbot ? (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/80 text-primary-foreground">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-red-400 text-white">
                        <X size={16} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section id="mission" className="relative py-28 lg:py-36 text-white overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-dark-surface), var(--color-dark-surface-2))" }}>
        <div aria-hidden className="absolute inset-0 -z-0 opacity-40 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[480px] h-[480px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 60%)" }} />
          <div className="absolute -bottom-20 -right-10 w-[420px] h-[420px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, var(--color-secondary) 0%, transparent 60%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-14 items-center">
          <div className="reveal">
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
              We're fixing something the whole industry quietly hates.
            </h2>
            <div className="mt-6 space-y-5 text-white/70 text-lg leading-relaxed max-w-xl">
              <p>
                Somewhere along the way, "getting help on a website" became a bureaucratic nightmare. Chatbots that interrogate you. Support tickets that disappear. FAQs that answer every question except yours.
              </p>
              <p>
                We think that's broken. Yeti Guide exists because asking for help should feel easy — like talking to someone who actually knows the place and wants to help you find what you need.
              </p>
              <p className="text-white font-semibold">Not a bot. Not a form. A guide.</p>
            </div>
          </div>

          <div className="reveal relative flex justify-center">
            <div aria-hidden className="absolute inset-0 blur-3xl opacity-60" style={{ background: "radial-gradient(circle at 50% 50%, var(--color-primary) 0%, transparent 60%)" }} />
            <img src={yeti} alt="Yeti mascot" className="relative w-72 md:w-96 yeti-float drop-shadow-2xl" />
            <div className="absolute -top-2 right-2 md:right-6 bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-semibold shadow-glow rotate-3">
              "Less chatbot energy. More helpful mountain friend."
            </div>
          </div>
        </div>

        <p className="relative mt-20 text-center text-sm text-white/50">
          We're a small team that got tired of chatbots. So we built the thing we actually wanted to use.
        </p>
      </section>

      {/* FINAL CTA */}
      <section id="cta" className="py-28 lg:py-36">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="reveal relative inline-block mb-10">
            <div aria-hidden className="absolute inset-0 blur-2xl opacity-70" style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 60%)" }} />
            <div className="relative w-28 h-28 rounded-full bg-background border-4 border-primary/30 grid place-items-center shadow-glow">
              <img src={yeti} alt="" className="w-20 h-20 object-contain yeti-float" />
            </div>
          </div>
          <h2 className="reveal font-display text-4xl md:text-6xl font-black tracking-tight text-balance">
            Stop making visitors type into tiny chatbot boxes.
          </h2>
          <p className="reveal mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Yeti is friendly, fast, and actually helpful. Your visitors deserve better than a chatbot that asks their name before answering anything.
          </p>
          <div className="reveal mt-10 flex flex-wrap justify-center gap-4">
            <a href="#" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-soft hover:shadow-glow transition-all">
              Build My Yeti
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#hero-demo" className="inline-flex items-center px-8 py-4 rounded-full border border-border bg-background font-semibold hover:bg-muted transition-colors">
              See It In Action
            </a>
          </div>
          <div className="reveal mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {["One script tag", "Learns your site", "Voice-first", "No boring bot vibes"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <Check size={16} className="text-primary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
