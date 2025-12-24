"use client";

import Link from "next/link";
import type { Route } from "next";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#111827] text-[#F9FAFB]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/login"
            className="text-[#4F46E5] hover:underline text-sm"
          >
            ← Quay lại đăng nhập
          </Link>
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] bg-clip-text text-transparent">
            Chính sách bảo mật
          </h1>
          <p className="text-[#9CA3AF] mt-2">Cập nhật lần cuối: 22/12/2024</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-[#9CA3AF]">
          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              1. Thu thập thông tin
            </h2>
            <p className="leading-relaxed mb-4">
              UniHood thu thập các thông tin sau khi bạn sử dụng dịch vụ:
            </p>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>
                Thông tin tài khoản: Email, mật khẩu (đã mã hóa), tên hiển thị
              </li>
              <li>
                Thông tin xác minh: MSSV, ảnh thẻ sinh viên (xóa sau 30 ngày)
              </li>
              <li>Thông tin hoạt động: Bài đăng, bình luận, lượt thích</li>
              <li>Thông tin kỹ thuật: IP, User Agent, thiết bị sử dụng</li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              2. Mục đích sử dụng
            </h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Cung cấp và cải thiện dịch vụ mạng xã hội sinh viên</li>
              <li>Xác minh danh tính sinh viên để bảo vệ cộng đồng</li>
              <li>Hỗ trợ giao dịch an toàn trên Marketplace</li>
              <li>Gửi thông báo quan trọng về tài khoản và dịch vụ</li>
              <li>Phân tích và cải thiện trải nghiệm người dùng</li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              3. Bảo vệ dữ liệu
            </h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Mã hóa đầu cuối cho tin nhắn riêng tư</li>
              <li>Lưu trữ bảo mật trên Cloudflare R2 với Presigned URLs</li>
              <li>Không chia sẻ thông tin cá nhân với bên thứ ba</li>
              <li>
                Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân
                (PDPD)
              </li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              4. Quyền của bạn (PDPD Compliance)
            </h2>
            <p className="leading-relaxed mb-4">
              Theo Nghị định 13/2023/NĐ-CP, bạn có các quyền sau:
            </p>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>
                <strong className="text-[#F9FAFB]">Quyền truy cập:</strong> Xem
                dữ liệu cá nhân đang được lưu trữ
              </li>
              <li>
                <strong className="text-[#F9FAFB]">Quyền chỉnh sửa:</strong> Cập
                nhật thông tin không chính xác
              </li>
              <li>
                <strong className="text-[#F9FAFB]">Quyền xóa:</strong> Yêu cầu
                xóa hoàn toàn dữ liệu (Nuke feature)
              </li>
              <li>
                <strong className="text-[#F9FAFB]">Quyền rút consent:</strong>{" "}
                Hủy đồng ý xử lý dữ liệu bất cứ lúc nào
              </li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              5. Lưu trữ & Xóa dữ liệu
            </h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Ảnh xác minh sinh viên: Tự động xóa sau 30 ngày</li>
              <li>Dữ liệu tài khoản: Lưu trữ đến khi bạn yêu cầu xóa</li>
              <li>Log consent: Lưu trữ 5 năm theo quy định pháp luật</li>
              <li>Backup: Mã hóa và lưu trữ tối đa 90 ngày</li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              6. Liên hệ
            </h2>
            <p className="leading-relaxed">
              Để thực hiện quyền liên quan đến dữ liệu cá nhân hoặc có thắc mắc,
              vui lòng liên hệ:{" "}
              <a
                href="mailto:privacy@unihood.vn"
                className="text-[#4F46E5] hover:underline"
              >
                privacy@unihood.vn
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#374151] text-center">
          <Link
            href={"/terms" as Route}
            className="text-[#4F46E5] hover:underline"
          >
            Xem Điều khoản sử dụng →
          </Link>
        </div>
      </div>
    </main>
  );
}
