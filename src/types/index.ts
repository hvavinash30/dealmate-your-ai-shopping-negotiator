/** Domain types shared between the UI and the server functions. */

export type AgentKind = "preference" | "deal_hunter" | "negotiation";
export type MessageRole = "user" | "agent" | "system";
export type SessionStage = "preferences" | "matching" | "negotiating" | "ordered";
export type { QuantityDealState } from "@/lib/quantity-negotiation.functions";
export type OrderStatus = "placed" | "confirmed" | "cancelled";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
  image_url: string;
  stock_count: number;
}

export interface LiveOffer {
  id: string;
  product_id: string;
  discount_pct: number;
  expires_at: string;
  active: boolean;
}

/** A product enriched with its best active offer and ranking result. */
export interface RankedProduct extends Product {
  offer: LiveOffer | null;
  effective_price: number;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  agent: AgentKind | null;
  content: string;
  created_at: string;
}

export interface PreferenceProfile {
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferences: string[];
}

export interface PreferenceTurn {
  reply: string;
  profile: PreferenceProfile;
  complete: boolean;
}

export interface NegotiationResult {
  /** Server-validated price. The client never computes this. */
  price: number;
  original_price: number;
  reply: string;
  at_floor: boolean;
  accepted_counter: boolean;
}

export interface OrderRecord {
  id: string;
  product_id: string;
  quantity: number;
  negotiated_price: number;
  delivery_address: string;
  status: OrderStatus;
  created_at: string;
}

export const AGENT_META: Record<AgentKind, { label: string; token: string }> = {
  preference: { label: "PREFERENCE AGENT", token: "text-primary" },
  deal_hunter: { label: "DEAL-HUNTER", token: "text-sage" },
  negotiation: { label: "NEGOTIATION AGENT", token: "text-coral" },
};
