export function HeroWidget() {
  return (
    <div id="hero-demo" className="relative mx-auto flex w-full max-w-[640px] flex-col items-center justify-center text-center lg:translate-x-8 lg:-translate-y-8">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--color-secondary) 0%, transparent 65%)",
        }}
      />
      <iframe
        title="Yeti Guide voice demo"
        src="https://ai-mascot-on-websites.vercel.app/widget/index.html?demo=1&large=1&embed=1"
        allow="microphone"
        className="relative h-[680px] w-full max-w-[640px] border-0 bg-transparent"
      />
    </div>
  );
}
