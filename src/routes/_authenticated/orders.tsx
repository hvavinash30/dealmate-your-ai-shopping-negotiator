import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { TopNav } from "@/components/app/TopNav";
import { formatDate, formatINR, orderRef } from "@/lib/format";
import { listOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Your Orders — DealMate" },
      {
        name: "description",
        content: "Every deal you've locked in with DealMate, with the price you negotiated.",
      },
      { property: "og:title", content: "Your Orders — DealMate" },
      {
        property: "og:description",
        content: "Review the deals you've closed and the prices you negotiated.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

interface OrderRow {
  id: string;
  quantity: number;
  negotiated_price: number | string;
  status: string;
  created_at: string;
  delivery_address: string;
  products: { name: string; image_url: string; category: string; price: number | string } | null;
}

function OrdersPage() {
  const fetchOrders = useServerFn(listOrders);
  const { data, isPending } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders({ data: undefined }) as Promise<unknown>,
  });

  const orders = (data ?? []) as unknown as OrderRow[];

  return (
    <div className="min-h-screen bg-background">
      <TopNav status="ORDER HISTORY" />

      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each line shows the price the negotiation agent settled on.
        </p>

        {isPending ? (
          <p className="label-mono mt-10 text-muted-foreground">LOADING YOUR ORDERS…</p>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-panel p-8 text-center">
            <Package className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No orders yet. Start a chat and negotiate your first deal.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {orders.map((o) => {
              const list = Number(o.products?.price ?? 0);
              const paid = Number(o.negotiated_price);
              return (
                <li
                  key={o.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-panel p-4"
                >
                  {o.products ? (
                    <img
                      src={o.products.image_url}
                      alt={o.products.name}
                      className="size-14 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">
                      {o.products?.name ?? "Product"}
                    </p>
                    <p className="label-mono mt-1 text-muted-foreground">
                      {orderRef(o.id)} · {formatDate(o.created_at)} · QTY {o.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-semibold text-primary">
                      {formatINR(paid * o.quantity)}
                    </p>
                    {list > paid ? (
                      <p className="label-mono mt-1 text-sage">
                        SAVED {formatINR((list - paid) * o.quantity)}
                      </p>
                    ) : null}
                    <p className="label-mono mt-1 text-muted-foreground">
                      {o.status.toUpperCase()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
