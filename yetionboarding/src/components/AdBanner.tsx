import { useEffect, useRef } from "react";

type AdBannerProps = {
  slot?: string;
  format?: string;
  className?: string;
  label?: string;
};

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdBanner({
  slot,
  format = "auto",
  className = "",
  label = "Sponsored",
}: AdBannerProps) {
  const pushed = useRef(false);
  const client = import.meta.env.VITE_ADSENSE_CLIENT || "ca-pub-2098929307010637";
  const adSlot = slot || import.meta.env.VITE_ADSENSE_SLOT;

  useEffect(() => {
    if (!client || !adSlot || pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      pushed.current = false;
    }
  }, [adSlot, client]);

  if (!client || !adSlot) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <ins
        className="adsbygoogle block min-h-[90px] w-full overflow-hidden rounded-2xl bg-muted/30"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
