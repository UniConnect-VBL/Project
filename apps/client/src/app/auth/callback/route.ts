import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ErrorCodes } from "@unihood/types";

/**
 * OAuth callback handler
 * Exchanges authorization code for session and sets cookies
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors from provider
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    const errorCode =
      error === "access_denied"
        ? ErrorCodes.AUTH.UNAUTHORIZED
        : ErrorCodes.AUTH.INVALID_CREDENTIALS;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorCode)}`, origin)
    );
  }

  // Exchange authorization code for session
  if (code) {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            ErrorCodes.SYSTEM.INTERNAL_ERROR
          )}`,
          origin
        )
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components - this is expected
          }
        },
      },
    });

    try {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Session exchange error:", exchangeError.message);
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(ErrorCodes.AUTH.TOKEN_EXPIRED)}`,
            origin
          )
        );
      }

      // Successful authentication - redirect to intended page
      return NextResponse.redirect(new URL(next, origin));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Callback error:", message);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            ErrorCodes.SYSTEM.INTERNAL_ERROR
          )}`,
          origin
        )
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL("/login", origin));
}
