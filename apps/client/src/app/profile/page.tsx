"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  student_code?: string;
  is_verified: boolean;
  verification_status: "unverified" | "pending" | "approved" | "rejected";
  trust_score: number;
  school?: {
    id: string;
    name: string;
    short_name?: string;
    logo_url?: string;
  };
}

function VerificationBadge({ status }: { status: string }) {
  const config = {
    approved: {
      text: "Đã xác thực",
      bg: "bg-green-500/20",
      border: "border-green-500/40",
      textColor: "text-green-400",
    },
    pending: {
      text: "Đang xác thực",
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/40",
      textColor: "text-yellow-400",
    },
    rejected: {
      text: "Xác thực thất bại",
      bg: "bg-red-500/20",
      border: "border-red-500/40",
      textColor: "text-red-400",
    },
    unverified: {
      text: "Chưa xác thực",
      bg: "bg-slate-500/20",
      border: "border-slate-500/40",
      textColor: "text-slate-400",
    },
  }[status] || {
    text: "Chưa xác thực",
    bg: "bg-slate-500/20",
    border: "border-slate-500/40",
    textColor: "text-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.bg} ${config.border} ${config.textColor}`}
    >
      {status === "approved" && (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {config.text}
    </span>
  );
}

function TrustScoreBadge({ score }: { score: number }) {
  const tier = score >= 80 ? 3 : score >= 60 ? 2 : score >= 30 ? 1 : 0;
  const tierColors = [
    "text-slate-400",
    "text-blue-400",
    "text-purple-400",
    "text-yellow-400",
  ];
  const tierNames = ["Tier 0", "Tier 1", "Tier 2", "Tier 3"];

  return (
    <div className="flex items-center gap-2">
      <span className={`font-medium ${tierColors[tier]}`}>
        {tierNames[tier]}
      </span>
      <span className="text-slate-500">•</span>
      <span className="text-slate-400">{score} điểm</span>
    </div>
  );
}

export default function ProfilePage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = "/login?next=/profile";
          return;
        }

        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
          }/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          setError("Không thể tải thông tin hồ sơ");
        }
      } catch {
        setError("Đã có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-700" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl bg-slate-900 border border-red-500/30 p-6 text-center">
          <p className="text-red-400">{error || "Không thể tải thông tin"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {profile.full_name?.[0]?.toUpperCase() ||
                    profile.email[0].toUpperCase()}
                </span>
              )}
            </div>
            {profile.verification_status === "approved" && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              {profile.full_name || "Chưa cập nhật tên"}
            </h1>
            <p className="text-slate-400">{profile.email}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <VerificationBadge status={profile.verification_status} />
              <TrustScoreBadge score={profile.trust_score} />
            </div>
          </div>
        </div>
      </div>

      {/* Student Info (if verified) */}
      {profile.verification_status === "approved" && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Thông tin sinh viên
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">MSSV</p>
              <p className="text-lg font-mono text-white">
                {profile.student_code || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Trường</p>
              <p className="text-lg text-white">
                {profile.school?.name || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification CTA (if not verified) */}
      {profile.verification_status !== "approved" && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {profile.verification_status === "pending"
                  ? "Đang xác thực..."
                  : "Xác thực tài khoản"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {profile.verification_status === "pending"
                  ? "Hệ thống đang xử lý yêu cầu xác thực của bạn"
                  : "Upload ảnh thẻ sinh viên để mở khóa đầy đủ tính năng"}
              </p>
            </div>
            {profile.verification_status !== "pending" && (
              <Link
                href="/verify"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Xác thực ngay
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Hành động</h2>
        <div className="space-y-2">
          <Link
            href="/profile/edit"
            className="block w-full py-3 px-4 text-left text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Chỉnh sửa hồ sơ
          </Link>
          <Link
            href="/profile/wallet"
            className="block w-full py-3 px-4 text-left text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Ví của tôi
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 text-left text-red-400 bg-slate-800 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </main>
  );
}
