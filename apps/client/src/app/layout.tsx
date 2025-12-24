import "../styles/globals.css";
import React from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "UniHood - Student Social + Marketplace",
  description: "Smart Smile. Smart Learn. Nền tảng kết nối sinh viên.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <Providers>
          <div className="mx-auto max-w-5xl p-6">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
