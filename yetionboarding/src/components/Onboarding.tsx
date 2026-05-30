import { useState, useCallback, useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, ArrowLeft, Sparkles, Check, Copy, ShieldCheck, Clock, Globe, Loader2, Mic, Square } from "lucide-react";
import yeti from "@/assets/yeti.png";
import {
  generateYetiId,
  getAuthRedirectUrl,
  isSupabaseConfigured,
  saveYetiConfig,
  supabase,
} from "@/lib/supabase";

const TOTAL = 3;

const WIDGET_HOST = "https://ai-mascot-on-websites.vercel.app";

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
    ? `\nOwner notes: ${transcript.trim().slice(0, 350)}`
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
- Do not output bracket commands like [navigate:/] or [scroll:#id]. Just speak naturally.`;
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

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
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

  const canContinue = name.trim().length > 0 && site.trim().length > 0;
  const liveTranscript = `${transcript}${transcript && interimTranscript ? " " : ""}${interimTranscript}`;

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
        setTranscript((current) => `${current} ${finalText.trim()}`.trim());
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
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

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

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not available in this browser. You can type the business details instead.");
      return;
    }

    setError("");
    setInterimTranscript("");
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

  const continueToVoice = () => {
    if (!name.trim() || !site.trim()) return;
    setError("");
    setStep(1);
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

      const scans = await scanWebsite(url, name, setStatusText);
      if (!scans.length && !transcript.trim()) {
        setError("Yeti could not scan this website. Add a short voice note or try the full https:// URL.");
        return;
      }

      const allPages = scans.map((scan) => scan.path).filter(Boolean).slice(0, 20);

      setStatusText("Saving your Yeti...");
      const voicePrompt = buildVoicePrompt({
        name,
        url,
        transcript,
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

      setStep(2);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }

    setLoading(false);
    setStatusText("");
  }, [name, site, transcript]);

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
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

  // Step 2 — horizontal layout
  if (step === 2) {
    const displaySnippet = `<!-- Yeti Guide Widget -->\n<script\n  src="${WIDGET_HOST}/widget.js"\n  data-yeti="${yetiId}"\n  async\n></script>`;

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-10">
        <div className="w-full max-w-[1040px] mx-auto">
          <StepShell step={2}>
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
                    onClick={() => setStep(1)}
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
    );
  }

  // Step 1 gets its own full-page layout
  if (step === 1) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 py-4 sm:py-6">
        <div className="w-full max-w-[640px] mx-auto">
          <StepShell step={1}>
            <Stepper step={step} />

            <div className="flex min-h-[calc(100dvh-96px)] flex-col items-center justify-center text-center">
              <div className="relative w-full max-w-[440px] rounded-[1.75rem] border-[3px] border-foreground/90 bg-white px-5 py-5 shadow-[0_18px_58px_-36px_rgba(15,23,42,0.45)] sm:px-8 sm:py-6">
                <textarea
                  value={liveTranscript}
                  onChange={(event) => {
                    setTranscript(event.target.value);
                    setInterimTranscript("");
                    setVoiceStarted(true);
                  }}
                  rows={3}
                  placeholder={
                    voiceStarted
                      ? ""
                      : "Optional: add tone, offers, prices, policies, or anything the website may not say clearly."
                  }
                  className="w-full resize-none bg-transparent text-center text-xl font-bold leading-7 tracking-[-0.035em] text-foreground placeholder:text-foreground outline-none sm:text-2xl sm:leading-8"
                />
                {!voiceStarted && !transcript && !interimTranscript && (
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Yeti will scan your website first. Voice notes are optional.
                  </p>
                )}
                <div className="absolute -bottom-[15px] left-1/2 h-8 w-8 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-foreground/90 bg-white" />
              </div>

              <div className="relative mt-7 flex items-center justify-center">
                <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
                <img
                  src={yeti}
                  alt="Yeti mascot"
                  className="relative z-10 w-[135px] select-none drop-shadow-[0_20px_24px_rgba(15,23,42,0.14)] sm:w-[165px]"
                />
              </div>

              <h1 className="sr-only">Tell Yeti about your business</h1>

              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? "Stop recording business details" : "Start recording business details"}
                className={`mt-7 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-foreground/90 shadow-[0_16px_38px_-22px_rgba(15,23,42,0.6)] transition-all duration-300 ${
                  listening
                    ? "bg-red-500 text-white ring-8 ring-red-500/10 hover:bg-red-600"
                    : "bg-primary text-primary-foreground ring-8 ring-primary/15 hover:scale-[1.03] hover:bg-primary/90"
                }`}
              >
                {listening ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
              </button>

              <p className="mt-3 text-xs font-medium text-foreground/80">
                {listening ? "Listening... speak naturally" : "Tap the mic to start"}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Yeti will crawl key pages and keep the saved AI prompt short. Use the mic only for extra details.
              </p>

              {!speechSupported && (
                <div className="mt-8 text-sm text-amber-700">
                  Your browser does not support live speech recognition. Type the business details below instead.
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

              <div className="mt-6 flex w-full gap-3">
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
                  onClick={saveVoicePersonality}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-medium py-3 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
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
            </div>
          </StepShell>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
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
                disabled={!canContinue}
                onClick={continueToVoice}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium py-3.5 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </StepShell>
          )}

          {/* step 2 is handled above */}
        </div>
      </div>
    </main>
  );
}
