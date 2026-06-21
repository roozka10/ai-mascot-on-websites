import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Menu,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Volume2,
  Zap,
  X,
} from "lucide-react";
import { PricingSection } from "@/components/PricingSection";
import { AdBanner } from "@/components/AdBanner";
import { ADSENSE_SLOTS } from "@/lib/adsense-config";
import yeti from "@/assets/yeti.png";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4";
const HERO_POSTER_URL = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60";
const HERO_DEMO_WIDGET_SRC = "/widget/index.html?demo=1&large=1&embed=1&preview=1";

type LandingPageProps = {
  onStart: () => void;
};

function HeroNav({ onStart }: LandingPageProps) {
  const [open, setOpen] = useState(false);
  const navItems = [
    { label: "How", href: "#how-it-works" },
    { label: "Compare", href: "#compare" },
    { label: "Free", href: "#free" },
    { label: "Takes", href: "#takes" },
    { label: "Mission", href: "#mission" },
  ];

  return (
    <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <nav className="relative flex w-full max-w-[760px] items-center rounded-full border border-neutral-200 bg-white py-2 pl-2 pr-2 shadow-sm">
        <button type="button" onClick={onStart} className="shrink-0">
          <img src={yeti} alt="Yeti Guide" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
        </button>
        <div className="hidden items-center gap-4 pl-6 text-[13px] md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="inline-flex items-center gap-2 text-[#0b0f1a] transition hover:text-[#7B6FE6]">
              <span>{item.label}</span>
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-full bg-[#7B6FE6] py-2 pl-4 pr-2 text-sm font-medium text-white"
          >
            <span>Sign up</span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
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
    <div id="hero-demo" className="relative mx-auto flex h-[420px] w-full max-w-[520px] items-center justify-center lg:h-[610px] lg:-translate-x-8 lg:-translate-y-8 lg:justify-end">
      <div className="pointer-events-none absolute top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#7B6FE6] shadow-sm lg:top-14">
        Try demo
      </div>
      <iframe title="Yeti Guide live demo" src={HERO_DEMO_WIDGET_SRC} allow="microphone" className="h-full w-full border-0 bg-transparent" />
    </div>
  );
}

function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch {
        setFailed(true);
      }
    };

    void playVideo();
  }, [failed]);

  return (
    <>
      <img
        src={HERO_POSTER_URL}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_34%),linear-gradient(135deg,rgba(219,234,254,0.72),rgba(237,233,254,0.64))]" />
      {!failed && (
        <video
          ref={videoRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          poster={HERO_POSTER_URL}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          disableRemotePlayback
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
      )}
    </>
  );
}

export function LandingPage({ onStart }: LandingPageProps) {
  const steps = [
    { icon: <ScanSearch className="h-5 w-5" />, title: "Scan your site", text: "Paste your website and Yeti learns the important pages." },
    { icon: <Volume2 className="h-5 w-5" />, title: "Add voice", text: "Optional voice notes teach Yeti your tone and extra details." },
    { icon: <Code2 className="h-5 w-5" />, title: "Paste one script", text: "Add it to your footer, or ask Cursor, Claude Code, or Codex to do it." },
  ];

  const proofCards = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Built for trust",
      text: "Yeti uses only your scanned website knowledge and owner notes. If it does not know, it should say so instead of guessing.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Fast for visitors",
      text: "The heavy website scan happens during setup. Live visitor questions use saved knowledge and cached answers.",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Feels human",
      text: "Short spoken answers, simple words, and a mascot make support feel friendly instead of like another chatbot wall.",
    },
  ];

  const takes = [
    {
      title: "AI is not the problem.",
      text: "The problem is making visitors type into a tiny box before they get help.",
    },
    {
      title: "Answer first. Ask later.",
      text: "A good guide should help before it tries to collect emails, tickets, or extra forms.",
    },
    {
      title: "Helpful beats clever.",
      text: "Short, clear spoken answers build more trust than a chatbot trying to sound smart.",
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

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(191,239,255,0.85),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(123,111,230,0.22),transparent_30%),linear-gradient(180deg,#FAFBFF,#F7F8FF)] text-foreground">
      <section className="min-h-screen w-full bg-[#ededed] p-3 font-sans sm:p-4">
        <div className="relative h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-[#d9d9d9] sm:h-[calc(100vh-32px)] sm:rounded-3xl">
          <HeroBackgroundVideo />
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative z-10">
            <HeroNav onStart={onStart} />
            <div className="grid min-h-[calc(100vh-96px)] items-center gap-4 px-4 pb-8 pt-8 text-center md:px-10 lg:grid-cols-[1fr_0.9fr] lg:px-16 lg:text-left">
              <div className="mx-auto max-w-4xl lg:mx-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-1.5 text-[13px] font-black text-[#0b0f1a] shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-[#7B6FE6] text-[#7B6FE6]" />
                  Built for small business websites
                </div>
                <h1
                  className="mt-5 font-medium text-[#0b0f1a] sm:mt-6"
                  style={{ fontSize: "clamp(36px, 8vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
                >
                  Turn visitors into{" "}
                <span
                  className="text-[#7B6FE6]"
                  style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}
                >
                    customers
                  </span>
                  <br />
                  with a talking Yeti
                </h1>
                <p
                  className="mx-auto mt-4 max-w-2xl px-2 text-neutral-700 sm:mt-6 lg:mx-0 lg:px-0"
                  style={{ fontSize: "clamp(13px, 3.5vw, 16px)" }}
                >
                  Yeti scans your website, learns your pricing, FAQs, policies, and pages, then gives visitors short spoken answers they can understand.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row lg:justify-start">
                  <button
                    type="button"
                    onClick={onStart}
                    className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#0b0f1a] py-2.5 pl-6 pr-2 text-sm font-black text-white shadow-[0_22px_55px_-28px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:bg-black"
                  >
                    Create your Yeti
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                  <a
                    href="#hero-demo"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/80 bg-white/85 px-5 text-sm font-black text-[#0b0f1a] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    Try the demo first
                  </a>
                </div>
              </div>
              <HeroYetiDemo />
            </div>
          </div>
        </div>
      </section>

      <div className="cloud-section-bg">
      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-[0_25px_90px_-58px_rgba(15,23,42,0.5)] md:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            {proofCards.map((card) => (
              <article key={card.title} className="rounded-[1.5rem] bg-[linear-gradient(180deg,#fbfbff,#f4f2ff)] p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  {card.icon}
                </span>
                <h2 className="mt-4 text-xl font-black tracking-[-0.04em] text-foreground">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {card.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,oklch(0.30_0.075_285),oklch(0.18_0.02_270))] p-7 text-white shadow-[0_30px_90px_-52px_rgba(15,23,42,0.9)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="inline-flex rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                How it works
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Three steps. No chatbot ceremony.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68">
                Yeti is made to install fast, learn fast, and start helping without a 19-step onboarding ritual.
              </p>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <article key={step.title} className="rounded-[1.5rem] border border-white/12 bg-white/[0.08] p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-sm font-black text-[oklch(0.18_0.02_270)]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/68">{step.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">The clean comparison</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              The choice is clear.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Yeti feels like a guide because it learns your site, speaks out loud, and keeps answers short.
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-white shadow-[0_25px_90px_-55px_rgba(15,23,42,0.45)]">
            <div className="grid grid-cols-[1.35fr_0.75fr_0.75fr] bg-[oklch(0.20_0.015_270)] text-sm font-black text-white">
              <div className="px-4 py-4 md:px-6">Feature</div>
              <div className="px-3 py-4 text-center md:px-5">Yeti Guide</div>
              <div className="px-3 py-4 text-center md:px-5">Old chatbot</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1.35fr_0.75fr_0.75fr] border-t border-white text-sm">
                <div className="bg-muted/40 px-4 py-4 font-bold text-foreground md:px-6">{row.label}</div>
                <div className="grid place-items-center bg-secondary/35 px-3 py-4 md:px-5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                </div>
                <div className="grid place-items-center bg-red-50 px-3 py-4 md:px-5">
                  {row.chatbot ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/80 text-primary-foreground">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-red-400 text-white">
                      <X className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection onLogin={onStart} />

      <div className="mx-auto w-full max-w-3xl px-5 pb-8">
        <AdBanner slot={ADSENSE_SLOTS.footer} />
      </div>

      <section id="takes" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="overflow-hidden rounded-[2rem] bg-[oklch(0.20_0.015_270)] p-7 text-white shadow-[0_30px_90px_-52px_rgba(15,23,42,0.9)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                Honest takes
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Websites need guides, not louder chatbots.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68">
                The point is not to add another widget. The point is to make getting help feel effortless.
              </p>
            </div>
            <div className="space-y-3">
              {takes.map((take, index) => (
                <article key={take.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-black text-primary-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{take.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/68">{take.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="mission" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="grid items-center gap-8 rounded-[2rem] bg-[oklch(0.20_0.015_270)] p-7 text-white shadow-[0_30px_90px_-52px_rgba(15,23,42,0.9)] md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">The mission</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              We are fixing the industry everyone quietly hates.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/68">
              Website help should feel like talking to someone who knows the place, not wrestling
              a popup that asks for your email before answering anything.
            </p>
          </div>
          <img src={yeti} alt="Yeti mascot" className="mx-auto h-44 w-44 object-contain drop-shadow-2xl" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 py-16 text-center">
        <h2 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Stop making visitors type into tiny chatbot boxes.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Build a voice-first Yeti that learns your site, talks like a guide, and helps people faster.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-sm font-bold text-primary-foreground shadow-[0_22px_55px_-26px_rgba(123,111,230,0.9)] transition hover:bg-primary/90"
        >
          Create your Yeti
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
      </div>
    </main>
  );
}
