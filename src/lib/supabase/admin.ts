import { createClient } from '@supabase/supabase-js';

// Service role client — server-only, never expose to the browser
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
