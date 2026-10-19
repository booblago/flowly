"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  AutomationTrigger,
  BoardLabel,
  CustomFieldDef,
  List,
  PublicUser,
} from "@/lib/types";
import { startProCheckout } from "@/lib/billing-client";
import { FREE_TRIGGERS, PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { useT } from "@/lib/i18n/LanguageContext";
import type { MessageKey } from "@/lib/i18n/translations";

type Props = {
  boardId: string;
  lists: List[];
  labels: BoardLabel[];
  members: PublicUser[];
  customFields: CustomFieldDef[];
  initial: AutomationRule[];
  plan?: PlanId;
};

const freeTriggerKeys: { id: AutomationTrigger; label: MessageKey }[] = [
  { id: "card_moved", label: "triggerCardMoved" },
  { id: "card_created", label: "triggerCardCreated" },
  { id: "priority_set", label: "triggerPrioritySet" },
  { id: "due_overdue", label: "triggerDueOverdue" },
];

const proTriggerKeys: { id: AutomationTrigger; label: MessageKey }[] = [
  { id: "checklist_done", label: "triggerChecklistDone" },
  { id: "due_soon", label: "triggerDueSoon" },
  { id: "schedule", label: "triggerSchedule" },
  { id: "field_changed", label: "triggerFieldChanged" },
  { id: "sla_breach", label: "triggerSlaBreach" },
];

export function AutomationsPanel({
  boardId,
  lists,
  labels,
  members,
  customFields,
  initial,
  plan: initialPlan = "free",
}: Props) {
  const t = useT();
  const [rules, setRules] = useState(initial);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("card_moved");
  const [toListId, setToListId] = useState(lists[0]?.id ?? "");
  const [actions, setActions] = useState<AutomationAction[]>([
    { type: "set_priority", value: "high" },
  ]);
  const [condition, setCondition] = useState<AutomationCondition | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  const limits = PLAN_LIMITS[plan];
  const isPro = plan === "pro";
  const atRuleLimit = rules.length >= limits.automationRulesPerBoard;

  function defaultValue(type: AutomationAction["type"]) {
    switch (type) {
      case "set_priority":
        return "high";
      case "add_label":
        return labels[0]?.id ?? "";
      case "assign_user":
        return members[0]?.id ?? "";
      case "move_to_list":
        return lists[0]?.id ?? "";
      case "notify":
        return "Automation notification";
      case "set_custom_field":
        return customFields[0] ? `${customFields[0].id}:M` : "";
      case "add_checklist_item":
        return "Follow-up step";
      default:
        return "";
    }
  }

  async function upgradePro() {
    setUpgrading(true);
    setError("");
    const result = await startProCheckout();
    if (result.error) {
      setUpgrading(false);
      setError(result.error);
    }
  }

  async function createRule() {
    setSaving(true);
    setError("");
    const payloadActions = isPro
      ? actions
      : actions.slice(0, 1);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        name: name.trim() || t("newAutomation"),
        enabled: true,
        trigger,
        toListId:
          trigger === "card_moved" || trigger === "card_created"
            ? toListId
            : null,
        conditions: isPro && condition ? [condition] : [],
        actions: payloadActions,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || t("saveFailed"));
      return;
    }
    if (data.automation) {
      setRules((prev) => [data.automation, ...prev]);
      setName("");
    }
  }

  async function installSlaPack() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installSlaPack: true, boardId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || t("saveFailed"));
      return;
    }
    if (data.automation) {
      setRules((prev) =>
        prev.some((r) => r.id === data.automation.id)
          ? prev
          : [data.automation, ...prev],
      );
    }
  }

  async function toggle(rule: AutomationRule) {
    const res = await fetch(`/api/automations/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    const data = await res.json();
    if (data.automation) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? data.automation : r)),
      );
    }
  }

  async function remove(id: string) {
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function runOverdue() {
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runOverdue: true }),
    });
    alert(t("overdueDone"));
  }

  const triggerOptions: {
    id: AutomationTrigger;
    label: MessageKey;
    pro?: boolean;
  }[] = [
    ...freeTriggerKeys,
    ...proTriggerKeys.map((item) => ({ ...item, pro: true })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {!isPro && (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-accent">
                  {t("proUpsellTitle")}
                </div>
                <p className="mt-1 text-xs text-muted">{t("proUpsellText")}</p>
              </div>
              <button
                type="button"
                onClick={() => void upgradePro()}
                disabled={upgrading}
                className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
              >
                {upgrading ? t("upgrading") : t("unlockPro")}
              </button>
            </div>
          </div>
        )}

        {rules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-2xl border border-[var(--line)] bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  {rule.name}
                  {!(FREE_TRIGGERS as readonly string[]).includes(rule.trigger) ||
                  rule.actions.length > 1 ||
                  (rule.conditions?.length ?? 0) > 0 ? (
                    <span className="chip-pink rounded-full px-2 py-0.5 text-[10px]">
                      PRO
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {t("trigger")}: {rule.trigger}
                  {rule.toListId
                    ? ` · ${lists.find((l) => l.id === rule.toListId)?.title ?? "list"}`
                    : ""}
                  {" · "}
                  {rule.runs} {t("runs")}
                </div>
                {(rule.conditions?.length ?? 0) > 0 && (
                  <div className="mt-1 text-[11px] text-amber">
                    if {rule.conditions.map((c) => `${c.field} ${c.op} ${c.value}`).join(" & ")}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rule.actions.map((a, i) => (
                    <span
                      key={i}
                      className="chip-cyan rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {a.type}: {a.value.slice(0, 18)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void toggle(rule)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    rule.enabled ? "chip-lime" : "chip-rose"
                  }`}
                >
                  {rule.enabled ? t("on") : t("off")}
                </button>
                <button
                  onClick={() => void remove(rule.id)}
                  className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-muted"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-muted">{t("noRules")}</p>
        )}
      </div>

      <aside className="rounded-2xl border border-[var(--line)] bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{t("createRule")}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isPro ? "chip-pink" : "chip-violet"
            }`}
          >
            {isPro ? "PRO" : "FREE"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {t("rulesUsed")}: {rules.length}
          {Number.isFinite(limits.automationRulesPerBoard)
            ? ` / ${limits.automationRulesPerBoard}`
            : " · ∞"}
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase text-muted">
          {t("name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("newAutomation")}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm text-ink outline-none"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase text-muted">
          {t("trigger")}
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm"
          >
            {triggerOptions.map((item) => (
              <option
                key={item.id}
                value={item.id}
                disabled={Boolean(item.pro) && !isPro}
              >
                {t(item.label)}
                {item.pro ? " · PRO" : ""}
              </option>
            ))}
          </select>
        </label>
        {(trigger === "card_moved" || trigger === "card_created") && (
          <label className="mt-3 block text-xs font-semibold uppercase text-muted">
            {t("targetList")}
            <select
              value={toListId}
              onChange={(e) => setToListId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2 text-sm"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted">
            <span>{t("action")}</span>
            {isPro && actions.length < 10 && (
              <button
                type="button"
                className="text-brand"
                onClick={() =>
                  setActions((prev) => [
                    ...prev,
                    { type: "notify", value: "Follow-up" },
                  ])
                }
              >
                + {t("addAction")}
              </button>
            )}
          </div>
          {actions.map((action, index) => (
            <div key={index} className="mt-2 space-y-2 rounded-xl border border-[var(--line)] p-2">
              <select
                value={action.type}
                onChange={(e) => {
                  const type = e.target.value as AutomationAction["type"];
                  setActions((prev) =>
                    prev.map((a, i) =>
                      i === index ? { type, value: defaultValue(type) } : a,
                    ),
                  );
                }}
                className="w-full rounded-lg border border-[var(--line)] bg-paper px-2 py-1.5 text-sm"
              >
                <option value="set_priority">{t("actionSetPriority")}</option>
                <option value="add_label">{t("actionAddLabel")}</option>
                <option value="assign_user">{t("actionAssignUser")}</option>
                <option value="move_to_list">{t("actionMoveToList")}</option>
                <option value="notify">{t("actionNotify")}</option>
                <option value="set_custom_field">{t("actionSetCustomField")}</option>
                <option value="add_checklist_item">{t("actionAddChecklist")}</option>
              </select>
              <input
                value={action.value}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((a, i) =>
                      i === index ? { ...a, value: e.target.value } : a,
                    ),
                  )
                }
                className="w-full rounded-lg border border-[var(--line)] bg-paper px-2 py-1.5 text-sm"
              />
              {isPro && actions.length > 1 && (
                <button
                  type="button"
                  className="text-[11px] text-rose"
                  onClick={() =>
                    setActions((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  {t("removeAction")}
                </button>
              )}
            </div>
          ))}
          {!isPro && (
            <p className="mt-1 text-[11px] text-muted">{t("freeOneAction")}</p>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted">
            <span>{t("condition")} {!isPro && "· PRO"}</span>
            {isPro && (
              <button
                type="button"
                className="text-brand"
                onClick={() =>
                  setCondition(
                    condition
                      ? null
                      : { field: "priority", op: "eq", value: "urgent" },
                  )
                }
              >
                {condition ? t("clearCondition") : t("addCondition")}
              </button>
            )}
          </div>
          {isPro && condition && (
            <div className="mt-2 grid grid-cols-3 gap-1">
              <select
                value={condition.field}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    field: e.target.value as AutomationCondition["field"],
                  })
                }
                className="rounded-lg border border-[var(--line)] bg-paper px-1 py-1.5 text-xs"
              >
                <option value="priority">priority</option>
                <option value="listId">list</option>
                <option value="hasAssignee">assignee</option>
                <option value="labelId">label</option>
              </select>
              <select
                value={condition.op}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    op: e.target.value as AutomationCondition["op"],
                  })
                }
                className="rounded-lg border border-[var(--line)] bg-paper px-1 py-1.5 text-xs"
              >
                <option value="eq">eq</option>
                <option value="neq">neq</option>
                <option value="includes">includes</option>
                <option value="empty">empty</option>
                <option value="not_empty">not empty</option>
              </select>
              <input
                value={condition.value}
                onChange={(e) =>
                  setCondition({ ...condition, value: e.target.value })
                }
                className="rounded-lg border border-[var(--line)] bg-paper px-1 py-1.5 text-xs"
              />
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-rose">{error}</p>}

        <button
          onClick={() => void createRule()}
          disabled={saving || atRuleLimit}
          className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          {atRuleLimit
            ? t("ruleLimitReached")
            : saving
              ? t("saving")
              : t("addAutomation")}
        </button>
        {atRuleLimit && !isPro && (
          <p className="mt-2 text-center text-[11px] text-muted">
            <button type="button" className="text-accent underline" onClick={() => void upgradePro()}>
              {t("unlockPro")}
            </button>
          </p>
        )}
        <button
          onClick={() => void runOverdue()}
          className="mt-2 w-full rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-amber"
        >
          {t("runOverdueSweep")}
        </button>
        <button
          onClick={() => void installSlaPack()}
          disabled={saving || !isPro}
          className="mt-2 w-full rounded-full border border-accent/40 py-2.5 text-sm font-semibold text-accent disabled:opacity-50"
        >
          {t("installSlaPack")} {!isPro && "· PRO"}
        </button>
        <Link
          href="/account"
          className="mt-3 block text-center text-xs text-muted hover:text-brand"
        >
          {t("managePlan")}
        </Link>
      </aside>
    </div>
  );
}
