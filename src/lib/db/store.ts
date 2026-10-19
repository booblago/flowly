import { promises as fs } from "fs";
import path from "path";
import type {
  Activity,
  AutomationRule,
  Board,
  Card,
  Database as AppDatabase,
  List,
  Notification,
  User,
  Workspace,
} from "@/lib/types";
import {
  isMemoryDb,
  loadMemoryDb,
  memoryHasUsers,
  saveMemoryDb,
} from "./memory";
import { exportPrivateOwnerTables } from "./private-export";
import * as schema from "./schema";

function localClient() {
  // Lazy — avoid loading native better-sqlite3 on Vercel.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./client") as typeof import("./client");
}

function jparse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function jstr(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function loadFromSqlite(): AppDatabase {
  if (isMemoryDb()) return loadMemoryDb();
  const { getSqlite, getDb } = localClient();
  getSqlite();
  const db = getDb();

  const users = db.select().from(schema.users).all().map(
    (r): User => ({
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.passwordHash,
      avatarColor: r.avatarColor,
      avatarUrl: r.avatarUrl ?? null,
      bio: r.bio ?? "",
      company: r.company ?? "",
      plan: (r.plan === "pro" ? "pro" : "free") as User["plan"],
      stripeCustomerId: r.stripeCustomerId ?? null,
      stripeSubscriptionId: r.stripeSubscriptionId ?? null,
      stripeSubscriptionStatus: r.stripeSubscriptionStatus ?? null,
      createdAt: r.createdAt,
    }),
  );

  const workspaces = db.select().from(schema.workspaces).all().map(
    (r): Workspace => ({
      id: r.id,
      name: r.name,
      description: r.description,
      ownerId: r.ownerId,
      memberIds: jparse(r.memberIds, []),
      createdAt: r.createdAt,
    }),
  );

  const boards = db.select().from(schema.boards).all().map(
    (r): Board => ({
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      description: r.description,
      background: r.background,
      memberIds: jparse(r.memberIds, []),
      labels: jparse(r.labels, []),
      customFields: jparse(r.customFields, []),
      slaDays: r.slaDays ?? 5,
      shareToken: r.shareToken ?? null,
      createdAt: r.createdAt,
    }),
  );

  const lists = db.select().from(schema.lists).all().map(
    (r): List => ({
      id: r.id,
      boardId: r.boardId,
      title: r.title,
      position: r.position,
      wipLimit: r.wipLimit ?? null,
      accent: r.accent,
    }),
  );

  const cards = db.select().from(schema.cards).all().map(
    (r): Card => ({
      id: r.id,
      listId: r.listId,
      boardId: r.boardId,
      title: r.title,
      description: r.description,
      position: r.position,
      labelIds: jparse(r.labelIds, []),
      assigneeIds: jparse(r.assigneeIds, []),
      dueDate: r.dueDate ?? null,
      priority: r.priority as Card["priority"],
      estimateHours: r.estimateHours ?? 0,
      loggedHours: r.loggedHours ?? 0,
      checklist: jparse(r.checklist, []),
      comments: jparse(r.comments, []),
      customFieldValues: jparse(r.customFieldValues, {}),
      enteredListAt: r.enteredListAt,
      completedAt: r.completedAt ?? null,
      recurrence: (r.recurrence as Card["recurrence"]) ?? null,
      nextOccurAt: r.nextOccurAt ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }),
  );

  const activities = db.select().from(schema.activities).all().map(
    (r): Activity => ({
      id: r.id,
      boardId: r.boardId,
      userId: r.userId,
      message: r.message,
      createdAt: r.createdAt,
    }),
  );

  const notifications = db.select().from(schema.notifications).all().map(
    (r): Notification => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      body: r.body,
      read: Boolean(r.read),
      href: r.href,
      createdAt: r.createdAt,
    }),
  );

  const automations = db.select().from(schema.automations).all().map(
    (r): AutomationRule => ({
      id: r.id,
      boardId: r.boardId,
      name: r.name,
      enabled: Boolean(r.enabled),
      trigger: r.trigger as AutomationRule["trigger"],
      fromListId: r.fromListId ?? null,
      toListId: r.toListId ?? null,
      conditions: jparse(r.conditions ?? "[]", []),
      actions: jparse(r.actions, []),
      runs: r.runs ?? 0,
      createdAt: r.createdAt,
    }),
  );

  return {
    users,
    workspaces,
    boards,
    lists,
    cards,
    activities,
    notifications,
    automations,
  };
}

export function saveToSqlite(data: AppDatabase) {
  if (isMemoryDb()) {
    saveMemoryDb(data);
    return;
  }
  const { getSqlite, getDb } = localClient();
  const sqlite = getSqlite();
  const db = getDb();

  const tx = sqlite.transaction(() => {
    sqlite.exec(`
      DELETE FROM automations;
      DELETE FROM notifications;
      DELETE FROM activities;
      DELETE FROM cards;
      DELETE FROM lists;
      DELETE FROM boards;
      DELETE FROM workspaces;
      DELETE FROM users;
    `);

    if (data.users.length) {
      db.insert(schema.users)
        .values(
          data.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            passwordHash: u.passwordHash,
            avatarColor: u.avatarColor,
            avatarUrl: u.avatarUrl ?? null,
            bio: u.bio ?? "",
            company: u.company ?? "",
            plan: u.plan ?? "free",
            stripeCustomerId: u.stripeCustomerId ?? null,
            stripeSubscriptionId: u.stripeSubscriptionId ?? null,
            stripeSubscriptionStatus: u.stripeSubscriptionStatus ?? null,
            createdAt: u.createdAt,
          })),
        )
        .run();
    }

    if (data.workspaces.length) {
      db.insert(schema.workspaces)
        .values(
          data.workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            ownerId: w.ownerId,
            memberIds: jstr(w.memberIds),
            createdAt: w.createdAt,
          })),
        )
        .run();
    }

    if (data.boards.length) {
      db.insert(schema.boards)
        .values(
          data.boards.map((b) => ({
            id: b.id,
            workspaceId: b.workspaceId,
            name: b.name,
            description: b.description,
            background: b.background,
            memberIds: jstr(b.memberIds),
            labels: jstr(b.labels),
            customFields: jstr(b.customFields ?? []),
            slaDays: b.slaDays ?? 5,
            shareToken: b.shareToken ?? null,
            createdAt: b.createdAt,
          })),
        )
        .run();
    }

    if (data.lists.length) {
      db.insert(schema.lists)
        .values(
          data.lists.map((l) => ({
            id: l.id,
            boardId: l.boardId,
            title: l.title,
            position: l.position,
            wipLimit: l.wipLimit,
            accent: l.accent,
          })),
        )
        .run();
    }

    if (data.cards.length) {
      db.insert(schema.cards)
        .values(
          data.cards.map((c) => ({
            id: c.id,
            listId: c.listId,
            boardId: c.boardId,
            title: c.title,
            description: c.description,
            position: c.position,
            labelIds: jstr(c.labelIds),
            assigneeIds: jstr(c.assigneeIds),
            dueDate: c.dueDate,
            priority: c.priority,
            estimateHours: c.estimateHours,
            loggedHours: c.loggedHours,
            checklist: jstr(c.checklist),
            comments: jstr(c.comments),
            customFieldValues: jstr(c.customFieldValues ?? {}),
            enteredListAt: c.enteredListAt,
            completedAt: c.completedAt ?? null,
            recurrence: c.recurrence ?? null,
            nextOccurAt: c.nextOccurAt ?? null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        )
        .run();
    }

    if (data.activities.length) {
      db.insert(schema.activities)
        .values(
          data.activities.map((a) => ({
            id: a.id,
            boardId: a.boardId,
            userId: a.userId,
            message: a.message,
            createdAt: a.createdAt,
          })),
        )
        .run();
    }

    if (data.notifications.length) {
      db.insert(schema.notifications)
        .values(
          data.notifications.map((n) => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            body: n.body,
            read: n.read,
            href: n.href,
            createdAt: n.createdAt,
          })),
        )
        .run();
    }

    if (data.automations.length) {
      db.insert(schema.automations)
        .values(
          data.automations.map((a) => ({
            id: a.id,
            boardId: a.boardId,
            name: a.name,
            enabled: a.enabled,
            trigger: a.trigger,
            fromListId: a.fromListId ?? null,
            toListId: a.toListId ?? null,
            conditions: jstr(a.conditions ?? []),
            actions: jstr(a.actions),
            runs: a.runs,
            createdAt: a.createdAt,
          })),
        )
        .run();
    }
  });

  tx();
  if (!isMemoryDb()) {
    exportPrivateOwnerTables(data);
  }
}

export function sqliteHasUsers() {
  if (isMemoryDb()) return memoryHasUsers();
  const { getSqlite } = localClient();
  const row = getSqlite()
    .prepare("SELECT COUNT(*) AS c FROM users")
    .get() as { c: number };
  return row.c > 0;
}

export async function importLegacyJsonIfPresent(): Promise<AppDatabase | null> {
  const legacyPath = path.join(process.cwd(), "data", "db.json");
  try {
    const raw = await fs.readFile(legacyPath, "utf8");
    const parsed = JSON.parse(raw) as AppDatabase;
    if (!parsed?.users?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function dbFilePath() {
  if (isMemoryDb()) return "(memory)";
  return localClient().SQLITE_PATH;
}
