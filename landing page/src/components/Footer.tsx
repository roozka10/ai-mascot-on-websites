import yeti from "@/assets/yeti-mascot.png";

export function Footer() {
  const cols = [
    { title: "Product", links: ["Voice guide", "Website scan", "One-script embed"] },
    { title: "Install", links: ["Footer script", "Cursor setup", "Claude Code setup"] },
    { title: "Company", links: ["Mission", "Contact", "Updates"] },
  ];
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-primary/10 grid place-items-center overflow-hidden">
                <img src={yeti} alt="" className="w-7 h-7 object-contain" />
              </span>
              <span className="font-extrabold tracking-tight">Yeti Guide</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              A website guide people actually want to talk to.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-bold text-foreground mb-4">{c.title}</h4>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t border-border text-xs text-muted-foreground">
          © 2026 Yeti Guide. Built for people who hate chatbots.
        </div>
      </div>
    </footer>
  );
}
