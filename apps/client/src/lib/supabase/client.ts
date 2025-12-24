import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Browser Client
 * Rule 6: Use @supabase/ssr for client-side auth
 *
 * This creates a singleton client for use in Client Components
 */
export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for client components
let browserClient: SupabaseClient | null = null;

/**
 * Get Supabase client singleton
 * Ensures only one client instance exists in the browser
 */
export function getSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
