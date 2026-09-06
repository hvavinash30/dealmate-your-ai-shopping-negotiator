import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, BadgePercent, Handshake, Search, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { formatINR } from "@/lib/format";
import { easeOut, fadeUp, stagger } from "@/lib/motion";

const SHOE_IMG = "/__l5e/assets-v1/591a029a-7232-44f4-a608-5d9da5a89646/shoe1.jpg";
const BUDS_IMG = "/__l5e/assets-v1/9d7b3ae8-ba54-4613-9ed2-d9b4de15f35d/buds1.jpg";

// Controlled demo conversation for the hero preview (not live data).
const DEMO_SCRIPT: Array<{ who: "you" | "agent"; label: string; text: string }> = [
  { who: "you", label: "YOU", text: "I need running shoes under ₹4,500. Good cushioning." },
  {
    who: "agent",
    label: "DEAL-HUNTER",
    text: "Found 3 matches. Best value: Stride Cloud Racer at ₹4,299 — 8% live deal.",
  },
  { who: "you", label: "YOU", text: "Can you do ₹3,800?" },
  {
    who: "agent",
    label: "NEGOTIATION AGENT",
    text: "₹3,800 is below what the seller allows. Best I can lock is ₹3,955.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DealMate — Shop smarter. Negotiate better." },
      {
        name: "description",
        content:
          "DealMate is an AI shopping agent that finds your product, then negotiates a better price within real seller limits.",
      },
      { property: "og:title", content: "DealMate — Shop smarter. Negotiate better." },
      {
        property: "og:description",
        content: "Tell DealMate what you want. Three AI agents find it and negotiate the price for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();
  const ctaTo = user ? "/chat" : "/auth";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size={32} />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link
              to="/orders"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Orders
            </Link>
          ) : null}
          <Link
            to={ctaTo}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            {loading ? "…" : user ? "Open chat" : "Sign in"}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.p variants={fadeUp} transition={easeOut} className="label-mono text-primary">
              THREE AGENTS · ONE BETTER PRICE
            </motion.p>
            <motion.h1
              variants={fadeUp}
              transition={easeOut}
              className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl"
            >
              Shop smarter. <span className="text-primary">Negotiate better.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={easeOut}
              className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground"
            >
              Tell DealMate what you're shopping for. A preference agent learns your needs, a
              deal-hunter ranks live offers, and a negotiation agent pushes the price down —
              always inside real seller limits.
            </motion.p>
            <motion.div variants={fadeUp} transition={easeOut} className="mt-8 flex flex-wrap gap-3">
              <Link
                to={ctaTo}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Start negotiating <ArrowRight className="size-4" />
              </Link>
              <p className="label-mono flex items-center text-muted-foreground">
                NO CARD NEEDED TO BROWSE
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="grain-panel rounded-2xl border border-border bg-panel p-5 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <p className="label-mono text-muted-foreground">LIVE NEGOTIATION PREVIEW</p>
              <span className="flex items-center gap-1.5 label-mono text-sage">
                <span className="size-1.5 animate-pulse rounded-full bg-sage" /> LIVE
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {DEMO_SCRIPT.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.7, duration: 0.4 }}
                  className={line.who === "you" ? "text-right" : ""}
                >
                  <p
                    className={
                      line.who === "you" ? "label-mono text-muted-foreground" : "label-mono text-primary"
                    }
                  >
                    {line.label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{line.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + DEMO_SCRIPT.length * 0.7, duration: 0.4 }}
              className="mt-5 flex items-center justify-between rounded-xl border border-border bg-elevated p-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src={SHOE_IMG}
                  alt="Stride Cloud Racer running shoe"
                  className="size-12 rounded-lg object-cover"
                  loading="lazy"
                />
                <div>
                  <p className="font-display text-sm font-semibold">Stride Cloud Racer</p>
                  <p className="label-mono mt-0.5 text-muted-foreground">
                    LIST {formatINR(4299)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-primary">{formatINR(3955)}</p>
                <p className="label-mono text-sage">DEAL LOCKED · SAVED {formatINR(344)}</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6">
            {[
              {
                icon: Search,
                title: "Tell it what you want",
                body: "Category, budget and must-haves. The preference agent turns that into a precise brief.",
              },
              {
                icon: BadgePercent,
                title: "Live deals, ranked",
                body: "The deal-hunter scores every product against your budget and the offers running right now.",
              },
              {
                icon: Handshake,
                title: "A price you negotiate",
                body: "Make an offer. The negotiation agent counters inside the seller's real floor — no fake discounts.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-panel p-6">
                <f.icon className="size-5 text-primary" />
                <h2 className="mt-4 font-display text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
            <div className="flex items-center gap-2 label-mono text-muted-foreground">
              <ShieldCheck className="size-4 text-sage" /> SELLER FLOORS ENFORCED SERVER-SIDE
            </div>
            <h2 className="max-w-xl font-display text-3xl font-bold leading-tight">
              Every price you see is one a seller actually agreed to.
            </h2>
            <img
              src={BUDS_IMG}
              alt="Vertex Latency Zero earbuds"
              className="size-24 rounded-2xl border border-border object-cover"
              loading="lazy"
            />
            <Link
              to={ctaTo}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Try your first negotiation <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <Logo size={24} />
          <p className="label-mono text-muted-foreground">© 2026 DEALMATE</p>
        </div>
      </footer>
    </div>
  );
}
