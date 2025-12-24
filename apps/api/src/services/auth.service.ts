import { createClient } from "@supabase/supabase-js";
import { supabase as supabaseService } from "../utils/supabase.js";
import { ErrorCodes } from "@unihood/types";
import { env } from "../env.js";

export interface GoogleAuthResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  school_id?: string;
  student_code?: string;
  is_verified: boolean;
  verification_status: string;
  trust_score: number;
  created_at: string;
  school?: {
    id: string;
    name: string;
    short_name?: string;
    logo_url?: string;
  };
}

/**
 * Exchange Google OAuth code for JWT session
 */
export async function exchangeGoogleCode(
  code: string
): Promise<GoogleAuthResult> {
  if (!code) {
    throw new Error("Authorization code is required");
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error("Failed to create session");
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: {
      ...data.user,
      id: data.user.id,
      email: data.user.email,
    },
  };
}

/**
 * Get user profile with school info, create if not exists
 */
export async function getOrCreateUserProfile(
  userId: string,
  userEmail?: string
): Promise<UserProfile> {
  if (!supabaseService) {
    throw new Error("Database service unavailable");
  }

  // Query profile with school join
  const { data: profile, error: fetchError } = await supabaseService
    .from("users")
    .select(
      `
      id,
      email,
      full_name,
      avatar_url,
      school_id,
      student_code,
      is_verified,
      verification_status,
      trust_score,
      created_at,
      schools (
        id,
        name,
        short_name,
        logo_url
      )
    `
    )
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  // If profile exists, return it
  if (profile && !fetchError) {
    return {
      ...profile,
      school: Array.isArray(profile.schools)
        ? profile.schools[0]
        : profile.schools,
    } as UserProfile;
  }

  // Profile doesn't exist, create new one
  if (!userEmail) {
    throw new Error("User email not available");
  }

  const { data: newProfile, error: createError } = await supabaseService
    .from("users")
    .insert({
      id: userId,
      email: userEmail,
      trust_score: 10,
      verification_status: "unverified",
      is_verified: false,
    })
    .select(
      `
      id,
      email,
      full_name,
      avatar_url,
      school_id,
      student_code,
      is_verified,
      verification_status,
      trust_score,
      created_at,
      schools (
        id,
        name,
        short_name,
        logo_url
      )
    `
    )
    .single();

  if (createError || !newProfile) {
    throw new Error(createError?.message || "Failed to create profile");
  }

  // Also create wallet for new user
  try {
    await supabaseService.from("wallets").insert({
      user_id: userId,
      balance: 0,
    });
  } catch (walletError: unknown) {
    // Ignore error if wallet already exists
    const errorMessage =
      walletError instanceof Error ? walletError.message : String(walletError);
    console.log(
      `${ErrorCodes.WALLET_CREATION_FAILED}, maybe it already exists:`,
      errorMessage
    );
  }

  // Rule 93: Insert consent log for registration
  try {
    await supabaseService.from("consent_logs").insert({
      user_id: userId,
      consent_type: "registration",
      version: "1.0",
      metadata: {
        email: userEmail,
        source: "google_oauth",
      },
    });
  } catch (consentError: unknown) {
    // Log but don't fail registration
    const errorMessage =
      consentError instanceof Error
        ? consentError.message
        : String(consentError);
    console.log("Consent log insertion failed:", errorMessage);
  }

  return {
    ...newProfile,
    school: Array.isArray(newProfile.schools)
      ? newProfile.schools[0]
      : newProfile.schools,
  } as UserProfile;
}
