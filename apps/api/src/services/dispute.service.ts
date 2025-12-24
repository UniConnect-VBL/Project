import { supabase } from "../utils/supabase.js";
import { Dispute, CreateDisputeRequest } from "@unihood/types";

export async function createDispute(
  userId: string,
  data: CreateDisputeRequest
): Promise<Dispute> {
  if (!supabase) throw new Error("Supabase not configured");

  // Check if transaction exists and is in escrow
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", data.transaction_id)
    .eq("buyer_id", userId)
    .eq("status", "escrow_hold")
    .single();

  if (txError || !transaction) {
    throw new Error("Transaction not found or not eligible for dispute");
  }

  // Check if escrow period hasn't expired
  if (transaction.escrow_release_at) {
    const releaseDate = new Date(transaction.escrow_release_at);
    if (releaseDate < new Date()) {
      throw new Error("Escrow period has expired");
    }
  }

  // Check if dispute already exists
  const { data: existing } = await supabase
    .from("disputes")
    .select("id")
    .eq("transaction_id", data.transaction_id)
    .eq("reporter_id", userId)
    .eq("status", "pending")
    .single();

  if (existing) {
    throw new Error("Dispute already exists for this transaction");
  }

  // Create dispute
  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert({
      transaction_id: data.transaction_id,
      reporter_id: userId,
      reason: data.reason,
      evidence_url: data.evidence_url,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return dispute;
}

export async function getDisputesByUser(userId: string): Promise<Dispute[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPendingDisputes(): Promise<Dispute[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .in("status", ["pending", "investigating"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function resolveDispute(
  disputeId: string,
  status: "resolved_refund" | "resolved_reject",
  adminId: string
): Promise<Dispute> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.rpc("resolve_dispute", {
    p_dispute_id: disputeId,
    p_new_status: status,
    p_resolved_by: adminId,
  });

  if (error) throw error;
  if (!data.success) {
    throw new Error(data.error || "Failed to resolve dispute");
  }

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (!dispute) throw new Error("Dispute not found after resolution");
  return dispute;
}
