import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/format";

/** Live countdown rendered straight from the offer's stored expiry. */
export function OfferCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => Date.parse(expiresAt) - Date.now());

  useEffect(() => {
    const tick = () => setRemaining(Date.parse(expiresAt) - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="label-mono text-muted-foreground">EXPIRED</span>;

  return (
    <span className="label-mono text-coral">ENDS IN {formatCountdown(remaining)}</span>
  );
}
