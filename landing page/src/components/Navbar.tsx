import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import yeti from "@/assets/yeti-mascot.png";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#problem", label: "Problem" },
  { href: "#voice", label: "Voice" },
  { href: "#mission", label: "Mission" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-3xl">
        <nav
          className={`flex items-center justify-between gap-4 px-2 py-2 rounded-full transition-all duration-300 ${
            scrolled
              ? "glass shadow-soft"
              : "bg-white/40 backdrop-blur-md border border-white/50"
          }`}
          style={{ WebkitBackdropFilter: "blur(20px)" }}
        >
          <a href="#" className="flex items-center gap-2 pl-3 shrink-0">
            <span className="w-8 h-8 rounded-full bg-primary/10 grid place-items-center overflow-hidden">
              <img src={yeti} alt="" className="w-6 h-6 object-contain" />
            </span>
            <span className="font-extrabold text-foreground text-sm tracking-tight hidden sm:block">
              Yeti Guide
            </span>
          </a>

          <ul className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-2 shrink-0 pr-1">
            <a
              href="#hero-demo"
              className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              See Demo
            </a>
            <a
              href="#cta"
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-95 shadow-soft transition-all hover:shadow-glow"
            >
              Create Your Yeti
            </a>
          </div>

          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-9 h-9 grid place-items-center rounded-full bg-muted/60"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
      </header>

      {open && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm rounded-3xl glass shadow-lift p-5 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="h-px bg-border my-1" />
            <a
              href="#hero-demo"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              See Demo
            </a>
            <a
              href="#cta"
              onClick={() => setOpen(false)}
              className="mt-1 px-4 py-3 rounded-2xl text-center text-sm font-semibold bg-primary text-primary-foreground"
            >
              Create Your Yeti
            </a>
          </div>
        </div>
      )}
    </>
  );
}
