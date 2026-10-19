"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageContext";

export function OwnerAccountsView() {
  const t = useT();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t("adminForbidden"));
      return;
    }
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setPlan(userId: string, plan: "free" | "pro") {
    setBusyId(userId);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, plan }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || t("saveFailed"));
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plan } : u)),
    );
  }

  async function removeUser(user: PublicUser) {
    const ok = window.confirm(
      t("confirmDeleteUser").replace("{email}", user.email),
    );
    if (!ok) return;
    setBusyId(user.id);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || t("saveFailed"));
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">
            <span className="neon-cyan">Flow</span>
            <span className="neon-pink">ly</span>{" "}
            <span className="text-ink">{t("ownerAccounts")}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("ownerAccountsHint")} · {users.length} {t("usersWord")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("refresh")}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line)] bg-surface shadow-[0_24px_60px_rgba(0,0,0,.45)]">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-paper">
              <tr className="text-[11px] uppercase tracking-[0.08em] text-muted">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted">
                    {t("loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[var(--line)]/70 hover:bg-brand/[0.04]"
                  >
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          user.plan === "pro" ? "chip-pink" : "chip-violet"
                        }`}
                      >
                        {(user.plan || "free").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {user.company || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === user.id || user.plan === "pro"}
                          onClick={() => void setPlan(user.id, "pro")}
                          className="rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-accent disabled:opacity-40"
                        >
                          Pro
                        </button>
                        <button
                          type="button"
                          disabled={busyId === user.id || user.plan === "free"}
                          onClick={() => void setPlan(user.id, "free")}
                          className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-muted disabled:opacity-40"
                        >
                          Free
                        </button>
                        <button
                          type="button"
                          disabled={busyId === user.id}
                          onClick={() => void removeUser(user)}
                          className="inline-flex items-center gap-1 rounded-full border border-rose/40 px-2.5 py-1 text-[11px] font-semibold text-rose disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
