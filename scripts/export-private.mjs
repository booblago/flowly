import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import Database from "better-sqlite3";

// Reuse TS exporter via dynamic transpile isn't available; duplicate minimal export here.
const dir = path.join(process.cwd(), "data", "private");
fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.join(process.cwd(), "data", "flowly.db"), {
  readonly: true,
});

function escCsv(v) {
  const s = v == null ? "" : String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function escHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const users = db
  .prepare(
    `SELECT id, name, email, plan, IFNULL(company,'') as company,
            IFNULL(stripe_subscription_status,'') as stripe_status, created_at
     FROM users`,
  )
  .all();

const headers = [
  "id",
  "name",
  "email",
  "plan",
  "company",
  "stripe_status",
  "created_at",
];
const rows = users.map((u) =>
  headers.map((h) => u[h === "stripe_status" ? "stripe_status" : h]),
);

const csv =
  "\uFEFF" +
  [headers, ...rows].map((r) => r.map(escCsv).join(";")).join("\r\n");

const csvPath = path.join(dir, "accounts.csv");
try {
  fs.writeFileSync(csvPath, csv, "utf8");
} catch {
  fs.writeFileSync(path.join(dir, "accounts-new.csv"), csv, "utf8");
}

const htmlRows = rows
  .map((r) => `<tr>${r.map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="uk"><head><meta charset="utf-8"/><title>Flowly Accounts</title>
<style>
body{margin:0;min-height:100vh;font-family:Segoe UI,system-ui,sans-serif;background:#050505;color:#f4f4f5;padding:40px 24px;
background-image:radial-gradient(900px 420px at 10% 0%,rgba(34,211,238,.18),transparent 55%),radial-gradient(700px 380px at 90% 10%,rgba(244,114,182,.14),transparent 50%)}
.wrap{max-width:1100px;margin:0 auto}h1{font-size:28px;margin:0 0 6px;letter-spacing:-.03em}
.c{color:#67e8f9}.p{color:#f9a8d4}.sub{color:#a1a1aa;font-size:13px;margin-bottom:22px}
.card{border:1px solid rgba(255,255,255,.12);border-radius:20px;overflow:hidden;background:rgba(17,17,19,.92)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:12px 14px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;background:#0a0a0b;border-bottom:1px solid rgba(255,255,255,.1)}
td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)}
tr:hover td{background:rgba(34,211,238,.06)}
.plan{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:11px}
.pro{background:linear-gradient(180deg,#fbcfe8,#f9a8d4);color:#500724}
.free{background:linear-gradient(180deg,#ede9fe,#ddd6fe);color:#4c1d95}
.mono{font-family:Consolas,monospace;font-size:12px;color:#d4d4d8}
</style></head><body><div class="wrap">
<h1><span class="c">Flow</span><span class="p">ly</span> Accounts</h1>
<p class="sub">Private · ${escHtml(new Date().toLocaleString())} · ${rows.length} users</p>
<div class="card"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${htmlRows}</tbody></table></div></div>
<script>
document.querySelectorAll('td:nth-child(4)').forEach(td=>{
  const v=(td.textContent||'').trim();
  td.innerHTML='<span class="plan '+(v==='pro'?'pro':'free')+'">'+v.toUpperCase()+'</span>';
});
document.querySelectorAll('td:nth-child(1),td:nth-child(7)').forEach(td=>td.classList.add('mono'));
</script></body></html>`;

const htmlPath = path.join(dir, "accounts.html");
fs.writeFileSync(htmlPath, html, "utf8");
console.log("CSV:", csvPath);
console.log("HTML:", htmlPath);
console.log("Users:", users.length);
db.close();
