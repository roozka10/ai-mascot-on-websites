import { useEffect, useRef, useState } from "react";
import { Check, Keyboard, Mail, Mic, Sparkles, Square, X } from "lucide-react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type InputMode = "voice" | "text";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>("voice");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [listening, setListening] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechSupported =
    typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!open || !isSupabaseConfigured) return;

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      setAccountEmail(session?.user?.email || "");
      setContactEmail((current) => current || session?.user?.email || "");
    });

    return () => {
      active = false;
    };
  }, [open]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const startListening = () => {
    setError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Mic recording is not supported in this browser. Type it instead.");
      setMode("text");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) setMessage(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Mic stopped. You can try again or type it.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const submit = () => {
    const cleanMessage = message.trim();
    const cleanEmail = (accountEmail || contactEmail).trim();
    if (cleanMessage.length < 5) {
      setError("Tell us a little more about what you want added or changed.");
      return;
    }
    if (!cleanEmail) {
      setError("Add your email so we can reply when this feature is ready.");
      return;
    }

    setError("");
    stopListening();

    const subject = encodeURIComponent(`Yeti feature request from ${cleanEmail}`);
    const body = encodeURIComponent(
      [
        "New Yeti feature request",
        "",
        `Account email: ${accountEmail || "Not signed in"}`,
        `Reply email: ${cleanEmail}`,
        `Input mode: ${mode}`,
        `Page: ${window.location.href}`,
        "",
        "Request:",
        cleanMessage,
      ].join("\n"),
    );

    window.location.href = `mailto:aroozka@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
    setMessage("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSent(false);
          setError("");
        }}
        className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/95 px-4 py-3 text-sm font-black text-foreground shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-white sm:bottom-6 sm:left-6"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Suggest a feature
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/25 px-4 py-6 backdrop-blur-sm">
          <section className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-5 text-center shadow-[0_30px_90px_-42px_rgba(15,23,42,0.65)] sm:p-6">
            <button
              type="button"
              onClick={() => {
                stopListening();
                setOpen(false);
              }}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              aria-label="Close feature request"
            >
              <X className="h-4 w-4" />
            </button>

            {sent ? (
              <div className="py-7">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.05em] text-foreground">
                  Feature request sent
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Your email app opened with everything filled in. Send it there so we can reply when it ships.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  Help improve Yeti
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground">
                  What should we add or change?
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Use the mic or type your idea. We will open your email app with everything ready.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setMode("voice")}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      mode === "voice" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    Mic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      setMode("text");
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      mode === "text" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Keyboard className="h-4 w-4" />
                    Text
                  </button>
                </div>

                {mode === "voice" ? (
                  <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4">
                    <button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      className={`mx-auto grid h-20 w-20 place-items-center rounded-full border-[3px] border-foreground/90 transition ${
                        listening
                          ? "bg-red-500 text-white ring-8 ring-red-500/10"
                          : "bg-primary text-primary-foreground ring-8 ring-primary/15 hover:scale-[1.03]"
                      }`}
                    >
                      {listening ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
                    </button>
                    <p className="mt-3 text-xs font-bold text-muted-foreground">
                      {listening ? "Listening..." : speechSupported ? "Tap the mic and say your idea" : "Mic not supported here"}
                    </p>
                  </div>
                ) : null}

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  placeholder="Example: Add a way for Yeti to collect leads and send them to my email."
                  className="mt-4 w-full resize-none rounded-[1.25rem] border border-border/70 bg-white px-4 py-3 text-sm font-semibold leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/55 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />

                {!accountEmail && (
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    type="email"
                    placeholder="Your email so we can reply"
                    className="mt-3 w-full rounded-full border border-border/70 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/55 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                )}

                <p className="mt-3 text-xs font-semibold text-muted-foreground">
                  Sending from: <span className="text-foreground">{accountEmail || contactEmail || "Add your email"}</span>
                </p>
                {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}

                <button
                  type="button"
                  onClick={submit}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  <Mail className="h-4 w-4" />
                  Open email to send
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
