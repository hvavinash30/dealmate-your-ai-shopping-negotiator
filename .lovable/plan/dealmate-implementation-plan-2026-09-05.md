# DealMate — Implementation Plan

"Shop smarter. Negotiate better." An AI shopping agent that finds products and negotiates real, bounded prices.

## Two decisions worth flagging up front

1. **Routing**: this project runs on React + TypeScript + Vite with TanStack Router/Start (already wired). I'll use it instead of React Router — same React/TS/Vite stack, and it gives real server functions so LLM keys and seller discount limits never reach the browser.
2. **Server logic**: negotiation, order placement and AI calls run as server functions on this stack rather than separate Supabase Edge Functions. Same security guarantee (server-validated, keys server-side), fewer moving parts. Provider-specific AI code stays isolated in one file so it can be swapped.

Your uploaded DealMate logo becomes the app mark and favicon.

---

## PHASE 1 — Design system
Dark dealmaking palette (#15120E base, gold #E8A33D, sage #7FA88A, coral #E88C6B) as semantic tokens in `src/styles.css`; display + grotesk + mono type scale loaded in `__root.tsx`; reduced-motion support; logo asset + favicon.
Files: `src/styles.css`, `src/routes/__root.tsx`, `src/components/brand/Logo.tsx`, `public/favicon.png`.
Deps: `motion`, `sonner`, `zod`, `lucide-react`.

## PHASE 2 — Database + security
Enable Lovable Cloud (Postgres + auth + realtime). Tables: `products`, `live_offers`, `negotiation_sessions`, `conversation_messages`, `orders`, plus a separate `user_roles` table for seller/admin. Enums for stage/status, FKs, indexes, grants, RLS so a user reads only their own sessions/messages/orders; products and active offers are publicly readable; offer/stock writes are admin-only.
Seed migration: 8 products (4 running shoes, 4 earbuds) with real prices, tags, stock, images; 3 active offers with short expiry.

## PHASE 3 — Authentication
Email/password signup + login, persistent session, logout, zod validation, loading/error/success states. Split-screen auth page in the DealMate visual language.
Files: `src/routes/auth.tsx`, `src/hooks/useAuth.ts`, protected route layout.

## PHASE 4 — Landing page
Hero (eyebrow, "Don't just shop. Make a deal.", both CTAs) with an animated negotiation preview using controlled demo data; trust strip; three agent cards (gold/sage/coral); "Watch the price move" before/after visual; four-step flow; final CTA. Own SEO metadata.
Files: `src/routes/index.tsx`, `src/components/landing/*`.

## PHASE 5 — Chat workspace
`ChatSessionView`: ~55/45 conversation + deal workspace on desktop, conversation-first with a compact deal panel on mobile. Top nav with session indicator, Orders, Account, Logout. Agent-labelled messages (no bubble spam), animated typing indicator, message entrance.
Files: `src/routes/_authenticated/chat.tsx`, `src/components/chat/*`.

## PHASE 6 — Preference Agent
Server function calling the LLM with strict-JSON prompting, zod schema validation, one retry on malformed output, graceful error. Max 3 questions: category (constrained to seeded categories), budget min/max in INR, 1–2 priorities. Returns a structured completion object.

## PHASE 7 — Deal-Hunter (deterministic, no LLM)
Server-side query: category filter, budget ±15%, join active non-expired offers, rank on category relevance, budget fit, tag overlap, effective price, offer strength. Returns top 3.

## PHASE 8 — Negotiation Agent
LLM proposes; server clamps. Hard server rules: 15% max single-item, 20% max bundle (min 2 items), never sent to the client. UI shows strikethrough original, dominant negotiated price with one scale-in, "Within seller deal rules" and a DEAL SECURED state. Counter-offers below the floor return the best allowed price.

## PHASE 9 — Realtime
Supabase realtime subscriptions on `live_offers` and `products.stock_count`; no polling. Offer countdown rendered from `expires_at`.

## PHASE 10 — Atomic ordering
`OrderModal`: quantity stepper, negotiated unit price, address, subtotal, total. Server function re-validates user, price against the stored session, and stock; a SQL function decrements stock and inserts the order in one transaction; returns a real order ID. Success state: "Deal locked in." with order details and restrained celebration.

## PHASE 11 — Orders history
`/orders` timeline with order ID, product, quantity, negotiated price, total, date, status, plus past negotiation sessions. Loading/empty/error states.

## PHASE 12 — Seller/Admin view
`/admin`, role-gated: product list, edit stock, create/update/activate/deactivate offers with expiry, basic order visibility. Deliberately small — it exists to prove the shopper view is driven by real seller data.

## PHASE 13 — Responsive + motion polish
360px → large desktop, touch targets, focus rings, ARIA on modals/forms, contrast, reduced-motion pass, lazy-loaded routes, image sizing.

## PHASE 14 — End-to-end verification
Full demo run in a real browser: shop → preferences → matches → negotiate → push back → accept → order → stock drops → order appears in history; second session changes an offer and the shopper view updates without refresh. Negotiation floor tested by direct server call.

## PHASE 15 — Ship
Head metadata per route, security scan, publish.

---

Approve this and I'll start with Phase 1.
