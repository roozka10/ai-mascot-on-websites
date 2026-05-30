import { useState } from "react";
import yeti from "@/assets/yeti-mascot.png";
import { Loader2, Mic } from "lucide-react";

export function HeroWidget() {
  const demoStorageKey = "yeti-guide-landing-demo-used";
  const [played, setPlayed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(demoStorageKey) === "true";
  });
  const [listening, setListening] = useState(false);
  const [label, setLabel] = useState("Tap the mic and ask one question about Yeti Guide.");

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.03;
      utterance.pitch = 1.08;
      window.speechSynthesis.speak(utterance);
    }
  };

  const askDemoAi = async (question: string) => {
    window.localStorage.setItem(demoStorageKey, "true");
    setPlayed(true);
    setLabel("Thinking...");

    try {
      const response = await fetch("https://ai-mascot-on-websites.vercel.app/api/yeti-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      const reply =
        data?.reply ||
        "Yeti Guide scans your website and gives visitors short spoken answers.";
      setLabel("Demo used. Create your Yeti to try it on your own site.");
      speak(reply);
    } catch {
      const fallback =
        "Yeti Guide scans your website and gives visitors short spoken answers.";
      setLabel("Demo used. Create your Yeti to try it on your own site.");
      speak(fallback);
    }
  };

  const playReply = () => {
    if (played) {
      setLabel("Demo already used on this browser. Create your Yeti to try the real guide.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      void askDemoAi("What can Yeti Guide do?");
      return;
    }

    setListening(true);
    setLabel("Listening... ask anything about Yeti Guide.");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        void askDemoAi(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setLabel("I could not hear that. Tap once and ask about Yeti Guide.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  return (
    <div id="hero-demo" className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center text-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--color-secondary) 0%, transparent 65%)",
        }}
      />
      <div className="relative">
        <div className="relative grid place-items-center">
          <img
            src={yeti}
            alt="Yeti mascot"
            className="h-64 w-64 object-contain yeti-float drop-shadow-xl sm:h-72 sm:w-72"
          />
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-end gap-1 h-8">
            {[0, 0.15, 0.3, 0.45, 0.6].map((d, i) => (
              <span
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={playReply}
            aria-label="Speak to Yeti"
            disabled={listening}
            className="w-14 h-14 cursor-pointer rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow pulse-glow transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25 disabled:cursor-wait disabled:opacity-80"
          >
            {listening ? <Loader2 className="animate-spin" size={22} /> : <Mic size={22} />}
          </button>
          <div className="flex items-end gap-1 h-8">
            {[0.6, 0.45, 0.3, 0.15, 0].map((d, i) => (
              <span
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
        </div>
        <p className="mx-auto mt-5 max-w-xs text-center text-sm font-semibold leading-relaxed text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}
