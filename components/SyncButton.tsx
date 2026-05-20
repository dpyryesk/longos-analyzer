"use client";

import { useState } from "react";

interface SyncResult {
  added: number;
  skipped: number;
  failed: number;
  total: number;
}

export default function SyncButton({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (!isAuthenticated) {
      window.location.href = "/api/auth/google";
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        setError(data.message ?? "Sync failed");
        return;
      }

      setResult(data as SyncResult);
      // Refresh the page data
      window.location.reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        onClick={handleSync}
        disabled={loading}
        className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm"
      >
        {loading
          ? "Syncing…"
          : isAuthenticated
          ? "🔄 Sync Receipts"
          : "🔑 Connect Gmail"}
      </button>
      {result && (
        <p className="text-xs text-gray-600">
          ✅ Added {result.added} | Skipped {result.skipped} | Failed{" "}
          {result.failed}
        </p>
      )}
      {error && <p className="text-xs text-red-600">❌ {error}</p>}
    </div>
  );
}
