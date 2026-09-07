import { motion } from "motion/react";
import { ShieldCheck, PackageCheck } from "lucide-react";

import { OfferCountdown } from "@/components/chat/OfferCountdown";
import { QuantityDealPanel } from "@/components/chat/QuantityDealPanel";
import { activeOfferFor } from "@/hooks/useLiveCatalog";
import type { DealState, LockedDeal } from "@/lib/agents.functions";
import type { NegotiationMode } from "@/lib/bulk-negotiation.server";
import { discountPct, formatINR } from "@/lib/format";
import type { QuantityDealState } from "@/lib/quantity-negotiation.functions";
import { cn } from "@/lib/utils";
import type { LiveOffer, Product, RankedProduct } from "@/types";

interface DealPanelProps {
  products: Product[];
