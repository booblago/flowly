import { notFound } from "next/navigation";
import Link from "next/link";
import { getBoardReportByToken } from "@/lib/db";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getBoardReportByToken(token);
  if (!report) notFound();

  return (
    <div className="mesh-bg min-h-screen px-4 py-10 text-ink">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-display text-xl font-extrabold">
          <span className="neon-cyan">Flow</span>
          <span className="neon-pink">ly</span>
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
          Client delivery report
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold">
          {report.board.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Generated {new Date(report.generatedAt).toLocaleString()} · SLA{" "}
          {report.board.slaDays}d
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Done this week", report.summary.doneThisWeek],
            ["Overdue", report.summary.overdue],
            ["Hours", `${report.summary.loggedHours}/${report.summary.estimateHours}`],
            ["Total cards", report.summary.totalCards],
            ["All done", report.summary.done],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-[var(--line)] bg-surface p-4"
            >
              <div className="text-xs uppercase tracking-wide text-muted">
                {label}
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand">
                {value}
              </div>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-surface p-5">
          <h2 className="font-display text-xl font-bold">Shipped this week</h2>
          <ul className="mt-4 space-y-2">
            {report.doneThisWeek.length === 0 && (
              <li className="text-sm text-muted">No completions this week yet.</li>
            )}
            {report.doneThisWeek.map((c) => (
              <li
                key={c.id}
                className="flex justify-between gap-3 border-b border-[var(--line)] py-2 text-sm last:border-0"
              >
                <span>{c.title}</span>
                <span className="text-muted">
                  {c.loggedHours}h / {c.estimateHours}h
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-surface p-5">
          <h2 className="font-display text-xl font-bold text-rose">Overdue</h2>
          <ul className="mt-4 space-y-2">
            {report.overdue.length === 0 && (
              <li className="text-sm text-muted">Nothing overdue. Nice.</li>
            )}
            {report.overdue.map((c) => (
              <li
                key={c.id}
                className="flex justify-between gap-3 border-b border-[var(--line)] py-2 text-sm last:border-0"
              >
                <span>{c.title}</span>
                <span className="text-muted">
                  {c.priority}
                  {c.dueDate
                    ? ` · ${new Date(c.dueDate).toLocaleDateString()}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
