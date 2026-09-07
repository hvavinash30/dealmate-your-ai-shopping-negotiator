import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fadeUp } from "@/lib/motion";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to DealMate — Negotiate a better price" },
      {
        name: "description",
        content:
          "Create your DealMate account to start a negotiation session and lock in a better price on shoes and earbuds.",
      },
      { property: "og:title", content: "Sign in to DealMate" },
      {
        property: "og:description",
        content: "Create your DealMate account and start negotiating a better price.",
      },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/chat" });
  }, [user, loading, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/chat` },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setConfirmSent(true);
          toast.success("Check your inbox to confirm your email.");
          return;
        }
        toast.success("Account created. Taking you to the floor.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInError) throw signInError;
        toast.success("Welcome back.");
      }
      await navigate({ to: "/chat" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r border-border bg-surface p-10 lg:flex">
        <div className="grain-panel absolute inset-0" aria-hidden />
        <Link to="/" className="relative">
          <Logo size={32} />
        </Link>
        <div className="relative max-w-md">
          <p className="label-mono text-primary">THE FLOOR IS OPEN</p>
          <h2 className="mt-4 text-4xl leading-tight font-bold">
            Every price is a starting point.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            DealMate reads what you actually need, finds the closest products in stock, then
            negotiates against the seller's real discount limits. No fake countdowns, no invented
            savings.
          </p>
        </div>
        <div className="relative flex gap-6 text-xs text-muted-foreground">
          <span>Server-validated pricing</span>
          <span>Live stock</span>
          <span>Real orders</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm"
        >
          <div className="lg:hidden">
            <Logo size={30} />
          </div>
          <h1 className="mt-6 text-2xl font-bold lg:mt-0">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Pick up where your last negotiation left off."
              : "Takes a few seconds. Then you can start dealing."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label-mono text-muted-foreground">
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-border bg-panel px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="label-mono text-muted-foreground">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-border bg-panel px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                placeholder="At least 6 characters"
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="mt-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
