'use server';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

/**
 * Fetch a profile by user ID.
 * Use this in Server Components or Route Handlers.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

/**
 * Fetch the profile of the currently authenticated user.
 * Returns null if not authenticated or profile not found.
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getProfile(user.id);
}
