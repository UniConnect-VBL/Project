import { supabase } from "../utils/supabase.js";
import { AuditLog } from "@unihood/types";

export async function createAuditLog(
  adminId: string,
  action: string,
  targetId: string | undefined,
  targetType: string | undefined,
  metadata: Record<string, any> | undefined,
  ipAddress: string
): Promise<AuditLog> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      admin_id: adminId,
      action,
      target_id: targetId,
      target_type: targetType,
      metadata,
      ip_address: ipAddress,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAuditLogs(filters?: {
  adminId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  if (!supabase) throw new Error("Supabase not configured");

  let query = supabase.from("audit_logs").select("*");

  if (filters?.adminId) {
    query = query.eq("admin_id", filters.adminId);
  }

  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  query = query.order("created_at", { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
