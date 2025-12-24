"use client";

import Link from "next/link";

export default function WalletPage() {
  // Mock data - replace with real API data
  const walletData = {
    availableBalance: 0,
    escrowBalance: 0,
    totalEarned: 0,
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
          <h1 className="text-2xl font-bold mt-4">Ví của tôi</h1>
          <p className="text-[#9CA3AF] mt-1">Quản lý số dư và giao dịch</p>
        </div>

        {/* Balance Cards */}
        <div className="space-y-4 mb-8">
          {/* Available Balance */}
          <div className="bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] rounded-2xl p-6">
            <p className="text-sm opacity-80 mb-1">Số dư khả dụng</p>
            <p className="text-3xl font-bold">
              {walletData.availableBalance.toLocaleString("vi-VN")} ₫
            </p>
          </div>

          {/* Escrow Balance */}
          <div className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9CA3AF] mb-1">Đang giữ (Escrow)</p>
                <p className="text-xl font-semibold">
                  {walletData.escrowBalance.toLocaleString("vi-VN")} ₫
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center">
                <span className="text-[#F59E0B]">🔒</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mt-2">
              Tiền được giữ 3 ngày trước khi chuyển vào số dư
            </p>
          </div>

          {/* Total Earned */}
          <div className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9CA3AF] mb-1">Tổng đã kiếm được</p>
                <p className="text-xl font-semibold text-[#10B981]">
                  {walletData.totalEarned.toLocaleString("vi-VN")} ₫
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                <span className="text-[#10B981]">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button className="rounded-xl bg-[#10B981] px-4 py-3 font-medium text-white hover:opacity-90 transition-all">
            Nạp tiền
          </button>
          <button className="rounded-xl border border-[#374151] px-4 py-3 font-medium hover:bg-[#1F2937] transition-all">
            Rút tiền
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
          <h2 className="text-lg font-semibold mb-4">Lịch sử giao dịch</h2>
          <div className="text-center py-8 text-[#6B7280]">
            <p className="text-4xl mb-2">📭</p>
            <p>Chưa có giao dịch nào</p>
          </div>
        </div>
      </div>
    </main>
  );
}
