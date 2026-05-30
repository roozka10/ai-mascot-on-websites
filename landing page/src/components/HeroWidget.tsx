import { useState } from "react";
import yeti from "@/assets/yeti-mascot.png";
import { Mic, Volume2, Sparkles } from "lucide-react";

const replies = [
  {
    question: "What does this site do?",
    answer:
      "Yeti scans your website, learns the important pages, and gives visitors quick spoken help.",
  },
  {
    question: "How do I install it?",
    answer:
      "Copy one script into your website footer, or ask Cursor, Claude Code, or Codex to add it for you.",
  },
  {
    question: "Why is voice better?",
    answer:
      "Because people would rather ask out loud than wrestle with another tiny chatbot box.",
  },
];

export function HeroWidget() {
  const [active, setActive] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const playReply = (index = active) => {
    const reply = replies[index];
    setActive(index);
    setSpeaking(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reply.answer);
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

        <div className="space-y-3">
          <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm font-semibold leading-relaxed text-primary-foreground shadow-soft">
            {replies[active].question}
          </div>
          <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 shadow-soft">
            <p className="text-sm font-semibold leading-relaxed text-foreground">
              {replies[active].answer}
            </p>
          </div>
        </div>

        {/* Mascot */}
        <div className="relative grid place-items-center py-4">
          <img
            src={yeti}
            alt="Yeti mascot"
            className="w-40 h-40 object-contain yeti-float drop-shadow-xl"
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
            onClick={() => playReply(active)}
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

        <div className="mt-6 grid gap-2">
          {replies.map((reply, index) => (
            <button
              key={reply.question}
              type="button"
              onClick={() => playReply(index)}
              className={`cursor-pointer rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-primary/20 ${
                active === index
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-white/70 text-foreground hover:bg-white"
              }`}
            >
              Ask: {reply.question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
