import bcrypt from "bcryptjs";
import type {
  Activity,
  AutomationCondition,
  AutomationRule,
  Board,
  Card,
  Database,
  List,
  Notification,
  Priority,
  PublicUser,
  RecurrenceFreq,
  User,
  Workspace,
} from "./types";
import { isProTrigger, planLimits, type PlanId } from "./plans";
import { LIST_ACCENTS, uid } from "./utils";
import {
  dbFilePath,
  importLegacyJsonIfPresent,
  loadFromSqlite,
  saveToSqlite,
  sqliteHasUsers,
} from "./db/store";

/** Inline env helpers — avoid importing ./owner here (Turbopack circular / TDZ). */
function ownerEmailList(): string[] {
  const raw = process.env.OWNER_EMAIL || process.env.OWNER_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function emailIsOwner(email?: string | null) {
  if (!email) return false;
  const owners = ownerEmailList();
  return owners.length > 0 && owners.includes(email.toLowerCase());
}

function verificationRequired() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function ownerPasswordFromEnv() {
  return (process.env.OWNER_PASSWORD || "").trim() || null;
}

function boardAllowsUser(db: Database, boardId: string, userId: string) {
  const board = db.boards.find((b) => b.id === boardId);
  if (!board) return false;
  if (board.memberIds.includes(userId)) return true;
  const ws = db.workspaces.find((w) => w.id === board.workspaceId);
  return Boolean(ws?.memberIds.includes(userId));
}

function migrate(db: Database): Database {
  db.automations ??= [];
  db.users = db.users.map((u) => ({
    ...u,
    avatarUrl: u.avatarUrl ?? null,
    bio: u.bio ?? "",
    company: u.company ?? "",
    plan: u.plan === "pro" ? "pro" : "free",
    stripeCustomerId: u.stripeCustomerId ?? null,
    stripeSubscriptionId: u.stripeSubscriptionId ?? null,
    stripeSubscriptionStatus: u.stripeSubscriptionStatus ?? null,
    // Legacy / demo accounts count as verified
    emailVerifiedAt:
      u.emailVerifiedAt ??
      (u.email.endsWith("@flowly.app") ? u.createdAt : null),
    emailVerifyToken: u.emailVerifyToken ?? null,
    emailVerifyExpires: u.emailVerifyExpires ?? null,
  }));
  db.boards = db.boards.map((b) => ({
    ...b,
    customFields: b.customFields ?? [],
    slaDays: b.slaDays ?? 5,
    shareToken: b.shareToken ?? null,
  }));
  db.lists = db.lists.map((l, i) => ({
    ...l,
    wipLimit: l.wipLimit ?? null,
    accent: l.accent ?? LIST_ACCENTS[i % LIST_ACCENTS.length],
  }));
  db.cards = db.cards.map((c) => {
    const enteredListAt = c.enteredListAt ?? c.updatedAt ?? c.createdAt;
    const inDone = db.lists.some(
      (l) =>
        l.id === c.listId && /done|complete|resolved|published/i.test(l.title),
    );
    return {
      ...c,
      customFieldValues: c.customFieldValues ?? {},
      enteredListAt,
      completedAt: c.completedAt ?? (inDone ? c.updatedAt ?? c.createdAt : null),
      recurrence: c.recurrence ?? null,
      nextOccurAt: c.nextOccurAt ?? null,
    };
  });
  db.automations = db.automations.map((a) => ({
    ...a,
    conditions: a.conditions ?? [],
  }));
  return db;
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  const user = await findUserById(userId);
  return user?.plan === "pro" ? "pro" : "free";
}

export async function setUserPlan(userId: string, plan: PlanId) {
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) user.plan = plan;
  });
  const user = await findUserById(userId);
  return user ? toPublicUser(user) : null;
}

export async function setUserStripeBilling(
  userId: string,
  patch: {
    plan?: PlanId;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeSubscriptionStatus?: string | null;
  },
) {
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return;
    if (patch.plan) user.plan = patch.plan;
    if (patch.stripeCustomerId !== undefined) {
      user.stripeCustomerId = patch.stripeCustomerId;
    }
    if (patch.stripeSubscriptionId !== undefined) {
      user.stripeSubscriptionId = patch.stripeSubscriptionId;
    }
    if (patch.stripeSubscriptionStatus !== undefined) {
      user.stripeSubscriptionStatus = patch.stripeSubscriptionStatus;
    }
  });
  const user = await findUserById(userId);
  return user ? toPublicUser(user) : null;
}

export async function findUserByStripeCustomerId(customerId: string) {
  const db = await readDb();
  return db.users.find((u) => u.stripeCustomerId === customerId) ?? null;
}

export async function listUsersForAdmin() {
  const db = await readDb();
  return db.users.map(toPublicUser).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

/** Permanently delete a user and cascade their owned workspace data. */
export async function deleteUserAccount(userId: string, actorId: string) {
  if (userId === actorId) {
    throw new Error("You cannot delete your own owner account from admin.");
  }
  let removedEmail: string | null = null;
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    removedEmail = user.email;

    const ownedWorkspaceIds = new Set(
      db.workspaces.filter((w) => w.ownerId === userId).map((w) => w.id),
    );
    const ownedBoardIds = new Set(
      db.boards
        .filter((b) => ownedWorkspaceIds.has(b.workspaceId))
        .map((b) => b.id),
    );

    db.automations = db.automations.filter((a) => !ownedBoardIds.has(a.boardId));
    db.activities = db.activities.filter((a) => !ownedBoardIds.has(a.boardId));
    db.cards = db.cards.filter((c) => !ownedBoardIds.has(c.boardId));
    db.lists = db.lists.filter((l) => !ownedBoardIds.has(l.boardId));
    db.boards = db.boards.filter((b) => !ownedBoardIds.has(b.id));
    db.workspaces = db.workspaces.filter((w) => !ownedWorkspaceIds.has(w.id));

    db.notifications = db.notifications.filter((n) => n.userId !== userId);

    for (const ws of db.workspaces) {
      ws.memberIds = ws.memberIds.filter((id) => id !== userId);
    }
    for (const board of db.boards) {
      board.memberIds = board.memberIds.filter((id) => id !== userId);
    }
    for (const card of db.cards) {
      card.assigneeIds = card.assigneeIds.filter((id) => id !== userId);
    }

    db.users = db.users.filter((u) => u.id !== userId);
  });
  return { deletedId: userId, email: removedEmail };
}

function assertPlanAllowsAutomation(
  plan: PlanId,
  existingCount: number,
  rule: Pick<AutomationRule, "trigger" | "actions" | "conditions">,
) {
  const limits = planLimits(plan);
  if (existingCount >= limits.automationRulesPerBoard) {
    throw new Error(
      `Free plan allows ${limits.automationRulesPerBoard} automation rules per board. Upgrade to Pro.`,
    );
  }
  if (rule.actions.length > limits.maxActionsPerRule) {
    throw new Error(
      `Free plan allows ${limits.maxActionsPerRule} action per rule. Upgrade to Pro for multi-action rules.`,
    );
  }
  if ((rule.conditions?.length ?? 0) > 0 && !limits.allowConditions) {
    throw new Error("Conditions require Flowly Pro.");
  }
  if (isProTrigger(rule.trigger) && !limits.allowProTriggers) {
    throw new Error(`Trigger "${rule.trigger}" requires Flowly Pro.`);
  }
}

function findDoneList(db: Database, boardId: string) {
  const boardLists = db.lists
    .filter((l) => l.boardId === boardId)
    .sort((a, b) => a.position - b.position);
  return (
    boardLists.find((l) => /done|complete|resolved|published/i.test(l.title)) ||
    boardLists[boardLists.length - 1] ||
    null
  );
}

async function ensureDb(): Promise<Database> {
  if (await sqliteHasUsers()) {
    const data = migrate(await loadFromSqlite());
    let dirty = false;
    const demo = data.users.find((u) => u.email === "demo@flowly.app");
    if (demo && demo.plan !== "pro") {
      demo.plan = "pro";
      dirty = true;
    }
    if (await ensureOwnerAccounts(data)) dirty = true;
    if (dirty) await saveToSqlite(data);
    return data;
  }

  const legacy = await importLegacyJsonIfPresent();
  if (legacy?.users?.length) {
    const migrated = migrate(legacy);
    if (!migrated.automations?.length && migrated.boards.some((b) => b.id === "brd_product")) {
      const seeded = await buildSeed();
      await ensureOwnerAccounts(seeded);
      await saveToSqlite(seeded);
      return seeded;
    }
    await ensureOwnerAccounts(migrated);
    await saveToSqlite(migrated);
    return migrated;
  }

  const seeded = await buildSeed();
  await ensureOwnerAccounts(seeded);
  await saveToSqlite(seeded);
  return seeded;
}

async function writeDb(db: Database) {
  await saveToSqlite(migrate(db));
}

export async function readDb() {
  return ensureDb();
}

export async function updateDb(mutator: (db: Database) => void) {
  const db = await ensureDb();
  mutator(db);
  await writeDb(db);
  return db;
}

/** Absolute path to the SQLite file — useful for demos / ops. */
export function getDatabasePath() {
  return dbFilePath();
}

export function toPublicUser(user: User): PublicUser {
  const {
    passwordHash: _p,
    emailVerifyToken: _t,
    emailVerifyExpires: _e,
    ...rest
  } = user;
  return rest;
}

export async function findUserByEmail(email: string) {
  const db = await readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  const db = await readDb();
  return db.users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const colors = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#a78bfa"];
  const email = input.email.toLowerCase();
  const skipVerify =
    !verificationRequired() || emailIsOwner(email) || email.endsWith("@flowly.app");
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, 10);

  // After Vercel DB wipes, an orphan account can block register while login fails
  // (empty/unknown hash). In sandbox (no Resend) reclaim the email + set password.
  const existing = await findUserByEmail(email);
  if (existing) {
    const canReclaim =
      !verificationRequired() ||
      !existing.passwordHash ||
      emailIsOwner(email);
    if (!canReclaim) {
      throw new Error("Email already registered");
    }

    let publicUser: PublicUser | null = null;
    await updateDb((db) => {
      const user = db.users.find((u) => u.email.toLowerCase() === email);
      if (!user) throw new Error("Email already registered");
      user.name = input.name.trim() || user.name;
      user.passwordHash = passwordHash;
      user.emailVerifiedAt = now;
      user.emailVerifyToken = null;
      user.emailVerifyExpires = null;
      if (emailIsOwner(email)) user.plan = "pro";
      const hasWorkspace = db.workspaces.some(
        (w) => w.ownerId === user.id || w.memberIds.includes(user.id),
      );
      if (!hasWorkspace) {
        db.workspaces.push({
          id: uid("ws"),
          name: `${user.name.split(" ")[0]}'s Workspace`,
          description: "Personal workspace",
          ownerId: user.id,
          memberIds: [user.id],
          createdAt: now,
        });
      }
      publicUser = toPublicUser(user);
    });

    return {
      user: publicUser!,
      verifyToken: "",
      needsVerification: false,
    };
  }

  const verifyToken = skipVerify
    ? null
    : uid("verify").replace(/^verify_/, "") + uid("t");
  const user: User = {
    id: uid("usr"),
    name: input.name,
    email,
    passwordHash,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    avatarUrl: null,
    bio: "",
    company: "",
    plan: emailIsOwner(email) ? "pro" : "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
    emailVerifiedAt: skipVerify ? now : null,
    emailVerifyToken: verifyToken,
    emailVerifyExpires: skipVerify
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now,
  };

  await updateDb((db) => {
    db.users.push(user);
    const workspace: Workspace = {
      id: uid("ws"),
      name: `${input.name.split(" ")[0]}'s Workspace`,
      description: "Personal workspace",
      ownerId: user.id,
      memberIds: [user.id],
      createdAt: new Date().toISOString(),
    };
    db.workspaces.push(workspace);
  });

  return {
    user: toPublicUser(user),
    verifyToken: verifyToken ?? "",
    needsVerification: !skipVerify,
  };
}

/** Recreate OWNER_EMAIL after ephemeral Vercel DB wipes so login keeps working. */
async function ensureOwnerAccounts(db: Database): Promise<boolean> {
  const password = ownerPasswordFromEnv();
  const emails = ownerEmailList();
  if (!emails.length) return false;

  let dirty = false;
  const now = new Date().toISOString();
  const forceReset = process.env.OWNER_RESET_PASSWORD === "1";

  for (const email of emails) {
    let user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      if (!password) continue;
      const passwordHash = await bcrypt.hash(password, 10);
      user = {
        id: uid("usr"),
        name: email.split("@")[0] || "Owner",
        email,
        passwordHash,
        avatarColor: "#a78bfa",
        avatarUrl: null,
        bio: "",
        company: "",
        plan: "pro",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        emailVerifiedAt: now,
        emailVerifyToken: null,
        emailVerifyExpires: null,
        createdAt: now,
      };
      db.users.push(user);
      db.workspaces.push({
        id: uid("ws"),
        name: "Owner Workspace",
        description: "Personal workspace",
        ownerId: user.id,
        memberIds: [user.id],
        createdAt: now,
      });
      dirty = true;
      continue;
    }

    if (user.plan !== "pro") {
      user.plan = "pro";
      dirty = true;
    }
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = now;
      user.emailVerifyToken = null;
      user.emailVerifyExpires = null;
      dirty = true;
    }
    if (forceReset && password) {
      user.passwordHash = await bcrypt.hash(password, 10);
      dirty = true;
    }
    const hasWorkspace = db.workspaces.some(
      (w) => w.ownerId === user!.id || w.memberIds.includes(user!.id),
    );
    if (!hasWorkspace) {
      db.workspaces.push({
        id: uid("ws"),
        name: "Owner Workspace",
        description: "Personal workspace",
        ownerId: user.id,
        memberIds: [user.id],
        createdAt: now,
      });
      dirty = true;
    }
  }

  return dirty;
}

export async function verifyEmailToken(token: string) {
  let verifiedEmail: string | null = null;
  await updateDb((db) => {
    const user = db.users.find((u) => u.emailVerifyToken === token);
    if (!user) throw new Error("Invalid or expired verification link");
    if (
      user.emailVerifyExpires &&
      new Date(user.emailVerifyExpires).getTime() < Date.now()
    ) {
      throw new Error("Verification link expired — register again or request a new link");
    }
    user.emailVerifiedAt = new Date().toISOString();
    user.emailVerifyToken = null;
    user.emailVerifyExpires = null;
    verifiedEmail = user.email;
  });
  return verifiedEmail;
}

export function isEmailVerified(user: User) {
  return Boolean(user.emailVerifiedAt);
}

/**
 * After Vercel cold starts the memory DB is empty while the JWT session remains.
 * Recreate the signed-in user + personal workspace so the UI keeps working.
 */
export async function ensureSessionUser(input: {
  id: string;
  name?: string | null;
  email?: string | null;
}) {
  if (!input.email) return null;
  const email = input.email.toLowerCase();
  const colors = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24", "#a78bfa"];

  await updateDb((db) => {
    let user =
      db.users.find((u) => u.id === input.id) ??
      db.users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      user = {
        id: input.id,
        name: (input.name || email.split("@")[0] || "User").trim(),
        email,
        passwordHash: "",
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        avatarUrl: null,
        bio: "",
        company: "",
        plan: "free",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        emailVerifiedAt: new Date().toISOString(),
        emailVerifyToken: null,
        emailVerifyExpires: null,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    } else if (user.id !== input.id) {
      // Keep session id stable for membership checks.
      user.id = input.id;
    }

    const hasWorkspace = db.workspaces.some(
      (w) => w.ownerId === input.id || w.memberIds.includes(input.id),
    );
    if (!hasWorkspace) {
      db.workspaces.push({
        id: uid("ws"),
        name: `${user.name.split(" ")[0]}'s Workspace`,
        description: "Personal workspace",
        ownerId: input.id,
        memberIds: [input.id],
        createdAt: new Date().toISOString(),
      });
    }
  });

  const workspaces = await getWorkspacesForUser(input.id);
  return workspaces[0] ?? null;
}

export async function verifyPassword(user: User, password: string) {
  return bcrypt.compare(password, user.passwordHash);
}

export function userImage(user: User) {
  return user.avatarUrl || user.avatarColor;
}

export async function updateUserProfile(
  userId: string,
  patch: {
    name?: string;
    email?: string;
    bio?: string;
    company?: string;
    avatarColor?: string;
    avatarUrl?: string | null;
    password?: string;
  },
) {
  const current = await findUserById(userId);
  if (!current) return null;
  if (patch.email && patch.email.toLowerCase() !== current.email) {
    const taken = await findUserByEmail(patch.email);
    if (taken) throw new Error("Email already in use");
  }
  const passwordHash = patch.password
    ? await bcrypt.hash(patch.password, 10)
    : null;

  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return;
    if (patch.email) user.email = patch.email.toLowerCase();
    if (patch.name != null) user.name = patch.name.trim();
    if (patch.bio != null) user.bio = patch.bio;
    if (patch.company != null) user.company = patch.company;
    if (patch.avatarColor != null) user.avatarColor = patch.avatarColor;
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
    if (passwordHash) user.passwordHash = passwordHash;
  });

  const updated = await findUserById(userId);
  return updated ? toPublicUser(updated) : null;
}

export async function getWorkspacesForUser(userId: string) {
  const db = await readDb();
  return db.workspaces.filter((w) => w.memberIds.includes(userId));
}

export async function getBoardsForUser(userId: string) {
  const db = await readDb();
  const workspaceIds = db.workspaces
    .filter((w) => w.memberIds.includes(userId))
    .map((w) => w.id);
  return db.boards.filter(
    (b) => workspaceIds.includes(b.workspaceId) || b.memberIds.includes(userId),
  );
}

export async function userCanAccessBoard(userId: string, boardId: string) {
  const boards = await getBoardsForUser(userId);
  return boards.some((b) => b.id === boardId);
}

export async function assertBoardAccess(userId: string, boardId: string) {
  if (!(await userCanAccessBoard(userId, boardId))) {
    throw new Error("Forbidden");
  }
}

export async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const workspaces = await getWorkspacesForUser(userId);
  if (!workspaces.some((w) => w.id === workspaceId)) {
    throw new Error("Forbidden");
  }
}

export async function getBoardBundle(boardId: string) {
  const db = await readDb();
  const board = db.boards.find((b) => b.id === boardId);
  if (!board) return null;
  const lists = db.lists
    .filter((l) => l.boardId === boardId)
    .sort((a, b) => a.position - b.position);
  const cards = db.cards
    .filter((c) => c.boardId === boardId)
    .sort((a, b) => a.position - b.position);
  const activities = db.activities
    .filter((a) => a.boardId === boardId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);
  const members = db.users
    .filter((u) => board.memberIds.includes(u.id))
    .map(toPublicUser);
  const automations = db.automations.filter((a) => a.boardId === boardId);
  return { board, lists, cards, activities, members, automations };
}

function matchesCondition(card: Card, condition: AutomationCondition) {
  switch (condition.field) {
    case "priority":
      if (condition.op === "eq") return card.priority === condition.value;
      if (condition.op === "neq") return card.priority !== condition.value;
      return true;
    case "listId":
      if (condition.op === "eq") return card.listId === condition.value;
      if (condition.op === "neq") return card.listId !== condition.value;
      return true;
    case "hasAssignee":
      if (condition.op === "empty") return card.assigneeIds.length === 0;
      if (condition.op === "not_empty") return card.assigneeIds.length > 0;
      return true;
    case "labelId":
      if (condition.op === "includes") return card.labelIds.includes(condition.value);
      if (condition.op === "eq") return card.labelIds.includes(condition.value);
      return true;
    default:
      return true;
  }
}

function ruleConditionsPass(card: Card, rule: AutomationRule) {
  const conditions = rule.conditions ?? [];
  return conditions.every((c) => matchesCondition(card, c));
}

function applyAutomationActions(
  db: Database,
  card: Card,
  rule: AutomationRule,
  userId: string,
) {
  for (const action of rule.actions) {
    switch (action.type) {
      case "set_priority":
        card.priority = action.value as Priority;
        break;
      case "add_label":
        if (!card.labelIds.includes(action.value)) {
          card.labelIds.push(action.value);
        }
        break;
      case "assign_user":
        if (!card.assigneeIds.includes(action.value)) {
          card.assigneeIds.push(action.value);
        }
        break;
      case "move_to_list": {
        const target = db.lists.find((l) => l.id === action.value);
        if (target && target.id !== card.listId) {
          card.listId = target.id;
          card.enteredListAt = new Date().toISOString();
        }
        break;
      }
      case "set_custom_field": {
        const [fieldId, ...rest] = action.value.split(":");
        card.customFieldValues[fieldId] = rest.join(":");
        break;
      }
      case "add_checklist_item":
        card.checklist.push({
          id: uid("chk"),
          text: action.value,
          done: false,
        });
        break;
      case "notify":
        for (const memberId of card.assigneeIds.length
          ? card.assigneeIds
          : db.boards.find((b) => b.id === card.boardId)?.memberIds ?? []) {
          db.notifications.unshift({
            id: uid("ntf"),
            userId: memberId,
            title: `Automation: ${rule.name}`,
            body: action.value || `Rule ran on "${card.title}"`,
            read: false,
            href: `/board/${card.boardId}`,
            createdAt: new Date().toISOString(),
          });
        }
        break;
      default:
        break;
    }
  }
  rule.runs += 1;
  db.activities.unshift({
    id: uid("act"),
    boardId: card.boardId,
    userId,
    message: `automation "${rule.name}" ran on "${card.title}"`,
    createdAt: new Date().toISOString(),
  });
}

function runAutomations(
  db: Database,
  input: {
    boardId: string;
    card: Card;
    userId: string;
    trigger: AutomationRule["trigger"];
    fromListId?: string;
    toListId?: string;
  },
) {
  const rules = db.automations.filter(
    (r) =>
      r.boardId === input.boardId &&
      r.enabled &&
      r.trigger === input.trigger,
  );
  for (const rule of rules) {
    if (rule.trigger === "card_moved") {
      if (rule.fromListId && rule.fromListId !== input.fromListId) continue;
      if (rule.toListId && rule.toListId !== input.toListId) continue;
    }
    if (rule.trigger === "card_created" && rule.toListId && rule.toListId !== input.toListId) {
      continue;
    }
    if (!ruleConditionsPass(input.card, rule)) continue;
    applyAutomationActions(db, input.card, rule, input.userId);
  }
}

export async function createBoard(input: {
  workspaceId: string;
  name: string;
  description?: string;
  userId: string;
  template?: "delivery" | "support" | "content";
}) {
  const template = input.template ?? "delivery";
  const presets = {
    delivery: {
      lists: [
        { title: "Backlog", wip: null, accent: "#a78bfa" },
        { title: "Ready", wip: 8, accent: "#22d3ee" },
        { title: "In Progress", wip: 3, accent: "#fbbf24" },
        { title: "Review", wip: 4, accent: "#f472b6" },
        { title: "Done", wip: null, accent: "#a3e635" },
      ],
      automations: true,
    },
    support: {
      lists: [
        { title: "New", wip: null, accent: "#22d3ee" },
        { title: "Triaged", wip: 10, accent: "#a78bfa" },
        { title: "Working", wip: 4, accent: "#fbbf24" },
        { title: "Waiting", wip: 6, accent: "#f472b6" },
        { title: "Resolved", wip: null, accent: "#a3e635" },
      ],
      automations: true,
    },
    content: {
      lists: [
        { title: "Ideas", wip: null, accent: "#a78bfa" },
        { title: "Writing", wip: 3, accent: "#22d3ee" },
        { title: "Edit", wip: 3, accent: "#fbbf24" },
        { title: "Published", wip: null, accent: "#a3e635" },
      ],
      automations: true,
    },
  } as const;

  const preset = presets[template];
  const board: Board = {
    id: uid("brd"),
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description ?? "",
    background: "dark-neon",
    memberIds: [input.userId],
    labels: [
      { id: uid("lbl"), name: "Design", color: "#22d3ee" },
      { id: uid("lbl"), name: "Bug", color: "#fb7185" },
      { id: uid("lbl"), name: "Feature", color: "#a78bfa" },
      { id: uid("lbl"), name: "Ops", color: "#fbbf24" },
    ],
    customFields: [
      {
        id: uid("cf"),
        name: "Client",
        type: "text",
        color: "#22d3ee",
      },
      {
        id: uid("cf"),
        name: "Effort",
        type: "select",
        options: ["XS", "S", "M", "L", "XL"],
        color: "#f472b6",
      },
    ],
    slaDays: template === "support" ? 2 : 5,
    shareToken: null,
    createdAt: new Date().toISOString(),
  };

  const defaultLists: List[] = preset.lists.map((item, index) => ({
    id: uid("lst"),
    boardId: board.id,
    title: item.title,
    position: index,
    wipLimit: item.wip,
    accent: item.accent,
  }));

  // Access + plan + insert in one read/write so Vercel shared cache stays consistent.
  await updateDb((db) => {
    const ws = db.workspaces.find((w) => w.id === input.workspaceId);
    if (!ws || !ws.memberIds.includes(input.userId)) {
      throw new Error("Forbidden");
    }
    const user = db.users.find((u) => u.id === input.userId);
    const plan: PlanId = user?.plan === "pro" ? "pro" : "free";
    const limits = planLimits(plan);
    const workspaceIds = db.workspaces
      .filter((w) => w.memberIds.includes(input.userId))
      .map((w) => w.id);
    const existingCount = db.boards.filter(
      (b) =>
        workspaceIds.includes(b.workspaceId) ||
        b.memberIds.includes(input.userId),
    ).length;
    if (existingCount >= limits.boards) {
      throw new Error(
        `Free plan allows ${limits.boards} boards. Upgrade to Pro for unlimited boards.`,
      );
    }

    db.boards.push(board);
    db.lists.push(...defaultLists);
    const inProgress = defaultLists.find((l) =>
      /progress|working|writing/i.test(l.title),
    );
    const review = defaultLists.find((l) => /review|edit|waiting/i.test(l.title));
    const pro = plan === "pro";
    if (inProgress) {
      db.automations.push({
        id: uid("auto"),
        boardId: board.id,
        name: "Auto-assign on start",
        enabled: true,
        trigger: "card_moved",
        fromListId: null,
        toListId: inProgress.id,
        conditions: [],
        actions: pro
          ? [
              { type: "assign_user", value: input.userId },
              { type: "notify", value: "Card entered active work — owner assigned" },
            ]
          : [{ type: "assign_user", value: input.userId }],
        runs: 0,
        createdAt: new Date().toISOString(),
      });
    }
    if (review) {
      db.automations.push({
        id: uid("auto"),
        boardId: board.id,
        name: "Boost priority in review",
        enabled: true,
        trigger: "card_moved",
        toListId: review.id,
        conditions: [],
        actions: pro
          ? [
              { type: "set_priority", value: "high" },
              { type: "add_checklist_item", value: "Peer review checklist" },
            ]
          : [{ type: "set_priority", value: "high" }],
        runs: 0,
        createdAt: new Date().toISOString(),
      });
    }
    db.activities.push({
      id: uid("act"),
      boardId: board.id,
      userId: input.userId,
      message: `created board "${board.name}" from ${template} template`,
      createdAt: new Date().toISOString(),
    });
  });

  return board;
}

export async function createList(boardId: string, title: string, userId: string) {
  await assertBoardAccess(userId, boardId);
  const db = await readDb();
  const position = db.lists.filter((l) => l.boardId === boardId).length;
  const list: List = {
    id: uid("lst"),
    boardId,
    title,
    position,
    wipLimit: null,
    accent: LIST_ACCENTS[position % LIST_ACCENTS.length],
  };
  await updateDb((d) => {
    d.lists.push(list);
    d.activities.push({
      id: uid("act"),
      boardId,
      userId,
      message: `added list "${title}"`,
      createdAt: new Date().toISOString(),
    });
  });
  return list;
}

export async function updateList(
  listId: string,
  patch: Partial<Pick<List, "title" | "wipLimit" | "accent">>,
  userId: string,
) {
  let updated: List | null = null;
  await updateDb((db) => {
    const list = db.lists.find((l) => l.id === listId);
    if (!list) return;
    const board = db.boards.find((b) => b.id === list.boardId);
    const ws = board
      ? db.workspaces.find((w) => w.id === board.workspaceId)
      : null;
    const allowed =
      board &&
      (board.memberIds.includes(userId) ||
        Boolean(ws?.memberIds.includes(userId)));
    if (!allowed) throw new Error("Forbidden");
    Object.assign(list, patch);
    updated = list;
  });
  return updated;
}

export async function createCard(input: {
  listId: string;
  boardId: string;
  title: string;
  userId: string;
}) {
  await assertBoardAccess(input.userId, input.boardId);
  const db = await readDb();
  const list = db.lists.find((l) => l.id === input.listId);
  if (list?.wipLimit != null) {
    const count = db.cards.filter((c) => c.listId === input.listId).length;
    if (count >= list.wipLimit) {
      throw new Error(`WIP limit reached for "${list.title}" (${list.wipLimit})`);
    }
  }

  const position = db.cards.filter((c) => c.listId === input.listId).length;
  const now = new Date().toISOString();
  const card: Card = {
    id: uid("crd"),
    listId: input.listId,
    boardId: input.boardId,
    title: input.title,
    description: "",
    position,
    labelIds: [],
    assigneeIds: [input.userId],
    dueDate: null,
    priority: "medium",
    estimateHours: 0,
    loggedHours: 0,
    checklist: [],
    comments: [],
    customFieldValues: {},
    enteredListAt: now,
    completedAt: null,
    recurrence: null,
    nextOccurAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await updateDb((d) => {
    d.cards.push(card);
    d.activities.push({
      id: uid("act"),
      boardId: input.boardId,
      userId: input.userId,
      message: `created card "${card.title}"`,
      createdAt: now,
    });
    runAutomations(d, {
      boardId: input.boardId,
      card,
      userId: input.userId,
      trigger: "card_created",
      toListId: input.listId,
    });
  });

  const fresh = await readDb();
  return fresh.cards.find((c) => c.id === card.id) ?? card;
}

export async function updateCard(
  cardId: string,
  patch: Partial<Card>,
  userId: string,
) {
  let updated: Card | null = null;
  let priorityChanged = false;
  let checklistCompleted = false;
  let fieldChanged = false;
  await updateDb((db) => {
    const idx = db.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const prev = db.cards[idx];
    const board = db.boards.find((b) => b.id === prev.boardId);
    const ws = board
      ? db.workspaces.find((w) => w.id === board.workspaceId)
      : null;
    const allowed =
      board &&
      (board.memberIds.includes(userId) ||
        Boolean(ws?.memberIds.includes(userId)));
    if (!allowed) throw new Error("Forbidden");
    priorityChanged =
      patch.priority != null && patch.priority !== prev.priority;
    if (patch.checklist) {
      const wasIncomplete = prev.checklist.some((i) => !i.done);
      const nowComplete =
        patch.checklist.length > 0 && patch.checklist.every((i) => i.done);
      checklistCompleted = wasIncomplete && nowComplete;
    }
    if (patch.customFieldValues) {
      fieldChanged =
        JSON.stringify(patch.customFieldValues) !==
        JSON.stringify(prev.customFieldValues);
    }
    db.cards[idx] = {
      ...prev,
      ...patch,
      id: prev.id,
      updatedAt: new Date().toISOString(),
    };
    updated = db.cards[idx];
    db.activities.unshift({
      id: uid("act"),
      boardId: updated.boardId,
      userId,
      message: `updated card "${updated.title}"`,
      createdAt: new Date().toISOString(),
    });
    if (priorityChanged && updated) {
      runAutomations(db, {
        boardId: updated.boardId,
        card: updated,
        userId,
        trigger: "priority_set",
      });
    }
    if (checklistCompleted && updated) {
      runAutomations(db, {
        boardId: updated.boardId,
        card: updated,
        userId,
        trigger: "checklist_done",
      });
    }
    if (fieldChanged && updated) {
      runAutomations(db, {
        boardId: updated.boardId,
        card: updated,
        userId,
        trigger: "field_changed",
      });
    }
  });
  return updated;
}

export async function completeCard(cardId: string, userId: string) {
  let updated: Card | null = null;
  await updateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) return;
    if (!boardAllowsUser(db, card.boardId, userId)) throw new Error("Forbidden");
    const doneList = findDoneList(db, card.boardId);
    if (!doneList) throw new Error("No Done list on this board");

    const fromList = card.listId;
    const now = new Date().toISOString();
    card.completedAt = now;
    card.updatedAt = now;

    if (fromList !== doneList.id) {
      card.listId = doneList.id;
      card.enteredListAt = now;
      const siblings = db.cards
        .filter((c) => c.listId === doneList.id && c.id !== card.id)
        .sort((a, b) => a.position - b.position);
      siblings.push(card);
      siblings.forEach((c, i) => {
        c.position = i;
      });
      db.cards
        .filter((c) => c.listId === fromList)
        .sort((a, b) => a.position - b.position)
        .forEach((c, i) => {
          c.position = i;
        });
    }

    db.activities.unshift({
      id: uid("act"),
      boardId: card.boardId,
      userId,
      message: `completed card "${card.title}"`,
      createdAt: now,
    });

    if (fromList !== doneList.id) {
      runAutomations(db, {
        boardId: card.boardId,
        card,
        userId,
        trigger: "card_moved",
        fromListId: fromList,
        toListId: doneList.id,
      });
    }
    updated = card;
  });
  return updated;
}

export async function uncompleteCard(cardId: string, userId: string) {
  let updated: Card | null = null;
  await updateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) return;
    const boardLists = db.lists
      .filter((l) => l.boardId === card.boardId)
      .sort((a, b) => a.position - b.position);
    const doneList = findDoneList(db, card.boardId);
    const target =
      boardLists.find(
        (l) => l.id !== doneList?.id && /progress|ready|working|triaged/i.test(l.title),
      ) ||
      boardLists.find((l) => l.id !== doneList?.id) ||
      null;
    if (!target) return;

    const fromList = card.listId;
    const now = new Date().toISOString();
    card.completedAt = null;
    card.updatedAt = now;
    if (fromList !== target.id) {
      card.listId = target.id;
      card.enteredListAt = now;
      const siblings = db.cards
        .filter((c) => c.listId === target.id && c.id !== card.id)
        .sort((a, b) => a.position - b.position);
      siblings.unshift(card);
      siblings.forEach((c, i) => {
        c.position = i;
      });
      db.cards
        .filter((c) => c.listId === fromList)
        .sort((a, b) => a.position - b.position)
        .forEach((c, i) => {
          c.position = i;
        });
    }
    db.activities.unshift({
      id: uid("act"),
      boardId: card.boardId,
      userId,
      message: `reopened card "${card.title}"`,
      createdAt: now,
    });
    updated = card;
  });
  return updated;
}

export async function getCompletedCards(
  userId: string,
  filter: "today" | "week" | "all" = "today",
) {
  const boards = await getBoardsForUser(userId);
  const db = await readDb();
  const boardMap = new Map(boards.map((b) => [b.id, b]));
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const items = db.cards
    .filter((c) => boardMap.has(c.boardId) && c.completedAt)
    .filter((c) => {
      const t = new Date(c.completedAt!).getTime();
      if (filter === "today") return t >= startOfToday;
      if (filter === "week") return t >= weekAgo;
      return true;
    })
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .map((card) => {
      const board = boardMap.get(card.boardId)!;
      const list = db.lists.find((l) => l.id === card.listId);
      return { card, board, listTitle: list?.title || "Done" };
    });

  return {
    filter,
    items,
    counts: {
      today: db.cards.filter(
        (c) =>
          boardMap.has(c.boardId) &&
          c.completedAt &&
          new Date(c.completedAt).getTime() >= startOfToday,
      ).length,
      week: db.cards.filter(
        (c) =>
          boardMap.has(c.boardId) &&
          c.completedAt &&
          new Date(c.completedAt).getTime() >= weekAgo,
      ).length,
      all: db.cards.filter((c) => boardMap.has(c.boardId) && c.completedAt).length,
    },
  };
}

export async function moveCard(input: {
  cardId: string;
  listId: string;
  position: number;
  userId: string;
}) {
  await updateDb((db) => {
    const card = db.cards.find((c) => c.id === input.cardId);
    if (!card) return;
    const board = db.boards.find((b) => b.id === card.boardId);
    const ws = board
      ? db.workspaces.find((w) => w.id === board.workspaceId)
      : null;
    const allowed =
      board &&
      (board.memberIds.includes(input.userId) ||
        Boolean(ws?.memberIds.includes(input.userId)));
    if (!allowed) throw new Error("Forbidden");
    const fromList = card.listId;
    const target = db.lists.find((l) => l.id === input.listId);
    if (target?.wipLimit != null && fromList !== input.listId) {
      const count = db.cards.filter(
        (c) => c.listId === input.listId && c.id !== card.id,
      ).length;
      if (count >= target.wipLimit) {
        throw new Error(`WIP limit reached for "${target.title}" (${target.wipLimit})`);
      }
    }

    card.listId = input.listId;
    card.position = input.position;
    card.updatedAt = new Date().toISOString();
    if (fromList !== input.listId) {
      card.enteredListAt = new Date().toISOString();
    }
    const targetIsDone = target
      ? /done|complete|resolved|published/i.test(target.title)
      : false;
    if (targetIsDone && !card.completedAt) {
      card.completedAt = card.updatedAt;
    } else if (!targetIsDone && card.completedAt) {
      card.completedAt = null;
    }

    const siblings = db.cards
      .filter((c) => c.listId === input.listId && c.id !== card.id)
      .sort((a, b) => a.position - b.position);
    siblings.splice(input.position, 0, card);
    siblings.forEach((c, i) => {
      c.position = i;
    });

    if (fromList !== input.listId) {
      db.cards
        .filter((c) => c.listId === fromList)
        .sort((a, b) => a.position - b.position)
        .forEach((c, i) => {
          c.position = i;
        });
    }

    db.activities.unshift({
      id: uid("act"),
      boardId: card.boardId,
      userId: input.userId,
      message: `moved card "${card.title}"`,
      createdAt: new Date().toISOString(),
    });

    if (fromList !== input.listId) {
      runAutomations(db, {
        boardId: card.boardId,
        card,
        userId: input.userId,
        trigger: "card_moved",
        fromListId: fromList,
        toListId: input.listId,
      });
    }
  });
}

export async function reorderLists(
  boardId: string,
  orderedIds: string[],
  userId: string,
) {
  await assertBoardAccess(userId, boardId);
  await updateDb((db) => {
    orderedIds.forEach((id, index) => {
      const list = db.lists.find((l) => l.id === id && l.boardId === boardId);
      if (list) list.position = index;
    });
    db.activities.unshift({
      id: uid("act"),
      boardId,
      userId,
      message: "reordered lists",
      createdAt: new Date().toISOString(),
    });
  });
}

export async function getAutomations(boardId: string) {
  const db = await readDb();
  return db.automations.filter((a) => a.boardId === boardId);
}

export async function createAutomation(
  rule: Omit<AutomationRule, "id" | "runs" | "createdAt">,
  userId: string,
) {
  await assertBoardAccess(userId, rule.boardId);
  const plan = await getUserPlan(userId);
  const existing = await getAutomations(rule.boardId);
  assertPlanAllowsAutomation(plan, existing.length, {
    trigger: rule.trigger,
    actions: rule.actions,
    conditions: rule.conditions ?? [],
  });
  const created: AutomationRule = {
    ...rule,
    conditions: rule.conditions ?? [],
    id: uid("auto"),
    runs: 0,
    createdAt: new Date().toISOString(),
  };
  await updateDb((db) => {
    db.automations.push(created);
  });
  return created;
}

export async function updateAutomation(
  id: string,
  patch: Partial<AutomationRule>,
  userId: string,
) {
  let updated: AutomationRule | null = null;
  await updateDb((db) => {
    const idx = db.automations.findIndex((a) => a.id === id);
    if (idx === -1) return;
    if (!boardAllowsUser(db, db.automations[idx].boardId, userId)) {
      throw new Error("Forbidden");
    }
    db.automations[idx] = { ...db.automations[idx], ...patch, id };
    updated = db.automations[idx];
  });
  return updated;
}

export async function deleteAutomation(id: string, userId: string) {
  await updateDb((db) => {
    const rule = db.automations.find((a) => a.id === id);
    if (!rule) return;
    if (!boardAllowsUser(db, rule.boardId, userId)) {
      throw new Error("Forbidden");
    }
    db.automations = db.automations.filter((a) => a.id !== id);
  });
}

export async function runOverdueAutomations(userId: string) {
  const allowedBoards = new Set(
    (await getBoardsForUser(userId)).map((b) => b.id),
  );
  await updateDb((db) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    for (const card of db.cards) {
      if (!allowedBoards.has(card.boardId)) continue;
      if (card.dueDate && new Date(card.dueDate).getTime() < now) {
        runAutomations(db, {
          boardId: card.boardId,
          card,
          userId,
          trigger: "due_overdue",
        });
      }
      if (
        card.dueDate &&
        new Date(card.dueDate).getTime() >= now &&
        new Date(card.dueDate).getTime() <= now + dayMs
      ) {
        runAutomations(db, {
          boardId: card.boardId,
          card,
          userId,
          trigger: "due_soon",
        });
      }
      const board = db.boards.find((b) => b.id === card.boardId);
      if (!board || card.completedAt) continue;
      const days =
        (now - new Date(card.enteredListAt).getTime()) / dayMs;
      if (days > board.slaDays) {
        runAutomations(db, {
          boardId: card.boardId,
          card,
          userId,
          trigger: "sla_breach",
        });
      }
    }
  });
}

export async function installSlaEscalationPack(boardId: string, userId: string) {
  await assertBoardAccess(userId, boardId);
  const plan = await getUserPlan(userId);
  if (!planLimits(plan).allowSlaEscalate) {
    throw new Error("SLA escalation pack requires Flowly Pro.");
  }
  const bundle = await getBoardBundle(boardId);
  if (!bundle) throw new Error("Board not found");
  const existing = bundle.automations.find((a) => a.trigger === "sla_breach");
  if (existing) return existing;

  return createAutomation(
    {
      boardId,
      name: "SLA breach → escalate",
      enabled: true,
      trigger: "sla_breach",
      fromListId: null,
      toListId: null,
      conditions: [],
      actions: [
        { type: "set_priority", value: "urgent" },
        { type: "notify", value: "SLA breached — card escalated to urgent" },
        { type: "add_checklist_item", value: "Escalate to client / stakeholder" },
      ],
    },
    userId,
  );
}

export async function getNotifications(userId: string) {
  const db = await readDb();
  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationsRead(userId: string) {
  await updateDb((db) => {
    db.notifications
      .filter((n) => n.userId === userId)
      .forEach((n) => {
        n.read = true;
      });
  });
}

export async function getAnalytics(userId: string) {
  const boards = await getBoardsForUser(userId);
  const db = await readDb();
  const boardIds = new Set(boards.map((b) => b.id));
  const cards = db.cards.filter((c) => boardIds.has(c.boardId));
  const lists = db.lists.filter((l) => boardIds.has(l.boardId));
  const doneListIds = new Set(
    lists.filter((l) => /done|complete|resolved|published/i.test(l.title)).map((l) => l.id),
  );
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const overdue = cards.filter(
    (c) => c.dueDate && new Date(c.dueDate).getTime() < now && !doneListIds.has(c.listId),
  );
  const byPriority = {
    low: cards.filter((c) => c.priority === "low").length,
    medium: cards.filter((c) => c.priority === "medium").length,
    high: cards.filter((c) => c.priority === "high").length,
    urgent: cards.filter((c) => c.priority === "urgent").length,
  };
  const logged = cards.reduce((sum, c) => sum + c.loggedHours, 0);
  const estimate = cards.reduce((sum, c) => sum + c.estimateHours, 0);
  const done = cards.filter((c) => doneListIds.has(c.listId)).length;
  const slaBreaches = cards.filter((c) => {
    const board = db.boards.find((b) => b.id === c.boardId);
    if (!board || doneListIds.has(c.listId)) return false;
    const days =
      (now - new Date(c.enteredListAt).getTime()) / (24 * 60 * 60 * 1000);
    return days > board.slaDays;
  }).length;
  const automations = db.automations.filter((a) => boardIds.has(a.boardId));
  const automationRuns = automations.reduce((s, a) => s + a.runs, 0);
  const plan = await getUserPlan(userId);
  const memberIds = new Set<string>();
  for (const b of boards) b.memberIds.forEach((id) => memberIds.add(id));
  const workload = [...memberIds].map((memberId) => {
    const memberCards = cards.filter((c) => c.assigneeIds.includes(memberId));
    const user = db.users.find((u) => u.id === memberId);
    return {
      userId: memberId,
      name: user?.name ?? "Member",
      cards: memberCards.length,
      loggedHours: memberCards.reduce((s, c) => s + c.loggedHours, 0),
      estimateHours: memberCards.reduce((s, c) => s + c.estimateHours, 0),
    };
  });
  const weekAgo = now - weekMs;
  const dayMsLocal = 24 * 60 * 60 * 1000;
  const slaBreachesThisWeek = cards.filter((c) => {
    const board = db.boards.find((b) => b.id === c.boardId);
    if (!board || doneListIds.has(c.listId)) return false;
    const entered = new Date(c.enteredListAt).getTime();
    const breachAt = entered + board.slaDays * dayMsLocal;
    return breachAt < now && breachAt >= weekAgo;
  }).length;

  return {
    totalCards: cards.length,
    done,
    overdue: overdue.length,
    byPriority,
    loggedHours: logged,
    estimateHours: estimate,
    boards: boards.length,
    completionRate: cards.length ? Math.round((done / cards.length) * 100) : 0,
    slaBreaches,
    slaBreachesThisWeek,
    automationRuns,
    activeRules: automations.filter((a) => a.enabled).length,
    plan,
    workload: planLimits(plan).allowWorkload ? workload : [],
  };
}

export async function getSmartInbox(userId: string) {
  const boards = await getBoardsForUser(userId);
  const db = await readDb();
  const boardIds = new Set(boards.map((b) => b.id));
  const cards = db.cards.filter((c) => boardIds.has(c.boardId));
  const now = Date.now();
  const week = now + 7 * 24 * 60 * 60 * 1000;

  const slaRisk = cards.filter((c) => {
    const board = db.boards.find((b) => b.id === c.boardId);
    if (!board) return false;
    const days =
      (now - new Date(c.enteredListAt).getTime()) / (24 * 60 * 60 * 1000);
    return days >= board.slaDays - 1;
  });

  return {
    overdue: cards.filter(
      (c) =>
        c.dueDate &&
        new Date(c.dueDate).getTime() < now &&
        c.assigneeIds.includes(userId),
    ),
    dueSoon: cards.filter(
      (c) =>
        c.dueDate &&
        new Date(c.dueDate).getTime() >= now &&
        new Date(c.dueDate).getTime() <= week &&
        c.assigneeIds.includes(userId),
    ),
    unassigned: cards.filter((c) => c.assigneeIds.length === 0),
    highImpact: cards
      .filter((c) => c.priority === "urgent" || c.priority === "high")
      .slice(0, 12),
    slaRisk,
  };
}

async function buildSeed(): Promise<Database> {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const now = new Date().toISOString();
  const demo: User = {
    id: "usr_demo",
    name: "Alex Rivera",
    email: "demo@flowly.app",
    passwordHash,
    avatarColor: "#22d3ee",
    plan: "pro",
    emailVerifiedAt: now,
    createdAt: now,
  };
  const teammate: User = {
    id: "usr_sam",
    name: "Sam Chen",
    email: "sam@flowly.app",
    passwordHash,
    avatarColor: "#f472b6",
    plan: "free",
    emailVerifiedAt: now,
    createdAt: now,
  };
  const designer: User = {
    id: "usr_mia",
    name: "Mia Costa",
    email: "mia@flowly.app",
    passwordHash,
    avatarColor: "#a3e635",
    plan: "free",
    emailVerifiedAt: now,
    createdAt: now,
  };

  const workspace: Workspace = {
    id: "ws_demo",
    name: "Flowly Studio",
    description: "Product & engineering workspace",
    ownerId: demo.id,
    memberIds: [demo.id, teammate.id, designer.id],
    createdAt: new Date().toISOString(),
  };

  const labels = [
    { id: "lbl_design", name: "Design", color: "#22d3ee" },
    { id: "lbl_bug", name: "Bug", color: "#fb7185" },
    { id: "lbl_feature", name: "Feature", color: "#a78bfa" },
    { id: "lbl_ops", name: "Ops", color: "#fbbf24" },
  ];

  const customFields = [
    {
      id: "cf_client",
      name: "Client",
      type: "text" as const,
      color: "#22d3ee",
    },
    {
      id: "cf_effort",
      name: "Effort",
      type: "select" as const,
      options: ["XS", "S", "M", "L", "XL"],
      color: "#f472b6",
    },
  ];

  const board: Board = {
    id: "brd_product",
    workspaceId: workspace.id,
    name: "Product Launch",
    description: "Adaptive boards with automation — not a plain Trello clone",
    background: "dark-neon",
    memberIds: [demo.id, teammate.id, designer.id],
    labels,
    customFields,
    slaDays: 4,
    shareToken: null,
    createdAt: new Date().toISOString(),
  };

  const listMeta = [
    { title: "Ideas", wip: null, accent: "#a78bfa" },
    { title: "Ready", wip: 6, accent: "#22d3ee" },
    { title: "In Progress", wip: 3, accent: "#fbbf24" },
    { title: "QA", wip: 4, accent: "#f472b6" },
    { title: "Done", wip: null, accent: "#a3e635" },
  ];
  const lists: List[] = listMeta.map((item, position) => ({
    id: `lst_${position}`,
    boardId: board.id,
    title: item.title,
    position,
    wipLimit: item.wip,
    accent: item.accent,
  }));

  const days = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  const cards: Card[] = [
    {
      id: "crd_1",
      listId: "lst_2",
      boardId: board.id,
      title: "Polish board drag-and-drop interactions",
      description: "Smooth list + card reordering with optimistic UI.",
      position: 0,
      labelIds: ["lbl_feature"],
      assigneeIds: [demo.id],
      dueDate: days(2),
      priority: "high",
      estimateHours: 8,
      loggedHours: 3,
      checklist: [
        { id: "chk_1", text: "Card sorting", done: true },
        { id: "chk_2", text: "List sorting", done: false },
        { id: "chk_3", text: "Empty-state drop zones", done: false },
      ],
      comments: [
        {
          id: "cmt_1",
          userId: teammate.id,
          text: "Looks great — add keyboard reorder next.",
          createdAt: days(-1),
        },
      ],
      customFieldValues: { cf_client: "Upwork demo", cf_effort: "M" },
      enteredListAt: days(-3),
      completedAt: null,
      recurrence: null,
      nextOccurAt: null,
      createdAt: days(-5),
      updatedAt: days(-1),
    },
    {
      id: "crd_2",
      listId: "lst_2",
      boardId: board.id,
      title: "Build Smart Inbox for overdue work",
      description: "Surface overdue, due soon, and unassigned cards.",
      position: 1,
      labelIds: ["lbl_feature", "lbl_ops"],
      assigneeIds: [teammate.id],
      dueDate: days(-1),
      priority: "urgent",
      estimateHours: 6,
      loggedHours: 5,
      checklist: [
        { id: "chk_4", text: "Overdue query", done: true },
        { id: "chk_5", text: "Inbox UI", done: true },
      ],
      comments: [],
      customFieldValues: { cf_client: "Internal", cf_effort: "L" },
      enteredListAt: days(-5),
      completedAt: null,
      recurrence: null,
      nextOccurAt: null,
      createdAt: days(-6),
      updatedAt: days(-1),
    },
    {
      id: "crd_3",
      listId: "lst_1",
      boardId: board.id,
      title: "Calendar view for due dates",
      description: "Month grid with cards grouped by day.",
      position: 0,
      labelIds: ["lbl_design", "lbl_feature"],
      assigneeIds: [designer.id, demo.id],
      dueDate: days(4),
      priority: "medium",
      estimateHours: 10,
      loggedHours: 1,
      checklist: [],
      comments: [],
      customFieldValues: { cf_effort: "M" },
      enteredListAt: days(-1),
      completedAt: null,
      recurrence: null,
      nextOccurAt: null,
      createdAt: days(-3),
      updatedAt: days(-3),
    },
    {
      id: "crd_4",
      listId: "lst_3",
      boardId: board.id,
      title: "Fix label color contrast on dark cards",
      description: "",
      position: 0,
      labelIds: ["lbl_bug"],
      assigneeIds: [designer.id],
      dueDate: days(1),
      priority: "high",
      estimateHours: 2,
      loggedHours: 1,
      checklist: [{ id: "chk_6", text: "Audit palette", done: true }],
      comments: [],
      customFieldValues: { cf_effort: "S" },
      enteredListAt: days(-2),
      completedAt: null,
      recurrence: null,
      nextOccurAt: null,
      createdAt: days(-2),
      updatedAt: days(0),
    },
    {
      id: "crd_5",
      listId: "lst_0",
      boardId: board.id,
      title: "Weekly client status report",
      description: "Recurring delivery check-in for the client.",
      position: 0,
      labelIds: ["lbl_ops"],
      assigneeIds: [demo.id],
      dueDate: days(2),
      priority: "medium",
      estimateHours: 2,
      loggedHours: 0,
      checklist: [{ id: "chk_rec", text: "Send status email", done: false }],
      comments: [],
      customFieldValues: { cf_client: "Upwork demo" },
      enteredListAt: days(-1),
      completedAt: null,
      recurrence: "weekly",
      nextOccurAt: days(2),
      createdAt: days(-1),
      updatedAt: days(-1),
    },
    {
      id: "crd_6",
      listId: "lst_4",
      boardId: board.id,
      title: "Landing page hero with product mock",
      description: "Brand-first first viewport for Upwork demos.",
      position: 0,
      labelIds: ["lbl_design"],
      assigneeIds: [designer.id],
      dueDate: days(-3),
      priority: "medium",
      estimateHours: 5,
      loggedHours: 5,
      checklist: [
        { id: "chk_7", text: "Motion", done: true },
        { id: "chk_8", text: "CTA", done: true },
      ],
      comments: [],
      customFieldValues: { cf_client: "Portfolio", cf_effort: "M" },
      enteredListAt: days(-4),
      completedAt: days(0),
      recurrence: null,
      nextOccurAt: null,
      createdAt: days(-8),
      updatedAt: days(0),
    },
  ];

  const automations: AutomationRule[] = [
    {
      id: "auto_1",
      boardId: board.id,
      name: "Start work → assign + notify",
      enabled: true,
      trigger: "card_moved",
      fromListId: null,
      toListId: "lst_2",
      conditions: [],
      actions: [
        { type: "assign_user", value: demo.id },
        { type: "notify", value: "Card entered In Progress — owner synced" },
      ],
      runs: 3,
      createdAt: days(-10),
    },
    {
      id: "auto_2",
      boardId: board.id,
      name: "QA gate checklist",
      enabled: true,
      trigger: "card_moved",
      toListId: "lst_3",
      conditions: [],
      actions: [
        { type: "set_priority", value: "high" },
        { type: "add_checklist_item", value: "Regression smoke test" },
        { type: "add_label", value: "lbl_bug" },
      ],
      runs: 1,
      createdAt: days(-8),
    },
    {
      id: "auto_3",
      boardId: board.id,
      name: "Overdue escalate",
      enabled: true,
      trigger: "due_overdue",
      conditions: [],
      actions: [
        { type: "set_priority", value: "urgent" },
        { type: "notify", value: "Overdue card escalated to urgent" },
      ],
      runs: 0,
      createdAt: days(-6),
    },
    {
      id: "auto_4",
      boardId: board.id,
      name: "New card in Ready → effort field",
      enabled: true,
      trigger: "card_created",
      toListId: "lst_1",
      conditions: [],
      actions: [
        { type: "set_custom_field", value: "cf_effort:M" },
        { type: "add_checklist_item", value: "Define acceptance criteria" },
      ],
      runs: 2,
      createdAt: days(-5),
    },
    {
      id: "auto_5",
      boardId: board.id,
      name: "SLA breach → escalate",
      enabled: true,
      trigger: "sla_breach",
      conditions: [],
      actions: [
        { type: "set_priority", value: "urgent" },
        { type: "notify", value: "SLA breached — escalated to urgent" },
      ],
      runs: 0,
      createdAt: days(-4),
    },
  ];

  const activities: Activity[] = [
    {
      id: "act_1",
      boardId: board.id,
      userId: demo.id,
      message: 'automation "Start work → assign + notify" ran on "Polish board…"',
      createdAt: days(-1),
    },
    {
      id: "act_2",
      boardId: board.id,
      userId: teammate.id,
      message: 'commented on "Polish board drag-and-drop interactions"',
      createdAt: days(-1),
    },
    {
      id: "act_3",
      boardId: board.id,
      userId: designer.id,
      message: 'moved card "Fix label color contrast" into QA',
      createdAt: days(-2),
    },
  ];

  const notifications: Notification[] = [
    {
      id: "ntf_1",
      userId: demo.id,
      title: "Automation fired",
      body: "Start work → assign + notify ran on In Progress",
      read: false,
      href: "/board/brd_product/automations",
      createdAt: days(0),
    },
    {
      id: "ntf_2",
      userId: demo.id,
      title: "SLA risk",
      body: "Smart Inbox card has been in list past SLA window",
      read: false,
      href: "/inbox",
      createdAt: days(0),
    },
    {
      id: "ntf_3",
      userId: demo.id,
      title: "WIP limit",
      body: "In Progress is near capacity (2/3)",
      read: true,
      href: "/board/brd_product",
      createdAt: days(-1),
    },
  ];

  return {
    users: [demo, teammate, designer],
    workspaces: [workspace],
    boards: [board],
    lists,
    cards,
    activities,
    notifications,
    automations,
  };
}

function nextOccurrence(from: Date, freq: RecurrenceFreq) {
  const d = new Date(from);
  if (freq === "daily") d.setDate(d.getDate() + 1);
  else if (freq === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function setCardRecurrence(
  cardId: string,
  userId: string,
  recurrence: RecurrenceFreq | null,
) {
  const plan = await getUserPlan(userId);
  if (recurrence && !planLimits(plan).allowRecurring) {
    throw new Error("Recurring cards require Flowly Pro.");
  }
  let updated: Card | null = null;
  await updateDb((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) return;
    const board = db.boards.find((b) => b.id === card.boardId);
    const ws = board
      ? db.workspaces.find((w) => w.id === board.workspaceId)
      : null;
    const allowed =
      board &&
      (board.memberIds.includes(userId) ||
        Boolean(ws?.memberIds.includes(userId)));
    if (!allowed) throw new Error("Forbidden");
    card.recurrence = recurrence;
    card.nextOccurAt = recurrence
      ? nextOccurrence(card.dueDate ? new Date(card.dueDate) : new Date(), recurrence)
      : null;
    card.updatedAt = new Date().toISOString();
    updated = card;
  });
  return updated;
}

export async function processRecurringCards(userId: string) {
  const plan = await getUserPlan(userId);
  if (!planLimits(plan).allowRecurring) return { spawned: 0 };
  const allowedBoards = new Set(
    (await getBoardsForUser(userId)).map((b) => b.id),
  );
  let spawned = 0;
  await updateDb((db) => {
    const now = Date.now();
    const due = db.cards.filter(
      (c) =>
        allowedBoards.has(c.boardId) &&
        c.recurrence &&
        c.nextOccurAt &&
        new Date(c.nextOccurAt).getTime() <= now &&
        !c.completedAt,
    );
    for (const source of due) {
      const freq = source.recurrence!;
      const nextDue = source.nextOccurAt!;
      const clone: Card = {
        ...source,
        id: uid("crd"),
        title: source.title,
        position: db.cards.filter((c) => c.listId === source.listId).length,
        checklist: source.checklist.map((i) => ({
          ...i,
          id: uid("chk"),
          done: false,
        })),
        comments: [],
        completedAt: null,
        dueDate: nextDue,
        enteredListAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recurrence: freq,
        nextOccurAt: nextOccurrence(new Date(nextDue), freq),
      };
      db.cards.push(clone);
      source.nextOccurAt = nextOccurrence(new Date(nextDue), freq);
      source.updatedAt = new Date().toISOString();
      spawned += 1;
      runAutomations(db, {
        boardId: clone.boardId,
        card: clone,
        userId,
        trigger: "schedule",
        toListId: clone.listId,
      });
    }
  });
  return { spawned };
}

export async function enableBoardShare(boardId: string, userId: string) {
  const plan = await getUserPlan(userId);
  if (!planLimits(plan).allowReports) {
    throw new Error("Client reports require Flowly Pro.");
  }
  let token: string | null = null;
  await updateDb((db) => {
    const board = db.boards.find((b) => b.id === boardId);
    if (!board) return;
    if (!board.memberIds.includes(userId)) {
      throw new Error("Forbidden");
    }
    board.shareToken =
      board.shareToken ||
      `share_${crypto.randomUUID().replace(/-/g, "")}`;
    token = board.shareToken;
  });
  if (!token) throw new Error("Board not found");
  return token;
}

export async function getBoardReportByToken(token: string) {
  const db = await readDb();
  const board = db.boards.find((b) => b.shareToken === token);
  if (!board) return null;
  const lists = db.lists
    .filter((l) => l.boardId === board.id)
    .sort((a, b) => a.position - b.position);
  const doneListIds = new Set(
    lists
      .filter((l) => /done|complete|resolved|published/i.test(l.title))
      .map((l) => l.id),
  );
  const cards = db.cards.filter((c) => c.boardId === board.id);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const done = cards.filter((c) => doneListIds.has(c.listId) || c.completedAt);
  const doneThisWeek = done.filter((c) => {
    const t = new Date(c.completedAt || c.updatedAt).getTime();
    return t >= weekAgo;
  });
  const overdue = cards.filter(
    (c) =>
      c.dueDate &&
      new Date(c.dueDate).getTime() < now &&
      !doneListIds.has(c.listId) &&
      !c.completedAt,
  );
  return {
    board: { id: board.id, name: board.name, description: board.description, slaDays: board.slaDays },
    generatedAt: new Date().toISOString(),
    summary: {
      totalCards: cards.length,
      done: done.length,
      doneThisWeek: doneThisWeek.length,
      overdue: overdue.length,
      loggedHours: cards.reduce((s, c) => s + c.loggedHours, 0),
      estimateHours: cards.reduce((s, c) => s + c.estimateHours, 0),
    },
    doneThisWeek: doneThisWeek.map((c) => ({
      id: c.id,
      title: c.title,
      completedAt: c.completedAt,
      loggedHours: c.loggedHours,
      estimateHours: c.estimateHours,
    })),
    overdue: overdue.map((c) => ({
      id: c.id,
      title: c.title,
      dueDate: c.dueDate,
      priority: c.priority,
    })),
  };
}

export async function getBoardReportCsv(boardId: string, userId: string) {
  const plan = await getUserPlan(userId);
  if (!planLimits(plan).allowReports) {
    throw new Error("CSV export requires Flowly Pro.");
  }
  const boards = await getBoardsForUser(userId);
  if (!boards.some((b) => b.id === boardId)) throw new Error("Forbidden");
  const db = await readDb();
  const cards = db.cards.filter((c) => c.boardId === boardId);
  const lists = new Map(db.lists.map((l) => [l.id, l.title]));
  const header = [
    "id",
    "title",
    "list",
    "priority",
    "dueDate",
    "estimateHours",
    "loggedHours",
    "completedAt",
    "assignees",
  ];
  const rows = cards.map((c) =>
    [
      c.id,
      JSON.stringify(c.title),
      JSON.stringify(lists.get(c.listId) ?? ""),
      c.priority,
      c.dueDate ?? "",
      c.estimateHours,
      c.loggedHours,
      c.completedAt ?? "",
      c.assigneeIds.join("|"),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

/** One-time upgrade path for existing demo accounts after schema add. */
export async function ensureDemoPro() {
  await updateDb((db) => {
    const demo = db.users.find((u) => u.email === "demo@flowly.app");
    if (demo && demo.plan !== "pro") demo.plan = "pro";
  });
}
