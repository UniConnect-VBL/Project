"use client";

import Link from "next/link";

const cards = [
  {
    title: "Feed & Social",
    desc: "Posts, likes, comments, reports. Cursor pagination + realtime later.",
  },
  {
    title: "Verification",
    desc: "Upload proof -> queue verification job -> unlock monetization.",
  },
  {
    title: "Marketplace",
    desc: "Sell documents/courses (10% fee), R2 signed URLs, atomic purchase RPC.",
  },
  {
    title: "Chat & Notifications",
    desc: "Realtime inbox + persisted history, offline pull for notifications.",
  },
  {
    title: "Wiki Reviews",
    desc: "Anonymous verified reviews, Gemini moderation, pgvector search.",
  },
  {
    title: "Matches",
    desc: "Verified-only study date matching with AI score (premium).",
  },
];

export default function HomePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Getting Started</h2>
        <p className="mt-2 text-sm text-slate-600">
          Fill env files, run <code className="rounded bg-slate-100 px-2 py-1 text-xs">pnpm install</code>, then{" "}
          <code className="rounded bg-slate-100 px-2 py-1 text-xs">docker-compose up --build</code>. API on 4000,
          client on 3000, Redis 6379, Postgres 5432.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Links</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-700">
          <li>
            <Link href="http://localhost:4000/health">API healthcheck</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}


