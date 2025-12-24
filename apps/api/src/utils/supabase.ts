/**
 * Supabase Client Configuration
 * Uses validated env from env.ts instead of raw process.env
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";

/**
 * Supabase client with Service Role Key
 * Has full admin access - use carefully
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

export function getSupabaseService(): SupabaseClient {
  return supabase;
}
