"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "../../utils/supabaseClient";

export default function LoginPage() {
  const supabase = supabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);

  const handleEmailAuth = async () => {
    // Require consent for signup
    if (mode === "signup" && !consentAgreed) {
      setMessage("Bạn cần đồng ý với Điều khoản sử dụng để đăng ký.");
      return;
    }

    setLoading(true);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMessage(error.message);
      else setMessage("Kiểm tra email để xác nhận và đăng nhập.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else router.push(next as Route);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    // Require consent for new users (signup via Google)
    if (!consentAgreed) {
      setMessage("Bạn cần đồng ý với Điều khoản sử dụng trước khi tiếp tục.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md space-y-6 rounded-2xl bg-slate-900 p-6 shadow-lg border border-slate-700">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">UniHood</h1>
            <p className="text-xs text-slate-400">Smart Smile. Smart Learn.</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          {mode === "signin" ? "Đăng nhập vào tài khoản" : "Tạo tài khoản mới"}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.edu.vn"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Mật khẩu
          </label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent"
            checked={consentAgreed}
            onChange={(e) => setConsentAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
          />
          <label htmlFor="consent" className="text-sm text-slate-400">
            Tôi đồng ý với{" "}
            <Link
              href={"/terms" as Route}
              className="text-blue-400 hover:underline"
            >
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link
              href={"/privacy" as Route}
              className="text-blue-400 hover:underline"
            >
              Chính sách bảo mật
            </Link>
          </label>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {mode === "signin" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
          </span>
          <button
            type="button"
            className="text-blue-400 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-white font-medium hover:from-blue-700 hover:to-blue-600 disabled:opacity-60 transition-all"
        >
          {loading
            ? "Đang xử lý..."
            : mode === "signin"
            ? "Đăng nhập"
            : "Đăng ký"}
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-700" />
        <span>hoặc</span>
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white hover:bg-slate-700 disabled:opacity-60 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Tiếp tục với Google</span>
      </button>

      {message && (
        <p
          className={`text-sm ${
            message.includes("email") || message.includes("xác nhận")
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
