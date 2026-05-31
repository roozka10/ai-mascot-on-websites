import { useState, useCallback, useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Copy,
  ShieldCheck,
  Clock,
  Globe,
  Loader2,
  Mic,
  Square,
  User,
  LogOut,
  Home,
} from "lucide-react";
import { LandingPage } from "@/components/LandingPage";
import yeti from "@/assets/yeti.png";
import mascotHandsUp from "../../../mascotwithhandsup.png";
import {
  generateYetiId,
  getAuthRedirectUrl,
  isSupabaseConfigured,
  saveYetiConfig,
  supabase,
} from "@/lib/supabase";

const TOTAL = 4;

const WIDGET_HOST = "https://ai-mascot-on-websites.vercel.app";

const BUSINESS_BRIEF_QUESTIONS = [
  "What do you sell, who is it for, and what makes it different?",
  "What questions do customers ask before they buy?",
  "What are your prices, packages, trials, guarantees, or refund rules?",
  "What should Yeti say about shipping, booking, hours, support, or contact info?",
  "What tone should Yeti use, and what should it never promise?",
];

const ACTIVE_PLAN_STATUSES = new Set(["active", "trialing", "past_due"]);

async function fetchSetupCredits(accessToken: string) {
  const response = await fetch("/api/account-subscription", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Could not check your plan credits.");
  }

  const websitesUsed = Number(data?.credits?.websites_used || 0);
  const websitesLimit = Number(data?.credits?.websites_limit || 0);
  const status = data?.subscription?.status;
  const hasActivePlan =
    (Boolean(data?.subscription) && ACTIVE_PLAN_STATUSES.has(status)) ||
    websitesLimit > 0;

  return { hasActivePlan, websitesUsed, websitesLimit };
}

function canCreateWebsite(credits: {
  hasActivePlan: boolean;
  websitesUsed: number;
  websitesLimit: number;
}) {
  return credits.hasActivePlan && credits.websitesUsed < credits.websitesLimit;
}

async function fetchPersonalizedQuestions(businessName: string, url: string) {
  try {
    const response = await fetch("/api/onboarding-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, url }),
    });
    const data = await response.json().catch(() => ({}));
    const questions = Array.isArray(data?.questions)
      ? data.questions.filter((question: unknown) => typeof question === "string" && question.trim())
      : [];

    if (!response.ok || questions.length < 5) {
      return BUSINESS_BRIEF_QUESTIONS;
    }

    return questions.slice(0, 5);
  } catch {
    return BUSINESS_BRIEF_QUESTIONS;
  }
}

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [index: number]: {
      transcript: string;
    };
  };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function Mascot({ size = 72 }: { size?: number }) {
  return (
    <img
      src={yeti}
      alt="Yeti mascot"
      width={size}
      height={size}
      className="mx-auto select-none drop-shadow-sm"
    />
  );
}

function StepShell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div
      key={step}
      className="animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      {children}
    </div>
  );
}

function QuestionLoadingGame() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-start bg-white/80 px-4 pt-28 text-center backdrop-blur-md">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">
        Wait...
      </p>
      <h2 className="mt-2 max-w-sm text-2xl font-black tracking-[-0.06em] text-foreground sm:text-3xl">
        Reading your website
      </h2>
      <p className="mt-2 max-w-sm text-sm font-bold leading-6 text-muted-foreground">
        Yeti is making questions to ask you.
      </p>
      <img
        src={mascotHandsUp}
        alt="Yeti mascot waiting"
        className="mt-8 w-[230px] max-w-[72vw] select-none object-contain drop-shadow-[0_24px_34px_rgba(15,23,42,0.16)] sm:w-[300px]"
      />
    </div>
  );
}

function LuckySpinPopup({
  spinning,
  reward,
  message,
  onSpin,
  onClose,
}: {
  spinning: boolean;
  reward: { websites_granted: number; questions_granted: number; reward_label?: string | null } | null;
  message?: string;
  onSpin: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <style>{`
        @keyframes yeti-run-track {
          from { transform: translateX(120%); }
          to { transform: translateX(-140%); }
        }
        @keyframes yeti-jump {
          0%, 100% { transform: translateY(0); }
          45% { transform: translateY(-44px); }
        }
        @keyframes yeti-ground {
          from { background-position-x: 0; }
          to { background-position-x: -48px; }
        }
      `}</style>
      <div className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white p-5 text-center shadow-[0_28px_90px_-42px_rgba(15,23,42,0.75)] sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          Lucky Yeti Spin
        </p>
        <h2 className="mx-auto mt-2 max-w-md text-2xl font-black tracking-[-0.06em] text-foreground sm:text-3xl">
          We do not fake luck. Everybody gets different stuff.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs font-bold leading-5 text-muted-foreground">
          Spin once. If Yeti blesses you, you get free website slots and AI questions. If not, blame the mountain.
        </p>

        <div className="relative mx-auto mt-5 h-60 overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,#111827_0%,#20113f_54%,#f8f7ff_54%,#ffffff_100%)] shadow-inner">
          <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
            real odds
          </div>
          <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
            one spin
          </div>
          <div className="absolute bottom-[72px] left-0 right-0 h-[3px] bg-foreground/80" />
          <div
            className="absolute bottom-[74px] left-12 z-10"
            style={{ animation: spinning ? "yeti-jump 0.72s ease-in-out infinite" : undefined }}
          >
            <img src={yeti} alt="Yeti mascot" className="h-20 w-20 object-contain drop-shadow-xl" />
          </div>
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="absolute bottom-[75px] h-10 w-7 rounded-md bg-primary shadow-[0_10px_24px_-12px_rgba(124,58,237,0.9)]"
              style={{
                right: `${28 + item * 150}px`,
                animation: spinning
                  ? `yeti-run-track 1.35s linear ${item * 0.28}s infinite`
                  : undefined,
              }}
            />
          ))}
          <div
            className="absolute bottom-0 left-0 right-0 h-[72px] opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(124,58,237,0.16) 0 24px,transparent 24px 48px)",
              backgroundSize: "48px 100%",
              animation: spinning ? "yeti-ground 0.65s linear infinite" : undefined,
            }}
          />
          <p className="absolute bottom-5 left-0 right-0 text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
            {spinning ? "Yeti is jumping for your credits..." : "Press spin to play"}
          </p>
        </div>

        {reward ? (
          <div className="mt-4 rounded-2xl bg-primary/8 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              {reward.reward_label || "Yeti Prize"}
            </p>
            <p className="mt-1 text-lg font-black text-foreground">
              +{reward.websites_granted} website {reward.websites_granted === 1 ? "slot" : "slots"} and +{reward.questions_granted.toLocaleString()} AI questions
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm font-bold text-foreground">
            {message || "The wheel is real. The odds are rude."}
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={reward ? onClose : onSpin}
            disabled={spinning}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          >
            {spinning ? "Spinning..." : reward ? "Use my credits" : "Spin once"}
          </button>
          {!reward && (
            <button
              type="button"
              onClick={onClose}
              disabled={spinning}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2.5 text-xs font-black text-muted-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— CORS proxy with fallbacks ———
async function fetchViaProxy(url: string): Promise<string | null> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];
  for (const makeUrl of proxies) {
    try {
      const res = await fetch(makeUrl(url), { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.text();
    } catch {
      continue;
    }
  }
  return null;
}

type PageScan = {
  url: string;
  path: string;
  title: string;
  description: string;
  headings: string[];
  ctas: string[];
  snippets: string[];
  internalUrls: string[];
};

const MAX_SCAN_PAGES = 8;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePageUrl(href: string, baseUrl: string): string | null {
  if (!href || /^(mailto:|tel:|sms:|javascript:)/i.test(href)) return null;

  try {
    const url = new URL(href, baseUrl);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;

    url.hash = "";
    url.search = "";

    if (
      /\.(pdf|png|jpe?g|gif|webp|svg|mp4|mov|zip|css|js|ico|xml)$/i.test(url.pathname) ||
      /\/(login|logout|cart|checkout|account|wp-admin)\b/i.test(url.pathname)
    ) {
      return null;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function compactList(items: string[], maxItems: number, maxLength = 90): string[] {
  return [...new Set(items.map(cleanText).filter(Boolean))]
    .filter((item) => item.length > 1)
    .map((item) => (item.length > maxLength ? `${item.slice(0, maxLength - 1)}...` : item))
    .slice(0, maxItems);
}

// ——— Deep HTML extraction ———
function extractPageScan(html: string, pageUrl: string, bizName: string): PageScan {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());

  const parsedUrl = new URL(pageUrl);

  const title = cleanText(doc.querySelector("title")?.textContent || bizName);
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";

  const internalUrls = new Set<string>();
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = (a as HTMLAnchorElement).getAttribute("href");
    const normalized = href ? normalizePageUrl(href, pageUrl) : null;
    if (normalized) internalUrls.add(normalized);
  });

  const headings: string[] = [];
  doc.querySelectorAll("h1, h2, h3").forEach((h) => headings.push(h.textContent || ""));

  const ctas = new Set<string>();
  doc.querySelectorAll('button, a.btn, a.button, [class*="cta"], [class*="btn"]').forEach((el) => {
    const t = cleanText(el.textContent || "");
    if (t && t.length > 2 && t.length < 40) ctas.add(t);
  });

  const snippets: string[] = [];
  doc.querySelectorAll("main p, main li, section p, section li, article p, article li").forEach((el) => {
    const text = cleanText(el.textContent || "");
    if (text.length >= 45 && text.length <= 260) snippets.push(text);
  });

  const structuredSnippets: string[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const d = JSON.parse(s.textContent || "");
      const items = Array.isArray(d) ? d : [d];
      items.forEach((item) => {
        if (item.name) structuredSnippets.push(`Name: ${item.name}`);
        if (item.description) structuredSnippets.push(`Description: ${item.description}`);
        if (item.telephone) structuredSnippets.push(`Phone: ${item.telephone}`);
        if (item.address?.streetAddress) structuredSnippets.push(`Address: ${item.address.streetAddress}`);
      });
    } catch {
      /* skip */
    }
  });

  return {
    url: pageUrl,
    path: parsedUrl.pathname === "/" ? "Home" : parsedUrl.pathname.replace(/^\/|\/$/g, ""),
    title,
    description: cleanText(metaDesc || ogDesc),
    headings: compactList(headings, 8),
    ctas: compactList([...ctas], 6, 45),
    snippets: compactList([...structuredSnippets, ...snippets], 8, 180),
    internalUrls: [...internalUrls],
  };
}

function extractSitemapUrls(xml: string, baseUrl: string): string[] {
  const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => normalizePageUrl(match[1], baseUrl))
    .filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
}

async function scanWebsite(
  startUrl: string,
  bizName: string,
  onStatus: (message: string) => void,
): Promise<PageScan[]> {
  onStatus("Scanning homepage...");
  const homeHtml = await fetchViaProxy(startUrl);
  if (!homeHtml) return [];

  const homeScan = extractPageScan(homeHtml, startUrl, bizName);
  const baseUrl = new URL(startUrl).origin;

  onStatus("Finding important pages...");
  const sitemapHtml = await fetchViaProxy(`${baseUrl}/sitemap.xml`);
  const sitemapUrls = sitemapHtml ? extractSitemapUrls(sitemapHtml, startUrl) : [];

  const candidates = [...new Set([startUrl, ...sitemapUrls, ...homeScan.internalUrls])]
    .filter((url) => normalizePageUrl(url, startUrl))
    .slice(0, MAX_SCAN_PAGES);

  const scans: PageScan[] = [homeScan];
  for (const pageUrl of candidates.filter((candidate) => candidate !== startUrl)) {
    onStatus(`Scanning ${new URL(pageUrl).pathname || "/"}...`);
    const html = await fetchViaProxy(pageUrl);
    if (!html) continue;
    scans.push(extractPageScan(html, pageUrl, bizName));
    if (scans.length >= MAX_SCAN_PAGES) break;
  }

  return scans;
}

function buildVoicePrompt({
  name,
  url,
  transcript,
  scans,
}: {
  name: string;
  url: string;
  transcript: string;
  scans: PageScan[];
}) {
  const pageKnowledge = scans
    .slice(0, 6)
    .map((page) => {
      const facts = [
        page.description,
        ...page.headings.slice(0, 3),
        ...page.snippets.slice(0, 3),
        page.ctas.length ? `Actions: ${page.ctas.join(", ")}` : "",
      ].filter(Boolean);
      return `- ${page.path}: ${facts.join(" | ").slice(0, 360)}`;
    })
    .join("\n");

  const ownerNotes = transcript.trim()
    ? `\nOwner notes: ${transcript.trim().slice(0, 1200)}`
    : "";

  return `You are Yeti, the fast website guide for ${name}. Use ONLY this compact site knowledge.

Site: ${new URL(url).hostname.replace(/^www\./, "")}
${ownerNotes}

Knowledge:
${pageKnowledge || "- Website scan found limited text. Ask a concise clarifying question if needed."}

Rules:
- Answer fast, like a human guide: fun, warm, and easy.
- Keep answers tiny: 1 short sentence, max 2 only if needed.
- Prefer scanned site knowledge over owner notes.
- Never invent prices, policies, guarantees, hours, or availability.
- Mention clean domains only, like example.com. No https, www, slashes, or long paths.
- Just speak naturally.`;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.68 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15C1.42 8.53 1 10.21 1 12s.42 3.47 1.15 4.94l3.69-2.84z" />
      <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.68 1 3.96 3.47 2.15 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z" />
    </svg>
  );
}

function LoginScreen({
  onGoogle,
  loading,
  error,
}: {
  onGoogle: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.10),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-[520px] flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
          <img
            src={yeti}
            alt="Yeti mascot"
            className="relative z-10 mx-auto w-28 select-none drop-shadow-[0_20px_28px_rgba(15,23,42,0.16)]"
          />
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Yeti Guide
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
          Sign in to create your Yeti
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
          One Google button. No password, no email form. Train a talking Yeti for your website.
        </p>

        {!isSupabaseConfigured && (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Supabase env vars are missing in this build. In Vercel, add{" "}
            <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>, then redeploy.
          </p>
        )}

        {error && (
          <p className="mt-6 w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onGoogle}
          disabled={!isSupabaseConfigured || loading}
          className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-full border border-border bg-white px-5 py-4 text-sm font-semibold text-foreground shadow-[0_18px_55px_-34px_rgba(15,23,42,0.45)] transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
          {loading ? "Redirecting to Google..." : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}

function OnboardingNav({
  email,
  view,
  onSetup,
  onAccount,
}: {
  email?: string;
  view: "setup" | "account";
  onSetup: () => void;
  onAccount: () => void;
}) {
  return (
    <header className="fixed left-1/2 top-4 z-50 w-[calc(100%-24px)] max-w-[520px] -translate-x-1/2">
      <nav className="flex items-center justify-between gap-2 rounded-full border border-white/70 bg-white/82 px-2 py-2 shadow-[0_18px_58px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onSetup}
          className="flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-left transition hover:bg-muted"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10">
            <img src={yeti} alt="" className="h-6 w-6 object-contain" />
          </span>
          <span className="hidden text-sm font-black tracking-tight text-foreground sm:block">
            Yeti Guide
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSetup}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
              view === "setup"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            Setup
          </button>
          <button
            type="button"
            onClick={onAccount}
            className={`inline-flex max-w-[190px] items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
              view === "account"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{email || "Account"}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

function AccountPage({
  email,
  accessToken,
  onLogout,
}: {
  email?: string;
  accessToken?: string;
  onLogout: () => void;
}) {
  const [subscription, setSubscription] = useState<{
    stripe_subscription_id: string | null;
    plan: string | null;
    status: string | null;
    websites_limit: number | null;
    questions_limit: number | null;
  } | null>(null);
  const [credits, setCredits] = useState<{
    websites_used: number;
    websites_limit: number;
    questions_used: number;
    questions_limit: number;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setSubscriptionLoading(false);
      return;
    }

    let active = true;
    setSubscriptionLoading(true);
    setSubscriptionError("");

    void fetch("/api/account-subscription", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Could not load your plan.");
        if (active) {
          setSubscription(data.subscription || null);
          setCredits(data.credits || null);
        }
      })
      .catch((error) => {
        if (active) setSubscriptionError(error instanceof Error ? error.message : "Could not load your plan.");
      })
      .finally(() => {
        if (active) setSubscriptionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function cancelSubscription() {
    if (!accessToken || !subscription?.stripe_subscription_id) return;

    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setCancelMessage("Please tell us why before cancelling.");
      return;
    }

    setCancelLoading(true);
    setCancelMessage("");

    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          reason,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not cancel your plan.");

      setSubscription((current) => current ? { ...current, status: "canceled" } : current);
      setShowCancel(false);
      setCancelReason("");
      setCancelMessage("Your plan has been canceled.");
    } catch (error) {
      setCancelMessage(error instanceof Error ? error.message : "Could not cancel your plan.");
    } finally {
      setCancelLoading(false);
    }
  }

  const isCanceled = subscription?.status === "canceled";
  const planName = isCanceled
    ? "Buy a plan"
    : subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "No paid plan yet";
  const websiteCredits = credits
    ? `${credits.websites_used}/${credits.websites_limit || "-"}`
    : "-";
  const questionCredits = credits
    ? `${credits.questions_used.toLocaleString()}/${credits.questions_limit ? credits.questions_limit.toLocaleString() : "-"}`
    : "-";
  const hasAnyCredits = Boolean(
    credits && (credits.websites_limit > 0 || credits.questions_limit > 0),
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 pb-8 pt-24">
      <section className="w-full max-w-2xl rounded-[1.75rem] border border-border/60 bg-white p-5 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.48)] sm:p-6">
        <Mascot size={58} />
        <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Account
        </p>
        <h1 className="mt-2 text-center text-2xl font-black tracking-[-0.05em] text-foreground">
          Your Yeti workspace
        </h1>
        <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
          Signed in as
        </p>
        <p className="mx-auto mt-2 max-w-sm rounded-2xl bg-muted px-3 py-2 text-center text-xs font-bold text-foreground">
          {email || "Unknown email"}
        </p>

        <div className="mt-5 rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff,#f8f7ff)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current plan</p>
              <h2 className="mt-1.5 text-2xl font-black tracking-[-0.05em] text-foreground">
                {subscriptionLoading ? "Loading..." : planName}
              </h2>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {subscriptionLoading
                  ? "Checking credits..."
                  : hasAnyCredits
                    ? "Plan and bonus credits"
                    : isCanceled
                      ? "Choose a plan to unlock credits"
                      : "Plan and monthly credits"}
              </p>
            </div>
          </div>

          {subscriptionError && (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
              {subscriptionError}
            </p>
          )}

          {cancelMessage && (
            <p className="mt-3 rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-xs font-bold text-primary">
              {cancelMessage}
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Website credits</p>
              <p className="mt-1.5 text-xl font-black text-foreground">
                {websiteCredits}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">AI question credits this month</p>
              <p className="mt-1.5 text-xl font-black text-foreground">
                {questionCredits}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground transition hover:bg-primary/90"
            >
              Upgrade plan
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              disabled={!subscription?.stripe_subscription_id || isCanceled}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2.5 text-xs font-black text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCanceled ? "Plan canceled" : "Cancel plan"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-bold text-background transition hover:bg-foreground/90"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </section>

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-red-100 bg-white p-5 text-center shadow-[0_28px_90px_-42px_rgba(15,23,42,0.65)]">
            <button
              type="button"
              onClick={() => setShowCancel(false)}
              className="ml-auto flex rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close cancellation"
            >
              <X className="h-4 w-4" />
            </button>
            <Mascot size={74} />
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
              Cancel plan
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground">
              Are you sure?
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This will cancel your Stripe subscription now. Tell us why before you go.
            </p>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Why do you want to cancel?"
              className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-border bg-white px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={cancelSubscription}
                disabled={cancelLoading}
                className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-70"
              >
                {cancelLoading ? "Cancelling..." : "Cancel anyway"}
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2.5 text-xs font-black text-muted-foreground transition hover:bg-muted"
              >
                Never mind
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState<"setup" | "account">("setup");
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [briefQuestions, setBriefQuestions] = useState(BUSINESS_BRIEF_QUESTIONS);
  const [briefAnswers, setBriefAnswers] = useState<string[]>(() => BUSINESS_BRIEF_QUESTIONS.map(() => ""));
  const [currentBriefQuestionIndex, setCurrentBriefQuestionIndex] = useState(0);
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [spinLoading, setSpinLoading] = useState(false);
  const [spinReward, setSpinReward] = useState<{
    websites_granted: number;
    questions_granted: number;
    reward_label?: string | null;
  } | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [yetiId, setYetiId] = useState("");
  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const heardSpeechRef = useRef(false);

  const canContinue = name.trim().length > 0 && site.trim().length > 0;
  const currentBriefQuestion =
    briefQuestions[currentBriefQuestionIndex] || BUSINESS_BRIEF_QUESTIONS[currentBriefQuestionIndex] || BUSINESS_BRIEF_QUESTIONS[0];
  const currentBriefAnswer = briefAnswers[currentBriefQuestionIndex] || "";
  const isGeneratingQuestions = loading && statusText.toLowerCase().includes("questions");
  const goToNextBriefQuestion = () => {
    if (currentBriefQuestionIndex < briefQuestions.length - 1) {
      setCurrentBriefQuestionIndex((current) => current + 1);
      return;
    }
    setStep(2);
  };

  async function refreshSpinEligibility(accessToken: string) {
    const response = await fetch("/api/account-subscription", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;

    const websitesLimit = Number(data?.credits?.websites_limit || 0);
    const questionsLimit = Number(data?.credits?.questions_limit || 0);
    const hasSpun = Boolean(data?.free_credits?.has_spun);
    setShowLuckySpin(!hasSpun && websitesLimit === 0 && questionsLimit === 0);
  }

  async function spinForCredits() {
    if (!session?.access_token) return;
    setSpinLoading(true);
    setError("");

    try {
      const [response] = await Promise.all([
        fetch("/api/free-credits-spin", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        new Promise((resolve) => setTimeout(resolve, 1800)),
      ]);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not spin for credits.");
      setSpinReward(data.reward || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not spin for credits.");
      setShowLuckySpin(false);
    } finally {
      setSpinLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" || params.get("start") === "setup") {
      setShowLogin(true);
      setView("setup");
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition));

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += ` ${text.trim()}`;
        } else {
          interimText += ` ${text.trim()}`;
        }
      }

      if (finalText.trim()) {
        heardSpeechRef.current = true;
        const answerText = finalText.trim();
        setBriefAnswers((current) => {
          const next = [...current];
          next[currentBriefQuestionIndex] = `${next[currentBriefQuestionIndex] || ""} ${answerText}`.trim();
          return next;
        });
      }
      setInterimTranscript(interimText.trim());
    };

    recognition.onerror = (event) => {
      setListening(false);
      setInterimTranscript("");
      setError(
        event.error === "not-allowed"
          ? "Microphone access was blocked. Please allow microphone access and try again."
          : "Speech recognition stopped. Please try the mic again."
      );
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      if (heardSpeechRef.current) {
        setCurrentBriefQuestionIndex((current) => Math.min(current + 1, briefQuestions.length - 1));
        heardSpeechRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [briefQuestions.length, currentBriefQuestionIndex]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingAuth(false);
      return;
    }

    let active = true;

    const clearOAuthParamsFromUrl = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("code") && !url.searchParams.has("error")) return;
      url.searchParams.delete("code");
      url.searchParams.delete("error");
      url.searchParams.delete("error_code");
      url.searchParams.delete("error_description");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    };

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setCheckingAuth(false);
      if (data.session) clearOAuthParamsFromUrl();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingAuth(false);
      setAuthLoading(false);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        clearOAuthParamsFromUrl();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token || view !== "setup" || step !== 0) return;
    void refreshSpinEligibility(session.access_token);
  }, [session?.access_token, step, view]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not available in this browser. You can type the business details instead.");
      return;
    }

    setError("");
    setInterimTranscript("");
    heardSpeechRef.current = false;
    setVoiceStarted(true);

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const continueToVoice = async () => {
    if (!name.trim() || !site.trim()) return;
    if (!session?.access_token) {
      setError("Sign in to continue.");
      return;
    }

    setError("");
    setLoading(true);
    setStatusText("Checking your plan...");

    try {
      const credits = await fetchSetupCredits(session.access_token);
      if (!canCreateWebsite(credits)) {
        window.location.href = "/pricing";
        return;
      }
      setStatusText("Writing questions for your website...");
      const questions = await fetchPersonalizedQuestions(name.trim(), site.trim());
      setBriefQuestions(questions);
      setBriefAnswers(questions.map(() => ""));
      setCurrentBriefQuestionIndex(0);
      setStep(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not check your plan.");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) return;

    setError("");
    setAuthLoading(true);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (authError) {
      setError(authError.message);
      setAuthLoading(false);
    }
  };

  const saveVoicePersonality = useCallback(async () => {
    if (!name.trim() || !site.trim()) return;

    setLoading(true);
    setError("");
    setStatusText("Preparing scan...");

    try {
      let url = site.trim();
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      if (session?.access_token) {
        setStatusText("Checking website credits...");
        const credits = await fetchSetupCredits(session.access_token);
        if (!canCreateWebsite(credits)) {
          window.location.href = "/pricing";
          return;
        }
      }

      const scans = await scanWebsite(url, name, setStatusText);
      if (!scans.length && !transcript.trim()) {
        setError("Yeti could not scan this website. Add a short voice note or try the full https:// URL.");
        return;
      }

      const allPages = scans.map((scan) => scan.path).filter(Boolean).slice(0, 20);

      setStatusText("Saving your Yeti...");
      const answerNotes = briefQuestions
        .map((question, index) => {
          const answer = (briefAnswers[index] || "").trim();
          return answer ? `${question}\n${answer}` : "";
        })
        .filter(Boolean)
        .join("\n\n");
      const voicePrompt = buildVoicePrompt({
        name,
        url,
        transcript: answerNotes || transcript,
        scans,
      });

      const id = generateYetiId();
      const cleanDomain = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      await saveYetiConfig({
        yeti_id: id,
        domain: cleanDomain,
        business_name: name,
        prompt: voicePrompt,
        pages: allPages,
      });

      setYetiId(id);
      const code = `<!-- Yeti Guide Widget -->
<script src="${WIDGET_HOST}/widget.js" data-yeti="${id}" async></script>`;
      setSnippet(code);

      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }

    setLoading(false);
    setStatusText("");
  }, [briefAnswers, briefQuestions, name, session?.access_token, site, transcript]);

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const email = session?.user?.email;

  const openSetup = () => {
    setView("setup");
    setError("");
  };

  const openAccount = () => {
    stopListening();
    setView("account");
    setError("");
  };

  const logout = async () => {
    stopListening();
    setAuthLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setView("setup");
    setShowLogin(true);
    setAuthLoading(false);
  };

  const nav = (
    <OnboardingNav
      email={email}
      view={view}
      onSetup={openSetup}
      onAccount={openAccount}
    />
  );

  if (checkingAuth) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session && !showLogin) {
    return <LandingPage onStart={() => setShowLogin(true)} />;
  }

  if (!session) {
    return (
      <LoginScreen
        onGoogle={signInWithGoogle}
        loading={authLoading}
        error={error}
      />
    );
  }

  if (view === "account") {
    return (
      <>
        {nav}
        <AccountPage email={email} accessToken={session.access_token} onLogout={logout} />
      </>
    );
  }

  // Step 3 — horizontal layout
  if (step === 3) {
    const displaySnippet = `<!-- Yeti Guide Widget -->\n<script\n  src="${WIDGET_HOST}/widget.js"\n  data-yeti="${yetiId}"\n  async\n></script>`;

    return (
      <>
      {nav}
      <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 pb-10 pt-28">
        <div className="w-full max-w-[1040px] mx-auto">
          <StepShell step={3}>
            <Stepper step={step} />

            <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-3xl border border-border/50 bg-white p-7 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.35)] sm:p-9">
                <Mascot size={70} />
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Ready to install
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                  Add Yeti to any website
                </h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Yeti will load the personality you just recorded, answer visitors with that business knowledge, and speak out loud on your site.
                </p>

                <div className="mt-7 grid gap-3">
                  {[
                    "Copy the code on the right.",
                    "Tell Cursor, Claude Code, Codex, or any coding agent: \"Add this widget script to my website footer, right before </body>.\"",
                    "Publish the website. Yeti goes live.",
                  ].map((text, index) => (
                    <div key={text} className="flex items-center gap-3 rounded-2xl bg-muted/45 px-4 py-3 text-sm text-foreground">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  {[
                    { i: <ShieldCheck className="h-3.5 w-3.5" />, t: "One script" },
                    { i: <Clock className="h-3.5 w-3.5" />, t: "2 minute install" },
                    { i: <Globe className="h-3.5 w-3.5" />, t: "Any website" },
                  ].map((p) => (
                    <span
                      key={p.t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      {p.i} {p.t}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={() => {
                      setStep(0);
                      stopListening();
                      setTranscript("");
                      setInterimTranscript("");
                      setBriefQuestions(BUSINESS_BRIEF_QUESTIONS);
                      setBriefAnswers(BUSINESS_BRIEF_QUESTIONS.map(() => ""));
                      setCurrentBriefQuestionIndex(0);
                      setVoiceStarted(false);
                      setSnippet("");
                      setError("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                  >
                    Train another site
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.35)] sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Embed code
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Paste this once. No extra listener script needed.
                    </p>
                  </div>
                  <button
                    onClick={copy}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-[oklch(0.18_0.02_280)] p-5 text-[oklch(0.95_0.02_295)]">
                  <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed sm:text-sm">{displaySnippet}</pre>
                </div>

                <div className="mt-5 rounded-2xl border border-border/60 bg-white px-5 py-4">
                  <p className="text-sm font-semibold text-foreground">Short install note</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    You can paste this yourself, or tell your AI coding agent: <span className="font-medium text-foreground">"Add this Yeti widget script to my website footer before <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;/body&gt;</code>."</span> The <code className="rounded bg-muted px-1.5 py-0.5 text-xs">data-yeti</code> ID connects this site to the personality you recorded.
                  </p>
                </div>
              </section>
            </div>
          </StepShell>
        </div>
      </main>
      </>
    );
  }

  // Step 2 — review answers before saving
  if (step === 2) {
    return (
      <>
      {nav}
      <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 pb-6 pt-24">
        <div className="mx-auto w-full max-w-[820px]">
          <StepShell step={2}>
            <Stepper step={step} />

            <section className="rounded-[1.75rem] border border-border/60 bg-white/90 p-4 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.48)] backdrop-blur sm:p-6">
              <div className="flex flex-col items-center text-center">
                <Mascot size={54} />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  Review answers
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground sm:text-3xl">
                  Clean up what Yeti learned
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Click any answer to edit it. Empty answers are okay, but better details make Yeti smarter.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {briefQuestions.map((question, index) => (
                  <label
                    key={question}
                    className={`${index === 0 ? "sm:col-span-2" : ""} block rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10`}
                  >
                    <span className="flex items-start gap-2 text-xs font-black leading-5 text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                        {index + 1}
                      </span>
                      {question}
                    </span>
                    <textarea
                      value={briefAnswers[index] || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBriefAnswers((current) => {
                          const next = [...current];
                          next[index] = value;
                          return next;
                        });
                      }}
                      rows={2}
                      placeholder="Type or edit this answer..."
                      className="mt-2 min-h-16 w-full resize-none bg-transparent text-sm font-semibold leading-5 text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                  </label>
                ))}
              </div>

              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              {loading && statusText && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {statusText}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-white/70 px-5 py-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to questions
                </button>
                <button
                  type="button"
                  onClick={saveVoicePersonality}
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Yeti...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Save and get embed code
                    </>
                  )}
                </button>
              </div>
            </section>
          </StepShell>
        </div>
      </main>
      </>
    );
  }

  // Step 1 gets its own full-page layout
  if (step === 1) {
    return (
      <>
      {nav}
      <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 pb-5 pt-24">
        <div className="w-full max-w-[560px] mx-auto">
          <StepShell step={1}>
            <Stepper step={step} />

            <div className="flex min-h-[calc(100dvh-112px)] flex-col items-center justify-start pt-3 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                {currentBriefQuestionIndex + 1}/{briefQuestions.length}
              </p>
              <h1 className="mt-2 w-full max-w-[760px] text-balance text-xl font-black leading-tight tracking-[-0.04em] text-foreground sm:text-2xl">
                {currentBriefQuestion}
              </h1>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                {briefQuestions.map((question, index) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => setCurrentBriefQuestionIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentBriefQuestionIndex
                        ? "w-8 bg-primary"
                        : index < currentBriefQuestionIndex
                          ? "w-3 bg-primary/50"
                          : "w-3 bg-muted"
                    }`}
                    aria-label={`Show question ${index + 1}`}
                  />
                ))}
              </div>

              <div className="relative mt-8 flex items-center justify-center">
                <div className="absolute h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
                <img
                  src={yeti}
                  alt="Yeti mascot"
                  className="relative z-10 w-[132px] select-none drop-shadow-[0_20px_24px_rgba(15,23,42,0.14)] sm:w-[160px]"
                />
              </div>

              <h1 className="sr-only">Tell Yeti about your business</h1>

              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? "Stop recording business details" : "Start recording business details"}
                className={`mt-6 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-foreground/90 shadow-[0_16px_38px_-22px_rgba(15,23,42,0.6)] transition-all duration-300 ${
                  listening
                    ? "bg-red-500 text-white ring-8 ring-red-500/10 hover:bg-red-600"
                    : "bg-primary text-primary-foreground ring-8 ring-primary/15 hover:scale-[1.03] hover:bg-primary/90"
                }`}
              >
                {listening ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
              </button>

              <p className="mt-3 text-xs font-medium text-foreground/80">
                {listening ? "Listening..." : "Tap the mic to answer"}
              </p>
              {currentBriefAnswer && (
                <p className="mt-1 max-w-md truncate text-xs font-semibold text-primary">
                  Answer saved
                </p>
              )}

              {!speechSupported && (
                <div className="mt-4 max-w-sm text-sm text-amber-700">
                  Your browser does not support live speech recognition. Try Chrome, Edge, or Safari with microphone access.
                </div>
              )}

              {error && (
                <div className="mt-6 text-sm text-red-600">
                  {error}
                </div>
              )}

              {loading && statusText && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {statusText}
                </div>
              )}

              <div className="mt-5 flex w-full gap-3">
                <button
                  onClick={() => {
                    stopListening();
                    setError("");
                    setStep(0);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-white/70 px-5 py-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={goToNextBriefQuestion}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-medium py-3 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {currentBriefQuestionIndex === briefQuestions.length - 1 ? "Review answers" : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </StepShell>
        </div>
      </main>
      </>
    );
  }

  return (
    <>
    {nav}
    <main className="min-h-screen bg-background flex items-center justify-center px-4 pb-10 pt-28">
      <div className="w-full max-w-[560px]">
        <div className="bg-card rounded-3xl shadow-[0_20px_60px_-20px_rgba(80,40,160,0.25)] p-8 sm:p-12 border border-border/40">
          <Stepper step={step} />

          {step === 0 && (
            <StepShell step={0}>
              <Mascot />
              <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-center">
                Let's set up your Yeti
              </h1>
              <p className="mt-3 text-sm text-muted-foreground text-center">
                Enter your business name and website — Yeti will learn everything about it.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Business Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SnowPeak Gear Co."
                    className="w-full rounded-xl bg-muted/50 border border-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Website URL</label>
                  <input
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full rounded-xl bg-muted/50 border border-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {loading && statusText && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {statusText}
                </div>
              )}

              <button
                disabled={!canContinue || loading}
                onClick={() => void continueToVoice()}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium py-3.5 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Checking plan..." : "Continue"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              {isGeneratingQuestions && <QuestionLoadingGame />}
              {showLuckySpin && (
                <LuckySpinPopup
                  spinning={spinLoading}
                  reward={spinReward}
                  message="Your account has 0 credits. Spin once and see what Yeti gives you."
                  onSpin={() => void spinForCredits()}
                  onClose={() => {
                    setShowLuckySpin(false);
                    setSpinReward(null);
                  }}
                />
              )}
            </StepShell>
          )}

          {/* step 2 is handled above */}
        </div>
      </div>
    </main>
    </>
  );
}
