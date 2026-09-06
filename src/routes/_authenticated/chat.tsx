import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SendHorizonal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { TopNav } from "@/components/app/TopNav";
import { DealPanel } from "@/components/chat/DealPanel";
import { MessageStream } from "@/components/chat/MessageStream";
import { OrderModal } from "@/components/chat/OrderModal";
import { activeOfferFor, useLiveCatalog } from "@/hooks/useLiveCatalog";
import {
  loadSession,
  selectProduct,
  sendMessage,
  startSession,
  type DealState,
} from "@/lib/agents.functions";
import { placeOrder, type PlacedOrder } from "@/lib/orders.functions";
import type { ChatMessage, RankedProduct } from "@/types";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Negotiate a Deal — DealMate" },
      {
        name: "description",
        content:
          "Chat with DealMate's agents to find running shoes or earbuds and negotiate a live price before you order.",
      },
      { property: "og:title", content: "Negotiate a Deal — DealMate" },
      {
        property: "og:description",
        content: "Find your match and negotiate a live price with DealMate's shopping agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

const SESSION_KEY = "dealmate.session";

function ChatPage() {
  const { products, offers } = useLiveCatalog();
  const start = useServerFn(startSession);
  const load = useServerFn(loadSession);
  const send = useServerFn(sendMessage);
  const pick = useServerFn(selectProduct);
  const order = useServerFn(placeOrder);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [matches, setMatches] = useState<RankedProduct[] | null>(null);
  const [deal, setDeal] = useState<DealState | null>(null);
  const [stage, setStage] = useState<string>("preferences");
  const [thinking, setThinking] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [text, setText] = useState("");

  const [orderOpen, setOrderOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const boot = async () => {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const res = await load({ data: { sessionId: stored } });
          setSessionId(res.session.id);
          setMessages(res.messages);
          setMatches(res.matches);
          setDeal(res.deal);
          setStage(res.session.stage);
          return;
        } catch {
          window.localStorage.removeItem(SESSION_KEY);
        }
      }
      try {
        const res = await start({ data: undefined });
        window.localStorage.setItem(SESSION_KEY, res.sessionId);
        const fresh = await load({ data: { sessionId: res.sessionId } });
        setSessionId(fresh.session.id);
        setMessages(fresh.messages);
      } catch {
        toast.error("We couldn't start a conversation. Please refresh.");
      }
    };

    void boot();
  }, [load, start]);

  const submit = useCallback(async () => {
    const value = text.trim();
    if (!value || !sessionId || thinking) return;
    setText("");
    setThinking(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        agent: null,
        content: value,
        created_at: new Date().toISOString(),
      },
    ]);
    try {
      const res = await send({ data: { sessionId, text: value } });
      setMessages((prev) => [...prev, ...res.messages]);
      setMatches(res.matches);
      setDeal(res.deal);
      setStage(res.stage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't go through.");
    } finally {
      setThinking(false);
    }
  }, [send, sessionId, text, thinking]);

  const onSelect = useCallback(
    async (productId: string) => {
      if (!sessionId || switching) return;
      setSwitching(true);
      try {
        const res = await pick({ data: { sessionId, productId } });
        setMessages((prev) => [...prev, ...res.messages]);
        setMatches(res.matches ?? matches);
        setDeal(res.deal);
        setStage(res.stage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't switch product.");
      } finally {
        setSwitching(false);
      }
    },
    [matches, pick, sessionId, switching],
  );

  const dealProduct = deal ? (products.find((p) => p.id === deal.product_id) ?? null) : null;

  const confirmOrder = useCallback(
    async (input: { quantity: number; address: string }) => {
      if (!sessionId || !deal) return;
      setPlacing(true);
      setOrderError(null);
      try {
        const result = await order({
          data: {
            sessionId,
            productId: deal.product_id,
            quantity: input.quantity,
            deliveryAddress: input.address,
          },
        });
        setPlaced(result);
        setStage("ordered");
      } catch (error) {
        setOrderError(error instanceof Error ? error.message : "We couldn't place that order.");
      } finally {
        setPlacing(false);
      }
    },
    [deal, order, sessionId],
  );

  const liveOffer = deal ? activeOfferFor(offers, deal.product_id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav status={`STAGE · ${stage.toUpperCase()}${liveOffer ? " · LIVE DEAL" : ""}`} />

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
        <section className="flex min-h-[60vh] flex-col">
          <h1 className="sr-only">Negotiate a deal with DealMate</h1>
          <MessageStream messages={messages} thinking={thinking} />

          <form
            className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background/90 p-3 backdrop-blur sm:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell the agent what you're shopping for…"
              aria-label="Message"
              className="h-11 flex-1 rounded-lg border border-border bg-panel px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              disabled={thinking || !text.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
            >
              <SendHorizonal className="size-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>

        <DealPanel
          products={products}
          offers={offers}
          matches={matches}
          deal={deal}
          switching={switching}
          onSelect={(id) => void onSelect(id)}
          onOrder={() => {
            setPlaced(null);
            setOrderError(null);
            setOrderOpen(true);
          }}
        />
      </div>

      {orderOpen && deal && dealProduct ? (
        <OrderModal
          product={dealProduct}
          unitPrice={deal.price}
          placing={placing}
          placed={placed}
          error={orderError}
          onClose={() => setOrderOpen(false)}
          onConfirm={(input) => void confirmOrder(input)}
        />
      ) : null}
    </div>
  );
}
