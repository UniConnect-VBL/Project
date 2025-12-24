import { getSupabaseService } from "../utils/supabase.js";

/**
 * Update school leaderboard by summing all trust_scores per school.
 * Should be called by cron job hourly.
 * Uses SQL aggregation for efficiency.
 */
export async function updateSchoolLeaderboard(): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  // Use RPC function or direct SQL to aggregate trust_scores by school_id
  const { data, error } = await supabase.rpc("update_school_leaderboard");

  if (error) {
    // Fallback: manual aggregation if RPC doesn't exist
    const { data: schools } = await supabase.from("schools").select("id");

    for (const school of schools || []) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("trust_score")
        .eq("school_id", school.id)
        .is("deleted_at", null);

      const totalScore = profiles?.reduce((sum, p) => sum + (p.trust_score || 0), 0) || 0;

      await supabase
        .from("schools")
        .update({ total_trust_score: totalScore })
        .eq("id", school.id);
    }
  }
}

/**
 * Get schools leaderboard sorted by total_trust_score descending.
 */
export async function getSchoolsLeaderboard(limit: number = 50) {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .order("total_trust_score", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  return data || [];
}

