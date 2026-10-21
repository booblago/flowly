export type PlanId = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    boards: 3,
    automationRulesPerBoard: 3,
    maxActionsPerRule: 1,
    membersPerWorkspace: 3,
    allowConditions: false,
    allowProTriggers: false,
    allowSlaEscalate: false,
    allowRecurring: false,
    allowReports: false,
    allowWorkload: false,
  },
  pro: {
    boards: 20,
    automationRulesPerBoard: Infinity,
    maxActionsPerRule: 10,
    membersPerWorkspace: 15,
    allowConditions: true,
    allowProTriggers: true,
    allowSlaEscalate: true,
    allowRecurring: true,
    allowReports: true,
    allowWorkload: true,
  },
} as const;

export const FREE_TRIGGERS = [
  "card_created",
  "card_moved",
  "priority_set",
  "due_overdue",
] as const;

export const PRO_TRIGGERS = [
  "checklist_done",
  "due_soon",
  "schedule",
  "field_changed",
  "sla_breach",
] as const;

export const ALL_TRIGGERS = [...FREE_TRIGGERS, ...PRO_TRIGGERS] as const;

export function planLimits(plan: PlanId = "free") {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function isProTrigger(trigger: string) {
  return (PRO_TRIGGERS as readonly string[]).includes(trigger);
}

export function isPro(plan: PlanId | string | null | undefined) {
  return plan === "pro";
}
