import { supabase } from "../utils/supabase.js";
import { Transaction } from "@unihood/types";
import { scheduleEscrowRelease } from "./escrow.service.js";

export async function executePurchase(
  materialId: string,
  buyerId: string
): Promise<Transaction> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.rpc("execute_purchase", {
    p_material_id: materialId,
    p_buyer_id: buyerId,
  });

  if (error) throw error;
  if (!data.success) {
    throw new Error(data.error || "Purchase failed");
  }

  // Schedule escrow release
  await scheduleEscrowRelease(data.transaction_id);

  // Get full transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", data.transaction_id)
    .single();

  if (txError || !transaction) {
    throw new Error("Transaction not found");
  }

  return transaction;
}
