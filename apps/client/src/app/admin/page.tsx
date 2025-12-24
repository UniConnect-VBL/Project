"use client";

import { useState } from "react";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "disputes" | "audit">(
    "pending"
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded ${
            activeTab === "pending" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Pending Content
        </button>
        <button
          onClick={() => setActiveTab("disputes")}
          className={`px-4 py-2 rounded ${
            activeTab === "disputes" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Disputes
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded ${
            activeTab === "audit" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Audit Logs
        </button>
      </div>

      <div className="border rounded p-4">
        {activeTab === "pending" && <p>TODO: List pending posts/materials</p>}
        {activeTab === "disputes" && <p>TODO: List pending disputes</p>}
        {activeTab === "audit" && <p>TODO: List audit logs</p>}
      </div>
    </div>
  );
}
