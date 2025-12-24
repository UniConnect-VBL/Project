"use client";

import Link from "next/link";
import { useState } from "react";

export default function ProfileEditPage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement profile update API call
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <main className="min-h-screen bg-[#111827] text-[#F9FAFB]">
      <div className="mx-auto max-w-xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="text-[#4F46E5] hover:underline text-sm"
          >
            ← Quay lại hồ sơ
          </Link>
          <h1 className="text-2xl font-bold mt-4">Chỉnh sửa hồ sơ</h1>
          <p className="text-[#9CA3AF] mt-1">
            Cập nhật thông tin cá nhân của bạn
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <label className="block text-sm font-medium mb-3">
              Ảnh đại diện
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] flex items-center justify-center text-2xl font-bold">
                U
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-[#374151] text-sm hover:bg-[#374151] transition-colors"
              >
                Thay đổi ảnh
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium mb-2"
            >
              Tên hiển thị
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-[#374151] bg-[#111827] px-4 py-3 text-[#F9FAFB] placeholder-[#6B7280] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
            />
          </div>

          {/* Bio */}
          <div className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Giới thiệu bản thân
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Mô tả ngắn về bạn..."
              rows={4}
              className="w-full rounded-xl border border-[#374151] bg-[#111827] px-4 py-3 text-[#F9FAFB] placeholder-[#6B7280] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </div>
    </main>
  );
}
