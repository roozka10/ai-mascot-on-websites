import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { useReveal } from "@/hooks/use-reveal";
import yeti from "@/assets/yeti-mascot.png";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Menu,
  ScanSearch,
  WandSparkles,
  X,
} from "lucide-react";

const heroVideoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4";
const heroPosterUrl = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60";
const demoWidgetSrc = "https://yetiassistant.online/widget/index.html?demo=1&large=1&embed=1&preview=1";

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

function VideoHero() {
  return (
    <section className="min-h-screen w-full bg-[#ededed] p-3 font-sans sm:p-4">
      <div className="relative h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-[#d9d9d9] sm:h-[calc(100vh-32px)] sm:rounded-3xl">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src={heroVideoUrl}
          poster={heroPosterUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          webkit-playsinline="true"
          x5-playsinline="true"
        />
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative z-10">
          <HeroNav />
          <div className="grid min-h-[calc(100vh-96px)] items-center gap-4 px-4 pb-8 pt-8 text-center md:px-10 lg:grid-cols-[1fr_0.9fr] lg:px-16 lg:text-left">
            <div className="mx-auto max-w-4xl lg:mx-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#7B6FE6]" />
                Yeti Guide
              </div>
              <h1
                className="mt-5 font-medium text-[#0b0f1a] sm:mt-6"
                style={{ fontSize: "clamp(36px, 8vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
              >
                Voice guides for{" "}
                <span
                  className="text-[#7B6FE6]"
                  style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}
                >
                  websites
                </span>
                <br />
                that hate chatbots
              </h1>
              <p
                className="mx-auto mt-4 max-w-xl px-2 text-neutral-700 sm:mt-6 lg:mx-0 lg:px-0"
                style={{ fontSize: "clamp(13px, 3.5vw, 16px)" }}
              >
                Yeti scans your site, learns your brand, and gives visitors short spoken answers.
              </p>
              <a
                href="#cta"
                className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2 pl-6 pr-2 text-sm text-white sm:mt-8 sm:py-2.5 sm:pl-7"
              >
                Get Started
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 sm:h-7 sm:w-7">
                  <ChevronRight className="h-4 w-4" />
                </span>
              </a>
            </div>
            <HeroYetiDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroNav() {
  const [open, setOpen] = useState(false);
  const navItems = [
    { label: "How", href: "#how" },
    { label: "Problem", href: "#problem" },
    { label: "Voice", href: "#voice" },
    { label: "Takes", href: "#takes" },
    { label: "Compare", href: "#compare" },
    { label: "Mission", href: "#mission" },
  ];

  return (
    <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <nav className="relative flex w-full max-w-[760px] items-center rounded-full border border-neutral-200 bg-white py-2 pl-2 pr-2 shadow-sm">
        <a href="#" className="shrink-0">
          <img src={yeti} alt="Yeti Guide" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
        </a>
        <div className="hidden items-center gap-4 pl-6 text-[13px] md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="inline-flex items-center gap-2 text-[#0b0f1a] transition hover:text-[#7B6FE6]">
              <span>{item.label}</span>
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href="#cta" className="inline-flex items-center gap-2 rounded-full bg-[#7B6FE6] py-2 pl-4 pr-2 text-sm font-medium text-white">
            <span>Sign up</span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
              <ChevronRight className="h-4 w-4" />
            </span>
          </a>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {open && (
          <div className="absolute left-2 right-2 top-full z-20 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg md:hidden">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[#0b0f1a]"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

function HeroYetiDemo() {
  return (
    <div id="hero-demo" className="relative mx-auto flex h-[420px] w-full max-w-[520px] items-center justify-center lg:h-[610px] lg:justify-end">
      <iframe title="Yeti Guide live demo" src={demoWidgetSrc} allow="microphone" className="h-full w-full border-0 bg-transparent" />
    </div>
  );
}

function Index() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground">
      <VideoHero />

      <div className="cloud-section-bg">
      <section id="how" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div
            className="reveal overflow-hidden rounded-[32px] p-7 text-white shadow-lift md:p-10"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 28%, var(--color-dark-surface)), var(--color-dark-surface-2))",
            }}
          >
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="inline-flex rounded-full bg-white/12 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-secondary">
                  How it works
                </p>
                <h2 className="mt-5 font-display text-4xl md:text-5xl font-black tracking-tight text-balance">
                  Three steps. No support-bot ceremony.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/65">
                  Yeti is made to install fast, learn fast, and start helping without a 19-step onboarding ritual.
                </p>
              </div>
              <div className="space-y-4">
                {steps.map((step) => (
                  <article key={step.title} className="rounded-[24px] border border-white/12 bg-white/[0.08] p-5">
                    <div className="flex items-start gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-sm font-black text-dark-surface shadow-glow">
                        {step.n}
                      </span>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">{step.title}</h3>
                        <p className="mt-1 text-white/65 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
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
    </div>
  );
}
