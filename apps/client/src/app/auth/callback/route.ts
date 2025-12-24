import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || error)}`,
        origin
      )
    );
  }

  // Exchange code for session
  if (code) {
    try {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Session exchange error:", exchangeError);
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(exchangeError.message)}`,
            origin
          )
        );
      }

      // Successful authentication - redirect to intended page
      return NextResponse.redirect(new URL(next, origin));
    } catch (err) {
      console.error("Callback error:", err);
      return NextResponse.redirect(
        new URL("/login?error=Đã có lỗi xảy ra khi đăng nhập", origin)
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL("/login", origin));
}
