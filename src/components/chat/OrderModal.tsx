import { motion } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import { useState } from "react";

import { formatINR, orderRef } from "@/lib/format";
import type { PlacedOrder } from "@/lib/orders.functions";
import { quick } from "@/lib/motion";
import type { Product } from "@/types";

interface OrderModalProps {
  product: Product;
  unitPrice: number;
  placing: boolean;
  placed: PlacedOrder | null;
  error: string | null;
  onClose: () => void;
  onConfirm: (input: { quantity: number; address: string }) => void;
}

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", hint: "Pay instantly with any UPI app" },
  { id: "card", label: "Card", hint: "Credit or debit card" },
  { id: "cod", label: "Cash on delivery", hint: "Pay when it arrives" },
] as const;

export function OrderModal({
  product,
  unitPrice,
  placing,
  placed,
  error,
  onClose,
  onConfirm,
}: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("upi");
  const paymentLabel =
    PAYMENT_METHODS.find((m) => m.id === payment)?.label ?? "UPI";
  const maxQty = Math.max(1, Math.min(10, product.stock_count));
  const total = unitPrice * quantity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={quick}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-panel p-6 shadow-lift sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="order-modal-title" className="text-lg font-bold">
            {placed ? "Deal locked in." : "Confirm your order"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {placed ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="label-mono text-primary">ORDER {orderRef(placed.id)}</p>
              <p className="mt-2 text-sm text-foreground">{product.name}</p>
              <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Quantity</dt>
                  <dd className="text-foreground">{placed.quantity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Negotiated price</dt>
                  <dd className="text-foreground">{formatINR(placed.negotiated_price)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Total paid</dt>
                  <dd className="font-semibold text-primary">
                    {formatINR(placed.negotiated_price * placed.quantity)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Payment</dt>
                  <dd className="text-foreground">{paymentLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Delivering to</dt>
                  <dd className="max-w-[60%] text-right text-foreground">
                    {placed.delivery_address}
                  </dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            className="mt-5 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm({ quantity, address: address.trim() });
            }}
          >
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <img
                src={product.image_url}
                alt={product.name}
                className="size-14 rounded-md object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="label-mono mt-1 text-muted-foreground">
                  {product.stock_count} IN STOCK
                </p>
              </div>
            </div>

            <div>
              <span className="label-mono text-muted-foreground">QUANTITY</span>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="grid size-10 place-items-center rounded-md border border-border transition-colors hover:bg-elevated"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-mono text-lg">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="grid size-10 place-items-center rounded-md border border-border transition-colors hover:bg-elevated"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="label-mono text-muted-foreground">
                DELIVERY ADDRESS
              </label>
              <textarea
                id="address"
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat, street, city, PIN code"
                className="mt-2 w-full resize-none rounded-md border border-border bg-surface p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Negotiated unit price</dt>
                <dd className="text-foreground">{formatINR(unitPrice)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="text-foreground">{formatINR(total)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-primary">{formatINR(total)}</dd>
              </div>
            </dl>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={placing || address.trim().length < 10}
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {placing ? "Placing your order…" : `Place order · ${formatINR(total)}`}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
