import { supabase } from "../utils/supabase.js";

export async function insertNotification(payload: Record<string, unknown>) {
  if (!supabase) return;
  await supabase.from("notifications").insert(payload);
}
