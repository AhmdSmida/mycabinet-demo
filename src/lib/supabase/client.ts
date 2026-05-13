import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'your_supabase_url') {
    // Return a no-op stub during build/prerender when env vars are not set.
    // The real client is only needed at runtime in the browser.
    return {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error('Not configured') }),
        signUp: async () => ({ data: { user: null }, error: new Error('Not configured') }),
        signOut: async () => {},
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
    } as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(url, key);
}
