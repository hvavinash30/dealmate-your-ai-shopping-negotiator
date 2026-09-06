import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

import { OfferCountdown } from "@/components/chat/OfferCountdown";
import { activeOfferFor } from "@/hooks/useLiveCatalog";
import type { DealState } from "@/lib/agents.functions";
import { discountPct, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LiveOffer, Product, RankedProduct } from "@/types";

interface DealPanelProps {
  products: Product[];
  offers: LiveOffer[];
  matches: RankedProduct[] | null;
  deal: DealState | null;
  switching: boolean;
  onSelect: (productId: string) => void;
  onOrder: () => void;
}

export function DealPanel({
  products,
  offers,
  matches,
  deal,
  switching,
  onSelect,
  onOrder,
}: DealPanelProps) {
  const live = (id: string) => products.find((p) => p.id === id) ?? null;
  const dealProduct = deal ? live(deal.product_id) : null;
  const saving = deal ? deal.list_price - deal.price : 0;

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto border-border bg-surface p-4 sm:p-5 lg:border-l">
      <div>
        <p className="label-mono text-muted-foreground">DEAL WORKSPACE</p>
        {!deal ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Tell the Preference Agent what you're after. Matches and the live price appear here.
          </p>
        ) : null}
      </div>

      {deal && dealProduct ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-panel p-4 shadow-gold"
        >
          <div className="flex items-center gap-3">
            <img
              src={dealProduct.image_url}
              alt={dealProduct.name}
              className="size-16 rounded-lg object-cover"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{dealProduct.name}</p>
              <p className="label-mono mt-1 text-muted-foreground">
                {dealProduct.stock_count > 0
                  ? `${dealProduct.stock_count} IN STOCK`
                  : "OUT OF STOCK"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-sm text-muted-foreground line-through">
              {formatINR(deal.list_price)}
            </span>
            <motion.span
              key={deal.price}
              initial={{ scale: 0.94, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-3xl font-bold text-primary"
            >
              {formatINR(deal.price)}
            </motion.span>
          </div>
          {saving > 0 ? (
            <p className="label-mono mt-1 text-sage">
              YOU SAVE {formatINR(saving)} · {discountPct(deal.list_price, deal.price)}% OFF
            </p>
          ) : null}

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-sage" />
            {deal.at_floor ? "Seller's floor reached — DEAL SECURED" : "Within seller deal rules"}
          </p>

          <button
            type="button"
            onClick={onOrder}
            disabled={dealProduct.stock_count < 1}
            className="mt-4 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {dealProduct.stock_count < 1 ? "Out of stock" : "Order at this price"}
          </button>
        </motion.div>
      ) : null}

      {matches && matches.length > 0 ? (
        <div>
          <p className="label-mono text-muted-foreground">TOP MATCHES</p>
          <div className="mt-3 space-y-3">
            {matches.map((match) => {
              const product = live(match.id) ?? match;
              const offer = activeOfferFor(offers, match.id);
              const selected = deal?.product_id === match.id;

              return (
                <button
                  key={match.id}
                  type="button"
                  disabled={switching || selected}
                  onClick={() => onSelect(match.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-panel"
                      : "border-border bg-panel hover:bg-elevated",
                  )}
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-12 shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatINR(product.price)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {offer ? <OfferCountdown expiresAt={offer.expires_at} /> : null}
                      <span className="label-mono text-muted-foreground">
                        {product.stock_count} LEFT
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
