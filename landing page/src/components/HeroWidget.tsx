import { useState } from "react";
import yeti from "@/assets/yeti-mascot.png";
import { Mic, Volume2, Sparkles } from "lucide-react";

export function HeroWidget() {
  const [played, setPlayed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [label, setLabel] = useState("Tap once to hear what Yeti can do.");

  const playReply = () => {
    if (played) {
      setLabel("Create your Yeti to try the real voice guide on your own site.");
      return;
    }

    const answer =
      "Yeti can scan your website, learn the important pages, and answer visitors out loud with short helpful replies.";
    setPlayed(true);
    setLabel("Create your Yeti to try the real voice guide on your own site.");
    setSpeaking(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.rate = 1.03;
      utterance.pitch = 1.08;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    window.setTimeout(() => setSpeaking(false), 1400);
  };

  return (
    <div id="hero-demo" className="relative w-full max-w-md mx-auto">
      {/* Radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--color-secondary) 0%, transparent 65%)",
        }}
      />

      <div className="glass rounded-[2rem] p-6 sm:p-8 shadow-lift border border-white/70">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <Sparkles size={14} /> Live Yeti demo
          </span>
          <span className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent">
            Real voice preview
          </span>
        </div>

        {/* Mascot */}
        <div className="relative grid place-items-center py-6">
          <img
            src={yeti}
            alt="Yeti mascot"
            className="w-52 h-52 object-contain yeti-float drop-shadow-xl"
          />
        </div>

        {/* Mic + waveform */}
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
            className="w-14 h-14 cursor-pointer rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow pulse-glow transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25"
          >
            {speaking ? <Volume2 size={22} /> : <Mic size={22} />}
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
