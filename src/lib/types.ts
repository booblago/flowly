import type { PlanId } from "./plans";

export type Priority = "low" | "medium" | "high" | "urgent";

export type AutomationTrigger =
  | "card_created"
  | "card_moved"
  | "priority_set"
  | "due_overdue"
  | "checklist_done"
  | "due_soon"
  | "schedule"
  | "field_changed"
  | "sla_breach";

export type AutomationActionType =
  | "set_priority"
  | "add_label"
  | "assign_user"
  | "move_to_list"
  | "notify"
  | "set_custom_field"
  | "add_checklist_item";

export type AutomationConditionField =
  | "priority"
  | "listId"
  | "hasAssignee"
  | "labelId";

export type AutomationConditionOp = "eq" | "neq" | "includes" | "empty" | "not_empty";

export interface AutomationCondition {
  field: AutomationConditionField;
  op: AutomationConditionOp;
  value: string;
}

export type RecurrenceFreq = "daily" | "weekly" | "monthly";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  avatarUrl?: string | null;
  bio?: string;
  company?: string;
  plan: PlanId;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  emailVerifiedAt?: string | null;
  emailVerifyToken?: string | null;
  emailVerifyExpires?: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

export interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

export interface CustomFieldDef {
  id: string;
  name: string;
  type: "text" | "number" | "select";
  options?: string[];
  color: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  background: string;
  memberIds: string[];
  labels: BoardLabel[];
  customFields: CustomFieldDef[];
  slaDays: number;
  shareToken: string | null;
  createdAt: string;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  wipLimit: number | null;
  accent: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Card {
  id: string;
  listId: string;
  boardId: string;
  title: string;
  description: string;
  position: number;
  labelIds: string[];
  assigneeIds: string[];
  dueDate: string | null;
  priority: Priority;
  estimateHours: number;
  loggedHours: number;
  checklist: ChecklistItem[];
  comments: Comment[];
  customFieldValues: Record<string, string | number>;
  enteredListAt: string;
  /** Set when marked complete (Trello-style checkbox). */
  completedAt: string | null;
  recurrence: RecurrenceFreq | null;
  nextOccurAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationAction {
  type: AutomationActionType;
  value: string;
}

export interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  /** Optional list id filter for move/create */
  fromListId?: string | null;
  toListId?: string | null;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  runs: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  boardId: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  href: string;
  createdAt: string;
}

export interface Database {
  users: User[];
  workspaces: Workspace[];
  boards: Board[];
  lists: List[];
  cards: Card[];
  activities: Activity[];
  notifications: Notification[];
  automations: AutomationRule[];
}

export type PublicUser = Omit<
  User,
  "passwordHash" | "emailVerifyToken" | "emailVerifyExpires"
>;
