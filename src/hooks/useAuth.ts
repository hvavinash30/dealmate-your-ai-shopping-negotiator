import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Client-side session state. The auth listener is registered before the
 * initial `getSession()` call so no transition is missed.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });

    void supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, session: data.session, loading: false });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
