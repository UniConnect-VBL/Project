"use client";

import Link from "next/link";
import type { Route } from "next";

export default function TermsPage() {
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
            Điều khoản sử dụng
          </h1>
          <p className="text-[#9CA3AF] mt-2">Cập nhật lần cuối: 22/12/2024</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-[#9CA3AF]">
          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              1. Giới thiệu
            </h2>
            <p className="leading-relaxed">
              Chào mừng bạn đến với UniHood - mạng xã hội dành riêng cho sinh
              viên Việt Nam. Bằng việc truy cập và sử dụng dịch vụ của chúng
              tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu
              trong tài liệu này.
            </p>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              2. Điều kiện sử dụng
            </h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>
                Bạn phải là sinh viên đang theo học tại các trường đại học/cao
                đẳng tại Việt Nam
              </li>
              <li>
                Bạn cần xác minh danh tính bằng email .edu.vn hoặc thẻ sinh viên
              </li>
              <li>
                Bạn cam kết sử dụng nền tảng một cách có trách nhiệm và tuân thủ
                pháp luật
              </li>
              <li>
                Bạn đủ 18 tuổi trở lên hoặc có sự đồng ý của phụ huynh/người
                giám hộ
              </li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              3. Quy định nội dung
            </h2>
            <p className="leading-relaxed mb-4">
              Khi đăng tải nội dung trên UniHood, bạn cam kết:
            </p>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Không đăng nội dung vi phạm pháp luật, đạo đức xã hội</li>
              <li>
                Không spam, quấy rối hoặc xâm phạm quyền riêng tư của người khác
              </li>
              <li>Không chia sẻ thông tin sai lệch hoặc gây hiểu lầm</li>
              <li>Tôn trọng bản quyền và sở hữu trí tuệ</li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              4. Marketplace & Giao dịch
            </h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Hệ thống Escrow bảo vệ giao dịch trong 3 ngày</li>
              <li>
                Người bán cần đạt Trust Score tối thiểu để tham gia Marketplace
              </li>
              <li>Mọi tranh chấp sẽ được xử lý bởi đội ngũ hỗ trợ UniHood</li>
              <li>
                UniHood không chịu trách nhiệm về chất lượng sản phẩm do người
                dùng đăng bán
              </li>
            </ul>
          </section>

          <section className="bg-[#1F2937] rounded-2xl p-6 border border-[#374151]">
            <h2 className="text-xl font-semibold text-[#F9FAFB] mb-4">
              5. Liên hệ
            </h2>
            <p className="leading-relaxed">
              Nếu bạn có bất kỳ câu hỏi nào về Điều khoản sử dụng, vui lòng liên
              hệ:{" "}
              <a
                href="mailto:support@unihood.vn"
                className="text-[#4F46E5] hover:underline"
              >
                support@unihood.vn
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#374151] text-center">
          <Link
            href={"/privacy" as Route}
            className="text-[#4F46E5] hover:underline"
          >
            Xem Chính sách bảo mật →
          </Link>
        </div>
      </div>
    </main>
  );
}
