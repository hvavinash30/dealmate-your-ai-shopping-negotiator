import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { signOut } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TopNavProps {
  /** Short status line shown next to the mark, e.g. the negotiation stage. */
  status?: string;
}

const links = [
  { to: "/chat", label: "Chat" },
  { to: "/orders", label: "Orders" },
  { to: "/seller", label: "Seller" },
] as const;

export function TopNav({ status }: TopNavProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Logo size={26} />
        </Link>
        {status ? (
          <span className="label-mono hidden truncate text-muted-foreground sm:inline">
            {status}
          </span>
        ) : null}

        <nav className="ml-auto flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground",
              )}
              activeProps={{ className: "bg-elevated text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              await navigate({ to: "/" });
            }}
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
