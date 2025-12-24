import { supabase } from "../utils/supabase.js";
import {
  Stream,
  CreateStreamRequest,
  DonateRequest,
  Transaction,
} from "@unihood/types";
import { v4 as uuidv4 } from "uuid";

export async function createStream(
  userId: string,
  data: CreateStreamRequest
): Promise<Stream> {
  if (!supabase) throw new Error("Supabase not configured");

  const streamKey = `stream_${userId}_${uuidv4()}`;

  const { data: stream, error } = await supabase
    .from("streams")
    .insert({
      user_id: userId,
      title: data.title,
      stream_key: streamKey,
      thumbnail_url: data.thumbnail_url,
      status: "live",
    })
    .select()
    .single();

  if (error) throw error;
  return stream;
}

export async function getLiveStreams(schoolId?: string): Promise<Stream[]> {
  if (!supabase) throw new Error("Supabase not configured");

  let query = supabase
    .from("streams")
    .select("*")
    .eq("status", "live")
    .order("created_at", { ascending: false });

  if (schoolId) {
    query = query.eq(
      "user_id",
      (await getUsersBySchool(schoolId)).map((u) => u.id)
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function getUsersBySchool(schoolId: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("school_id", schoolId)
    .is("deleted_at", null);
  return data || [];
}

export async function donateToStream(
  userId: string,
  data: DonateRequest
): Promise<Transaction> {
  if (!supabase) throw new Error("Supabase not configured");

  // Check stream is live
  const { data: stream, error: streamError } = await supabase
    .from("streams")
    .select("*")
    .eq("id", data.stream_id)
    .eq("status", "live")
    .single();

  if (streamError || !stream) {
    throw new Error("Stream not found or not live");
  }

  // Check balance
  const { data: user } = await supabase
    .from("users")
    .select("wallet_balance")
    .eq("id", userId)
    .single();

  if (!user || user.wallet_balance < data.amount) {
    throw new Error("Insufficient balance");
  }

  // Calculate fees
  const platformFee = data.amount * 0.1;
  const netAmount = data.amount - platformFee;

  // Atomic transaction
  const { data: transaction, error } = await supabase.rpc("execute_donation", {
    p_stream_id: data.stream_id,
    p_donor_id: userId,
    p_amount: data.amount,
    p_platform_fee: platformFee,
    p_net_amount: netAmount,
  });

  if (error) throw error;
  if (!transaction.success) {
    throw new Error(transaction.error || "Donation failed");
  }

  // Update stream total_donations
  await supabase.rpc("increment", {
    table_name: "streams",
    column_name: "total_donations",
    row_id: data.stream_id,
    amount: data.amount,
  });

  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transaction.transaction_id)
    .single();

  if (!tx) throw new Error("Transaction not found");
  return tx;
}

export async function endStream(
  streamId: string,
  userId: string
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from("streams")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", streamId)
    .eq("user_id", userId);

  if (error) throw error;
}
