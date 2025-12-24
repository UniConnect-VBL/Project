import { supabase } from "../utils/supabase.js";
import {
  Event,
  Ticket,
  CreateEventRequest,
  BuyTicketRequest,
} from "@unihood/types";
import { v4 as uuidv4 } from "uuid";

export async function createEvent(
  organizerId: string,
  data: CreateEventRequest
): Promise<Event> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organizer_id: organizerId,
      title: data.title,
      description: data.description,
      banner_url: data.banner_url,
      start_time: data.start_time,
      location: data.location,
      ticket_price: data.ticket_price,
      max_capacity: data.max_capacity,
      sold_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return event;
}

export async function getEvents(filters?: {
  limit?: number;
}): Promise<Event[]> {
  if (!supabase) throw new Error("Supabase not configured");

  let query = supabase
    .from("events")
    .select("*")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function buyTicket(
  userId: string,
  data: BuyTicketRequest
): Promise<Ticket> {
  if (!supabase) throw new Error("Supabase not configured");

  // Get event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", data.event_id)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  // Check capacity
  if (event.max_capacity && event.sold_count >= event.max_capacity) {
    throw new Error("Event is full");
  }

  // Check balance
  const { data: user } = await supabase
    .from("users")
    .select("wallet_balance")
    .eq("id", userId)
    .single();

  if (!user || user.wallet_balance < event.ticket_price) {
    throw new Error("Insufficient balance");
  }

  // Calculate fees
  const platformFee = event.ticket_price * 0.1;
  const netAmount = event.ticket_price - platformFee;

  // Atomic transaction
  const { data: transaction, error: txError } = await supabase.rpc(
    "execute_ticket_purchase",
    {
      p_event_id: data.event_id,
      p_buyer_id: userId,
      p_amount: event.ticket_price,
      p_platform_fee: platformFee,
      p_net_amount: netAmount,
    }
  );

  if (txError) throw txError;
  if (!transaction.success) {
    throw new Error(transaction.error || "Ticket purchase failed");
  }

  // Create ticket with QR code
  const qrCode = `TICKET_${data.event_id}_${userId}_${uuidv4()}`;

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      event_id: data.event_id,
      buyer_id: userId,
      qr_code: qrCode,
      status: "valid",
    })
    .select()
    .single();

  if (ticketError) throw ticketError;

  // Increment sold_count
  await supabase.rpc("increment", {
    table_name: "events",
    column_name: "sold_count",
    row_id: data.event_id,
    amount: 1,
  });

  return ticket;
}

export async function getTicketsByUser(userId: string): Promise<Ticket[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTicketsByEvent(eventId: string): Promise<Ticket[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
