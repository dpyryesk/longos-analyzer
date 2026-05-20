"use client";

import { useState } from "react";
import { RefreshCw, KeyRound, CheckCircle, AlertCircle } from "lucide-react";

interface SyncResult {
  added: number;
  skipped: number;
  failed: number;
  total: number;
}

export default function SyncButton({ isAuthenticated }: { isAuthenticated: boolean }) {
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
      window.location.reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-body-sm)",
          fontWeight: 500,
          color: "var(--fg-on-brand)",
          background: loading ? "var(--brand-hover)" : "var(--brand)",
          border: "none",
          borderRadius: "var(--r-sm)",
          padding: "8px 16px",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.75 : 1,
          boxShadow: "var(--shadow-xs)",
          transition: `background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)`,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-hover)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-sm)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--brand)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-xs)";
          }
        }}
      >
        {loading ? (
          <RefreshCw size={14} strokeWidth={2} className="animate-spin" />
        ) : isAuthenticated ? (
          <RefreshCw size={14} strokeWidth={2} />
        ) : (
          <KeyRound size={14} strokeWidth={2} />
        )}
        {loading ? "Syncing…" : isAuthenticated ? "Sync Receipts" : "Connect Gmail"}
      </button>

      {result && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "var(--fs-caption)",
            color: "var(--success-700)",
          }}
        >
          <CheckCircle size={12} strokeWidth={2} />
          Added {result.added} · Skipped {result.skipped} · Failed {result.failed}
        </p>
      )}
      {error && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "var(--fs-caption)",
            color: "var(--danger-500)",
          }}
        >
          <AlertCircle size={12} strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}
