import logo from "@/assets/dealmate-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Wordmark next to the mark; off for tight spaces. */
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={logo.url}
        alt="DealMate"
        width={40}
        height={40}
        className="h-9 w-9 rounded-md object-cover"
      />
      {showWordmark ? (
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Deal<span className="text-primary">Mate</span>
        </span>
      ) : null}
    </span>
  );
}
