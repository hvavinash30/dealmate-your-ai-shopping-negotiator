import logo from "@/assets/dealmate-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Height of the mark in px; the wordmark scales with it. */
  size?: number;
}

/**
 * The DealMate mark. The uploaded artwork already contains the wordmark,
 * so we render it as a single contained image and let callers size it.
 */
export function Logo({ className, size = 34 }: LogoProps) {
  return (
    <img
      src={logo.url}
      alt="DealMate"
      width={size * 1.55}
      height={size}
      style={{ height: size }}
      className={cn("w-auto rounded-md object-contain", className)}
    />
  );
}
