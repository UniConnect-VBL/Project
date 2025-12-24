import { supabase } from "../utils/supabase.js";
import { ConsentLog } from "@unihood/types";

export async function createConsentLog(
  userId: string,
  consentType: string,
  version: string,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  metadata?: Record<string, any>
): Promise<ConsentLog> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("consent_logs")
    .insert({
      user_id: userId,
      consent_type: consentType,
      version,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConsentLogsByUser(
  userId: string
): Promise<ConsentLog[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("consent_logs")
    .select("*")
    .eq("user_id", userId)
    .order("consented_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function hasConsented(
  userId: string,
  consentType: string,
  version: string
): Promise<boolean> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("consent_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("consent_type", consentType)
    .eq("version", version)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return !!data;
}
