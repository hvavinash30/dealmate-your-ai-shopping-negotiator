import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { TopNav } from "@/components/app/TopNav";
import { OfferCountdown } from "@/components/chat/OfferCountdown";
import {
  claimSellerAccess,
  getSellerData,
  getSellerStatus,
  setOfferActive,
  updateStock,
  upsertOffer,
} from "@/lib/admin.functions";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/seller")({
  head: () => ({
    meta: [
      { title: "Seller Dashboard — DealMate" },
      {
        name: "description",
        content: "Manage DealMate stock levels, launch timed discounts and review incoming orders.",
      },
      { property: "og:title", content: "Seller Dashboard — DealMate" },
      {
        property: "og:description",
        content: "Stock, timed discounts and order flow for DealMate sellers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellerPage,
});

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number | string;
  stock_count: number;
}
interface OfferRow {
  id: string;
  product_id: string;
  discount_pct: number | string;
  expires_at: string;
  active: boolean;
}
interface OrderRow {
  id: string;
  quantity: number;
  negotiated_price: number | string;
  status: string;
  created_at: string;
  products: { name: string } | null;
}

function SellerPage() {
  const status = useServerFn(getSellerStatus);
  const claim = useServerFn(claimSellerAccess);
  const data = useServerFn(getSellerData);
  const stockFn = useServerFn(updateStock);
  const offerFn = useServerFn(upsertOffer);
  const toggleFn = useServerFn(setOfferActive);
  const qc = useQueryClient();

  const [code, setCode] = useState("");

  const access = useQuery({
    queryKey: ["seller-status"],
    queryFn: () => status({ data: undefined }),
  });

  const dashboard = useQuery({
    queryKey: ["seller-data"],
    enabled: access.data?.isSeller === true,
    queryFn: () => data({ data: undefined }) as Promise<unknown>,
  });

  const board = dashboard.data as
    | { products: ProductRow[]; offers: OfferRow[]; orders: OrderRow[] }
    | undefined;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["seller-data"] });
  };

  if (access.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav status="SELLER" />
        <p className="label-mono px-4 py-10 text-center text-muted-foreground">
          CHECKING SELLER ACCESS…
        </p>
      </div>
    );
  }

  if (!access.data?.isSeller) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav status="SELLER" />
        <main className="mx-auto w-full max-w-md px-4 py-16">
          <h1 className="font-display text-2xl font-bold">Seller access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the access code your DealMate contact gave you.
          </p>
          <form
            className="mt-6 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await claim({ data: { code } });
                toast.success("Seller access granted.");
                await access.refetch();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "That code didn't work.");
              }
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              aria-label="Seller access code"
              className="h-11 w-full rounded-lg border border-border bg-panel px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-background"
            >
              Unlock dashboard
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav status="SELLER DASHBOARD" />
      <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10">
        <section>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Stock &amp; deals</h1>
          <div className="mt-5 space-y-3">
            {(board?.products ?? []).map((p) => {
              const offer = (board?.offers ?? []).find(
                (o) => o.product_id === p.id && o.active && Date.parse(o.expires_at) > Date.now(),
              );
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-panel p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{p.name}</p>
                    <p className="label-mono mt-1 text-muted-foreground">
                      {p.category.toUpperCase()} · {formatINR(Number(p.price))}
                    </p>
                    {offer ? (
                      <p className="label-mono mt-1 text-sage">
                        {Number(offer.discount_pct)}% OFF ·{" "}
                        <OfferCountdown expiresAt={offer.expires_at} />
                      </p>
                    ) : null}
                  </div>

                  <label className="label-mono flex items-center gap-2 text-muted-foreground">
                    STOCK
                    <input
                      type="number"
                      min={0}
                      max={999}
                      defaultValue={p.stock_count}
                      aria-label={`Stock for ${p.name}`}
                      onBlur={async (e) => {
                        const next = Number(e.target.value);
                        if (next === p.stock_count || Number.isNaN(next)) return;
                        try {
                          await stockFn({ data: { productId: p.id, stock: next } });
                          toast.success("Stock updated.");
                          refresh();
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Couldn't update stock.",
                          );
                        }
                      }}
                      className="h-9 w-20 rounded-md border border-border bg-elevated px-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>

                  {offer ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleFn({ data: { offerId: offer.id, active: false } });
                        toast.success("Deal stopped.");
                        refresh();
                      }}
                      className="h-9 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
                    >
                      Stop deal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await offerFn({
                            data: {
                              productId: p.id,
                              discountPct: 10,
                              minutes: 30,
                              active: true,
                            },
                          });
                          toast.success("30-minute deal launched.");
                          refresh();
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Couldn't start the deal.",
                          );
                        }
                      }}
                      className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-background"
                    >
                      Run 10% / 30 min
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Recent orders</h2>
          {(board?.orders ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(board?.orders ?? []).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel px-4 py-3"
                >
                  <span className="truncate text-sm">{o.products?.name ?? "Product"}</span>
                  <span className="label-mono text-muted-foreground">
                    QTY {o.quantity} · {formatINR(Number(o.negotiated_price))} ·{" "}
                    {o.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
