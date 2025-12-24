"use client";

import Link from "next/link";
import { Navbar } from "./components";
import { useAuth } from "../lib/auth";

const features = [
  {
    title: "Feed & Social",
    desc: "Đăng bài, like, comment, báo cáo. Kết nối với sinh viên cùng trường.",
    icon: "📱",
    href: "/",
  },
  {
    title: "Xác thực sinh viên",
    desc: "Upload thẻ SV để xác thực. Mở khóa tính năng kiếm tiền.",
    icon: "✅",
    href: "/verify",
  },
  {
    title: "Marketplace",
    desc: "Bán tài liệu, khóa học với phí 10%. Thanh toán an toàn.",
    icon: "🛒",
    href: "/marketplace",
  },
  {
    title: "Sự kiện",
    desc: "Tạo và tham gia các sự kiện sinh viên, workshop, seminar.",
    icon: "📅",
    href: "/events",
  },
  {
    title: "Việc làm",
    desc: "Tìm việc part-time, thực tập phù hợp với sinh viên.",
    icon: "💼",
    href: "/jobs",
  },
  {
    title: "Livestream",
    desc: "Phát trực tiếp chia sẻ kiến thức, học nhóm online.",
    icon: "🎥",
    href: "/streams",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className="space-y-8">
        {/* Hero Section */}
        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white">
          <h2 className="text-3xl font-bold">
            {user
              ? `Chào mừng trở lại, ${
                  user.user_metadata?.full_name?.split(" ").pop() || "bạn"
                }! 👋`
              : "Nền tảng kết nối sinh viên Việt Nam 🎓"}
          </h2>
          <p className="mt-3 text-lg text-blue-100">
            {user
              ? "Khám phá các tính năng mới và kết nối với cộng đồng sinh viên."
              : "Học tập, chia sẻ, kiếm tiền và kết nối với hàng nghìn sinh viên trên cả nước."}
          </p>
          {!user && (
            <div className="mt-6 flex gap-4">
              <Link
                href="/login"
                className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Bắt đầu ngay
              </Link>
              <Link
                href="/about"
                className="rounded-lg border-2 border-white/50 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Tìm hiểu thêm
              </Link>
            </div>
          )}
        </section>

        {/* Features Grid */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
              </div>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </Link>
          ))}
        </section>

        {/* Stats Section */}
        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Thống kê cộng đồng
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <p className="text-2xl font-bold text-blue-400">10K+</p>
              <p className="text-sm text-slate-400">Sinh viên</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <p className="text-2xl font-bold text-cyan-400">50+</p>
              <p className="text-sm text-slate-400">Trường ĐH</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <p className="text-2xl font-bold text-green-400">5K+</p>
              <p className="text-sm text-slate-400">Tài liệu</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800">
              <p className="text-2xl font-bold text-purple-400">1K+</p>
              <p className="text-sm text-slate-400">Sự kiện</p>
            </div>
          </div>
        </section>

        {/* Quick Links for Dev */}
        {process.env.NODE_ENV === "development" && (
          <section className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              🛠️ Dev Links
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <a
                href="http://localhost:4000/health"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700"
              >
                API Health
              </a>
              <a
                href="http://localhost:4000/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700"
              >
                API Docs
              </a>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
