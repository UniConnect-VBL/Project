import "../styles/globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">UniConnect MVP</p>
              <h1 className="text-2xl font-semibold">Student Social + Marketplace</h1>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
              Verification-first
            </span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}


