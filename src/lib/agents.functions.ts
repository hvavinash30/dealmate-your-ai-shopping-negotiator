/**
 * Conversational agents exposed to the client as typed server functions.
 * All LLM calls, seller limits and price validation stay on this side.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgentKind, ChatMessage, RankedProduct } from "@/types";
import { generateStructured, AiError } from "./ai.server";
import { bestActiveOffer, rankProducts } from "./deal-hunter.server";
import { clampPrice, openingOffer, priceFloor, round2 } from "./negotiation.server";
import { fetchLiveProducts } from "./productSearch.server";

export interface DealState {
  product_id: string;
  list_price: number;
  price: number;
  at_floor: boolean;
}

export interface TurnResult {
  messages: ChatMessage[];
  matches: RankedProduct[] | null;
  deal: DealState | null;
  stage: string;
}

const preferenceSchema = z.object({
  reply: z.string().min(1).max(400),
  category: z.string().min(1).max(60).nullable(),
  budget_min: z.number().nullable(),
  budget_max: z.number().nullable(),
  preferences: z.array(z.string().min(1).max(40)).max(4),
  complete: z.boolean(),
});

const negotiationSchema = z.object({
  intent: z.enum(["counter", "accept", "question"]),
  target_price: z.number().nullable(),
  reply: z.string().min(1).max(320),
});

function agentMessage(agent: AgentKind, content: string): { agent: AgentKind; content: string } {
  return { agent, content };
}

/** Creates a fresh negotiation session for the signed-in shopper. */
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("negotiation_sessions")
      .insert({ user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const opener =
      "I'm your Preference Agent. Tell me what you're shopping for — any category works.";
    await context.supabase.from("conversation_messages").insert({
      session_id: data.id,
      role: "agent",
      agent: "preference",
      content: opener,
    });

    return { sessionId: data.id as string };
  });

/** Loads a session with its full message history. */
export const loadSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("negotiation_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (error) throw new Error(error.message);

    const { data: messages } = await context.supabase
      .from("conversation_messages")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    let matches: RankedProduct[] | null = null;
    let deal: DealState | null = null;

    if (session.category) {
      matches = await findMatches(context.supabase, {
        category: session.category,
        budgetMin: session.budget_min ? Number(session.budget_min) : null,
        budgetMax: session.budget_max ? Number(session.budget_max) : null,
        preferences: session.preferences ?? [],
      });
    }

    if (session.product_id && session.final_price) {
      const product = matches?.find((m) => m.id === session.product_id);
      const listPrice = product ? product.price : Number(session.final_price);
      deal = {
        product_id: session.product_id,
        list_price: listPrice,
        price: Number(session.final_price),
        at_floor: Number(session.final_price) <= priceFloor(listPrice) + 0.01,
      };
    }

    return {
      session: {
        id: session.id,
        stage: session.stage,
        category: session.category,
      },
      messages: (messages ?? []) as ChatMessage[],
      matches,
      deal,
    };
  });

type ServerSupabase = Parameters<typeof rankWithClient>[0];

async function rankWithClient(
  supabase: { from: (t: string) => any },
  input: { category: string | null; budgetMin: number | null; budgetMax: number | null; preferences: string[] },
) {
  const [{ data: products }, { data: offers }] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("live_offers").select("*"),
  ]);
  return rankProducts(
    (products ?? []).map((p: any) => ({ ...p, price: Number(p.price) })),
    (offers ?? []).map((o: any) => ({ ...o, discount_pct: Number(o.discount_pct) })),
    input,
  );
}

async function findMatches(
  supabase: ServerSupabase,
  input: { category: string | null; budgetMin: number | null; budgetMax: number | null; preferences: string[] },
) {
  if (input.category) {
    await fetchLiveProducts(input.category, input.preferences.join(" "));
  }
  return rankWithClient(supabase, input);
}

/**
 * A single shopper turn. Routes to the Preference Agent, the deterministic
 * Deal-Hunter, or the Negotiation Agent depending on the session stage.
 */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        text: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<TurnResult> => {
    const supabase = context.supabase;

    const { data: session, error } = await supabase
      .from("negotiation_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (error || !session) throw new Error("Session not found.");

    const { data: history } = await supabase
      .from("conversation_messages")
      .select("role, agent, content")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(24);

    await supabase.from("conversation_messages").insert({
      session_id: data.sessionId,
      role: "user",
      content: data.text,
    });

    const transcript = (history ?? [])
      .map((m) => `${m.role === "user" ? "Shopper" : (m.agent ?? "agent")}: ${m.content}`)
      .join("\n");

    const replies: Array<{ agent: AgentKind; content: string }> = [];
    let matches: RankedProduct[] | null = null;
    let deal: DealState | null = null;
    let stage: string = session.stage;

    try {
      if (session.stage === "preferences") {
        const result = await generateStructured(preferenceSchema, [
          {
            role: "system",
            content: [
              "You are DealMate's Preference Agent for an Indian retail shopping assistant.",
              "The shopper can be looking for any kind of product — don't restrict them to a fixed list of categories.",
              "Ask at most three short questions total: what they are shopping for, their budget range in INR, and what matters most (1-2 priorities).",
              "Never ask about anything else. Keep replies under 30 words, warm and direct, no emoji.",
              "Set complete=true as soon as category, budget_max and at least one preference are known.",
              "When complete, the reply should say you're handing over to the Deal-Hunter.",
              'Respond ONLY as JSON: {"reply":string,"category":string|null,"budget_min":number|null,"budget_max":number|null,"preferences":string[],"complete":boolean}',
            ].join(" "),
          },
          {
            role: "user",
            content: `Known so far: category=${session.category ?? "unknown"}, budget=${session.budget_min ?? "?"}-${session.budget_max ?? "?"}, preferences=${(session.preferences ?? []).join(", ") || "none"}.\nConversation:\n${transcript}\nShopper: ${data.text}`,
          },
        ]);

        replies.push(agentMessage("preference", result.reply));

        const budgetMax = result.budget_max;
        const budgetMin = result.budget_min ?? (budgetMax ? Math.round(budgetMax * 0.5) : null);
        const complete =
          result.complete && !!result.category && !!budgetMax && result.preferences.length > 0;

        await supabase
          .from("negotiation_sessions")
          .update({
            category: result.category,
            budget_min: budgetMin,
            budget_max: budgetMax,
            preferences: result.preferences,
            stage: complete ? "matching" : "preferences",
          })
          .eq("id", data.sessionId);

        stage = complete ? "matching" : "preferences";

        if (complete) {
          matches = await findMatches(supabase, {
            category: result.category,
            budgetMin,
            budgetMax,
            preferences: result.preferences,
          });

          if (matches.length === 0) {
            replies.push(
              agentMessage(
                "deal_hunter",
                "Nothing in the catalogue fits that brief yet. Try widening the budget and I'll look again.",
              ),
            );
          } else {
            const top = matches[0]!;
            replies.push(
              agentMessage(
                "deal_hunter",
                `Found ${matches.length} strong ${matches.length === 1 ? "match" : "matches"}. ${top.name} ranks first${top.offer ? " and already carries a live deal" : ""}.`,
              ),
            );

            const proposed = openingOffer(top.price, !!top.offer);
            const bounded = clampPrice(top.price, Math.min(proposed, top.effective_price));
            deal = {
              product_id: top.id,
              list_price: top.price,
              price: bounded.price,
              at_floor: bounded.atFloor,
            };
            replies.push(
              agentMessage(
                "negotiation",
                `I found room on the ${top.name}. I can take it from ₹${Math.round(top.price)} to ₹${Math.round(bounded.price)} right now. Want me to push further?`,
              ),
            );

            await supabase
              .from("negotiation_sessions")
              .update({ stage: "negotiating", product_id: top.id, final_price: bounded.price })
              .eq("id", data.sessionId);
            stage = "negotiating";
          }
        }
      } else {
        // Negotiation stage — the model reads intent, the server sets the price.
        const productId = session.product_id;
        if (!productId) throw new Error("No product under negotiation.");

        const { data: product } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();
        if (!product) throw new Error("Product unavailable.");

        const listPrice = Number(product.price);
        const currentPrice = session.final_price ? Number(session.final_price) : listPrice;

        const parsed = await generateStructured(negotiationSchema, [
          {
            role: "system",
            content: [
              "You are DealMate's Negotiation Agent. The shopper is negotiating one product in INR.",
              "Read their message and classify intent: 'counter' if they name or imply a lower price, 'accept' if they agree to the current price, 'question' otherwise.",
              "target_price must be the number they asked for, or null.",
              "Write a reply of at most 2 short sentences, confident and honest, no emoji.",
              "IMPORTANT: never write a rupee figure yourself. Where the final price belongs, write the literal token {price}. The system substitutes the validated price.",
              'Respond ONLY as JSON: {"intent":"counter"|"accept"|"question","target_price":number|null,"reply":string}',
            ].join(" "),
          },
          {
            role: "user",
            content: `Product: ${product.name}. Current offer: ${currentPrice}. Conversation:\n${transcript}\nShopper: ${data.text}`,
          },
        ]);

        let finalPrice = currentPrice;
        let atFloor = currentPrice <= priceFloor(listPrice) + 0.01;

        if (parsed.intent === "counter" && parsed.target_price !== null) {
          const bounded = clampPrice(listPrice, Math.min(parsed.target_price, currentPrice));
          finalPrice = bounded.price;
          atFloor = bounded.atFloor;
        }

        const reply = parsed.reply.includes("{price}")
          ? parsed.reply.replace(/\{price\}/g, `₹${Math.round(finalPrice)}`)
          : `${parsed.reply} Final price: ₹${Math.round(finalPrice)}.`;

        replies.push(agentMessage("negotiation", reply));
        if (atFloor && parsed.intent === "counter") {
          replies.push(
            agentMessage(
              "negotiation",
              "That's the seller's floor for this item — I can't go under it, but the deal is locked at that number.",
            ),
          );
        }

        deal = {
          product_id: productId,
          list_price: listPrice,
          price: round2(finalPrice),
          at_floor: atFloor,
        };

        await supabase
          .from("negotiation_sessions")
          .update({ final_price: finalPrice })
          .eq("id", data.sessionId);

        matches = await findMatches(supabase, {
          category: session.category,
          budgetMin: session.budget_min ? Number(session.budget_min) : null,
          budgetMax: session.budget_max ? Number(session.budget_max) : null,
          preferences: session.preferences ?? [],
        });
        stage = "negotiating";
      }
    } catch (err) {
      const message =
        err instanceof AiError
          ? err.message
          : "Something went wrong while thinking that through. Try again.";
      replies.push(agentMessage(session.stage === "preferences" ? "preference" : "negotiation", message));
    }

    const inserted: ChatMessage[] = [];
    for (const reply of replies) {
      const { data: row } = await supabase
        .from("conversation_messages")
        .insert({
          session_id: data.sessionId,
          role: "agent",
          agent: reply.agent,
          content: reply.content,
        })
        .select("*")
        .single();
      if (row) inserted.push(row as ChatMessage);
    }

    return { messages: inserted, matches, deal, stage };
  });

/** Switches the negotiation to another matched product. */
export const selectProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid(), productId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<TurnResult> => {
    const supabase = context.supabase;

    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", data.productId)
      .single();
    if (!product) throw new Error("Product unavailable.");

    const { data: offers } = await supabase
      .from("live_offers")
      .select("*")
      .eq("product_id", data.productId);

    const offer = bestActiveOffer(
      (offers ?? []).map((o) => ({ ...o, discount_pct: Number(o.discount_pct) })),
      data.productId,
    );
    const listPrice = Number(product.price);
    const bounded = clampPrice(listPrice, openingOffer(listPrice, !!offer));

    const content = `Switching to the ${product.name}. Best I can open with is ₹${Math.round(bounded.price)} against ₹${Math.round(listPrice)}.`;

    const { data: row } = await supabase
      .from("conversation_messages")
      .insert({
        session_id: data.sessionId,
        role: "agent",
        agent: "negotiation",
        content,
      })
      .select("*")
      .single();

    await supabase
      .from("negotiation_sessions")
      .update({ product_id: data.productId, final_price: bounded.price, stage: "negotiating" })
      .eq("id", data.sessionId);

    return {
      messages: row ? [row as ChatMessage] : [],
      matches: null,
      deal: {
        product_id: data.productId,
        list_price: listPrice,
        price: bounded.price,
        at_floor: bounded.atFloor,
      },
      stage: "negotiating",
    };
  });
