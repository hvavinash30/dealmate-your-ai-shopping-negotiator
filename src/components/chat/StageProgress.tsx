import { CheckCircle2, Handshake, MessageCircle, Search } from "lucide-react";

import { cn } from "@/lib/utils";

interface StageProgressProps {
  stage: string;
}

const STEPS = [
  { key: "preferences", label: "Chatting", icon: MessageCircle },
  { key: "matching", label: "Finding Matches", icon: Search },
  { key: "negotiating", label: "Negotiating", icon: Handshake },
  { key: "ordered", label: "Deal Sealed", icon: CheckCircle2 },
] as const;

export function StageProgress({ stage }: StageProgressProps) {
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === stage),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 py-3 sm:gap-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
                isCurrent
                  ? "border-primary bg-primary/10 text-primary"
                  : isDone
                    ? "border-border bg-elevated text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0 sm:size-4" />
              <span className="whitespace-nowrap">{step.label}</span>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={cn(
                  "h-px flex-1 transition-colors",
                  isDone ? "bg-primary/60" : "bg-border",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
