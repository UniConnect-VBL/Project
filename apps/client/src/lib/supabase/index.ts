// Supabase clients exports
// Note: Server client is NOT exported here to avoid bundling server-only code
// in client components. Import directly from "./server" in Server Components,
// Route Handlers, and Server Actions.
export {
  createClient as createBrowserClient,
  getSupabaseClient,
} from "./client";
export { updateSession } from "./middleware";
