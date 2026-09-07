import { useState } from "react";
import { CheckCircle2, Circle, History, RefreshCcw, ShieldCheck } from "lucide-react";

import { formatINR } from "@/lib/format";
import type { QuantityDealState } from "@/lib/quantity-negotiation.functions";
import type { NegotiationMode } from "@/lib/bulk-negotiation.server";
import { cn } from "@/lib/utils";

const MODES: { id: NegotiationMode; label: string; hint: string }[] = [
  { id: "best_price", label: "Best Price", hint: "Lowest per-unit price" },
  { id: "bulk_deal", label: "Bulk Discount", hint: "Best bulk-tier savings" },
  { id: "max_quantity", label: "Max Quantity", hint: "Most units within budget" },
  { id: "best_overall", label: "Best Overall", hint: "Best total value" },
];

interface QuantityDealPanelProps {
  quantityDeal: QuantityDealState | null;
  starting: boolean;
  acting: boolean;
  onStart: (mode: NegotiationMode) => void;
  onContinue: () => void;
  onAccept: () => void;
  onTryAnotherSeller: () => void;
}

export function QuantityDealPanel({
  quantityDeal,
  starting,
  acting,
  onStart,
  onContinue,
  onAccept,
  onTryAnotherSeller,
}: QuantityDealPanelProps) {
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (!quantityDeal) {
    return (
      <div className="rounded-xl border border-border bg-panel p-4">
        <p className="label-mono text-muted-foreground">QUANTITY & BULK DEAL</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Negotiate quantity, bulk discount and shipping on top of your price deal.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={starting}
              onClick={() => onStart(m.id)}
              className="rounded-md border border-border bg-surface p-2.5 text-left text-xs transition-colors hover:bg-elevated disabled:opacity-50"
            >
              <span className="block font-medium text-foreground">{m.label}</span>
              <span className="block text-muted-foreground">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const deal = quantityDeal.projectedDeal ?? quantityDeal.finalDeal;
  const priceCompleted = true; // stage-1 must be done before this panel exists
  const quantityCompleted =
    quantityDeal.state === "final_offer" ||
    quantityDeal.state === "deal_accepted" ||
    quantityDeal.state === "walked_away" ||
    quantityDeal.state === "rejected";
  const dealAccepted = quantityDeal.state === "deal_accepted";
  const canContinue = quantityDeal.canContinue && quantityDeal.state === "quantity_negotiating";

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <p className="label-mono text-muted-foreground">QUANTITY & BULK DEAL</p>

      {deal ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="label-mono text-muted-foreground">TOTAL SAVINGS</dt>
            <dd className="font-semibold text-sage">{formatINR(deal.total_savings)}</dd>
          </div>
          <div>
            <dt className="label-mono text-muted-foreground">EFFECTIVE UNIT PRICE</dt>
            <dd className="font-semibold text-foreground">{formatINR(deal.effective_unit_price)}</dd>
          </div>
          <div>
            <dt className="label-mono text-muted-foreground">DISCOUNT</dt>
            <dd className="font-semibold text-primary">{deal.discount_pct}%</dd>
          </div>
          <div>
            <dt className="label-mono text-muted-foreground">QUANTITY</dt>
            <dd className="font-semibold text-foreground">{deal.quantity}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {priceCompleted ? (
            <CheckCircle2 className="size-3.5 text-sage" />
          ) : (
            <Circle className="size-3.5 text-muted-foreground" />
          )}
          <span className={priceCompleted ? "text-foreground" : "text-muted-foreground"}>
            Price Negotiation {priceCompleted ? "✓ Completed" : "In progress"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {quantityCompleted ? (
            <CheckCircle2 className="size-3.5 text-sage" />
          ) : (
            <Circle className="size-3.5 text-muted-foreground" />
          )}
          <span className={quantityCompleted ? "text-foreground" : "text-muted-foreground"}>
            Quantity Negotiation {quantityCompleted ? "✓ Completed" : "In progress"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          <span>Total Negotiation Rounds: {quantityDeal.round}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={acting || dealAccepted || !quantityDeal.bestOffer}
          onClick={onAccept}
          className="h-10 rounded-md bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Accept Deal
        </button>
        <button
          type="button"
          disabled={acting || !canContinue}
          onClick={onContinue}
          title={!canContinue ? "No further negotiation round is possible" : undefined}
          className="h-10 rounded-md border border-border text-xs font-semibold transition-colors hover:bg-elevated disabled:opacity-50"
        >
          Continue Negotiating
        </button>
        <button
          type="button"
          disabled={acting || dealAccepted}
          onClick={onTryAnotherSeller}
          className="h-10 rounded-md border border-border text-xs font-semibold transition-colors hover:bg-elevated disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-1.5">
            <RefreshCcw className="size-3.5" /> Try Another Seller
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTimelineOpen(true)}
          className="h-10 rounded-md border border-border text-xs font-semibold transition-colors hover:bg-elevated"
        >
          <span className="inline-flex items-center gap-1.5">
            <History className="size-3.5" /> View Timeline
          </span>
        </button>
      </div>

      {timelineOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Negotiation Timeline</h3>
              <button
                type="button"
                onClick={() => setTimelineOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <ol className="mt-4 space-y-3">
              {quantityDeal.history.map((m, i) => (
                <li key={`${m.round}-${m.sender}-${i}`} className="text-sm">
                  <p
                    className={cn(
                      "label-mono",
                      m.sender === "buyer" ? "text-primary" : "text-coral",
                    )}
                  >
                    ROUND {m.round} · {m.sender === "buyer" ? "BUYER AGENT" : "SELLER AGENT"}
                  </p>
                  <p className="mt-1 text-foreground">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
