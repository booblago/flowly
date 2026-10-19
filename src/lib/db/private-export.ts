import fs from "fs";
import path from "path";
import type { Database as AppDatabase } from "@/lib/types";

const PRIVATE_DIR = path.join(process.cwd(), "data", "private");

function escCsv(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Owner-only local tables. Russian Excel needs `;` separators + UTF-8 BOM. */
export function exportPrivateOwnerTables(data: AppDatabase) {
  if (process.env.VERCEL === "1") return;
  try {
    fs.mkdirSync(PRIVATE_DIR, { recursive: true });

    const headers = [
      "id",
      "name",
      "email",
      "plan",
      "company",
      "stripe_status",
      "created_at",
    ];
    const rows = data.users.map((u) => [
      u.id,
      u.name,
      u.email,
      u.plan,
      u.company ?? "",
      u.stripeSubscriptionStatus ?? "",
      u.createdAt,
    ]);

    // Excel (RU/UA locale): semicolon + BOM so columns open correctly
    const csv =
      "\uFEFF" +
      [headers, ...rows].map((r) => r.map(escCsv).join(";")).join("\r\n");
    fs.writeFileSync(path.join(PRIVATE_DIR, "accounts.csv"), csv, "utf8");

    const boardHeaders = ["id", "name", "workspace_id", "sla_days", "created_at"];
    const boardRows = data.boards.map((b) => [
      b.id,
      b.name,
      b.workspaceId,
      String(b.slaDays),
      b.createdAt,
    ]);
    const boardsCsv =
      "\uFEFF" +
      [boardHeaders, ...boardRows]
        .map((r) => r.map(escCsv).join(";"))
        .join("\r\n");
    fs.writeFileSync(path.join(PRIVATE_DIR, "boards.csv"), boardsCsv, "utf8");

    const htmlRows = rows
      .map(
        (r) =>
          `<tr>${r.map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`,
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Flowly — Accounts</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; font-family: Segoe UI, system-ui, sans-serif;
      background: radial-gradient(900px 420px at 10% 0%, rgba(34,211,238,.18), transparent 55%),
                  radial-gradient(700px 380px at 90% 10%, rgba(244,114,182,.14), transparent 50%),
                  #050505; color: #f4f4f5; padding: 40px 24px;
    }
    .wrap { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 28px; letter-spacing: -.03em; margin: 0 0 6px; }
    h1 span:first-child { color: #67e8f9; text-shadow: 0 0 18px rgba(34,211,238,.4); }
    h1 span:last-child { color: #f9a8d4; text-shadow: 0 0 18px rgba(244,114,182,.35); }
    .sub { color: #a1a1aa; font-size: 13px; margin-bottom: 22px; }
    .card {
      border: 1px solid rgba(255,255,255,.12); border-radius: 20px; overflow: hidden;
      background: rgba(17,17,19,.9); box-shadow: 0 24px 60px rgba(0,0,0,.55);
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      text-align: left; padding: 12px 14px; font-size: 11px; letter-spacing: .08em;
      text-transform: uppercase; color: #a1a1aa; background: #0a0a0b;
      border-bottom: 1px solid rgba(255,255,255,.1);
    }
    td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.06); vertical-align: top; }
    tr:hover td { background: rgba(34,211,238,.06); }
    .plan {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 11px;
    }
    .plan-pro { background: linear-gradient(180deg,#fbcfe8,#f9a8d4); color: #500724; }
    .plan-free { background: linear-gradient(180deg,#ede9fe,#ddd6fe); color: #4c1d95; }
    .mono { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: #d4d4d8; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1><span>Flow</span><span>ly</span> Accounts</h1>
    <p class="sub">Private owner view · ${escHtml(new Date().toLocaleString())} · ${rows.length} users</p>
    <div class="card">
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${escHtml(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${htmlRows || `<tr><td colspan="${headers.length}">No users yet</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
  <script>
    document.querySelectorAll("td:nth-child(4)").forEach((td) => {
      const v = (td.textContent || "").trim();
      td.innerHTML = '<span class="plan plan-' + (v === "pro" ? "pro" : "free") + '">' + v.toUpperCase() + "</span>";
    });
    document.querySelectorAll("td:nth-child(1), td:nth-child(7)").forEach((td) => td.classList.add("mono"));
  </script>
</body>
</html>`;
    fs.writeFileSync(path.join(PRIVATE_DIR, "accounts.html"), html, "utf8");

    fs.writeFileSync(
      path.join(PRIVATE_DIR, "README.txt"),
      [
        "PRIVATE — only on this PC (gitignored).",
        "",
        "accounts.html  ← open in Chrome (beautiful table)",
        "accounts.csv   ← open in Excel (columns with ; separator)",
        "boards.csv",
        "",
        `Updated: ${new Date().toISOString()}`,
        "",
      ].join("\n"),
      "utf8",
    );
  } catch (error) {
    console.error("[private-export]", error);
  }
}
