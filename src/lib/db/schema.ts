import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio").notNull().default(""),
  company: text("company").notNull().default(""),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  createdAt: text("created_at").notNull(),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  ownerId: text("owner_id").notNull(),
  memberIds: text("member_ids").notNull(), // JSON string[]
  createdAt: text("created_at").notNull(),
});

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  background: text("background").notNull(),
  memberIds: text("member_ids").notNull(), // JSON
  labels: text("labels").notNull(), // JSON
  customFields: text("custom_fields").notNull(), // JSON
  slaDays: integer("sla_days").notNull().default(5),
  shareToken: text("share_token"),
  createdAt: text("created_at").notNull(),
});

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull(),
  wipLimit: integer("wip_limit"),
  accent: text("accent").notNull(),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull(),
  boardId: text("board_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull(),
  labelIds: text("label_ids").notNull(), // JSON
  assigneeIds: text("assignee_ids").notNull(), // JSON
  dueDate: text("due_date"),
  priority: text("priority").notNull(),
  estimateHours: integer("estimate_hours").notNull().default(0),
  loggedHours: integer("logged_hours").notNull().default(0),
  checklist: text("checklist").notNull(), // JSON
  comments: text("comments").notNull(), // JSON
  customFieldValues: text("custom_field_values").notNull(), // JSON
  enteredListAt: text("entered_list_at").notNull(),
  completedAt: text("completed_at"),
  recurrence: text("recurrence"),
  nextOccurAt: text("next_occur_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  href: text("href").notNull(),
  createdAt: text("created_at").notNull(),
});

export const automations = sqliteTable("automations", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  trigger: text("trigger").notNull(),
  fromListId: text("from_list_id"),
  toListId: text("to_list_id"),
  conditions: text("conditions").notNull().default("[]"), // JSON
  actions: text("actions").notNull(), // JSON
  runs: integer("runs").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
