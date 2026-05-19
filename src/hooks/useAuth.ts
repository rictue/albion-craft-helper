import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

// Supabase v2 stores its auth session as JSON under a project-specific
// localStorage key. Checking this synchronously lets us skip loading the
// 180KB SDK entirely for anonymous visitors — only logged-in users (and
// users who click Login) pay the network cost.
const SUPABASE_AUTH_LS_KEY = 'sb-elylyumpktnicomxhldr-auth-token';

// Lazy-load the supabase client. Memoised so concurrent callers share
// the same instance.
type Supabase = typeof import('../lib/supabase')['supabase'];
let supabasePromise: Promise<Supabase> | null = null;
function getSupabase(): Promise<Supabase> {
  if (!supabasePromise) {
    supabasePromise = import('../lib/supabase').then(m => m.supabase);
  }
  return supabasePromise;
}

function hasStoredSession(): boolean {
  try {
    return !!localStorage.getItem(SUPABASE_AUTH_LS_KEY);
  } catch {
    return false;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Anonymous user — never pull the SDK. Caller sees `loading=false,
    // user=null` and renders the Login button. The SDK loads only when
    // they click Login.
    if (!hasStoredSession()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    getSupabase().then(async supabase => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signInWithDiscord = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, signInWithDiscord, signOut };
}
