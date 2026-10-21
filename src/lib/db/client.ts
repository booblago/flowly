import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
export const SQLITE_PATH =
  process.env.DATABASE_URL?.replace(/^file:/, "") ||
  path.join(DATA_DIR, "flowly.db");

let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,
  email_verified_at TEXT,
  email_verify_token TEXT,
  email_verify_expires TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  member_ids TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  background TEXT NOT NULL,
  member_ids TEXT NOT NULL,
  labels TEXT NOT NULL,
  custom_fields TEXT NOT NULL,
  sla_days INTEGER NOT NULL DEFAULT 5,
  share_token TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  wip_limit INTEGER,
  default_priority TEXT NOT NULL DEFAULT 'medium',
  accent TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL,
  label_ids TEXT NOT NULL,
  assignee_ids TEXT NOT NULL,
  due_date TEXT,
  priority TEXT NOT NULL,
  estimate_hours INTEGER NOT NULL DEFAULT 0,
  logged_hours INTEGER NOT NULL DEFAULT 0,
  checklist TEXT NOT NULL,
  comments TEXT NOT NULL,
  custom_field_values TEXT NOT NULL,
  entered_list_at TEXT NOT NULL,
  completed_at TEXT,
  recurrence TEXT,
  next_occur_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  href TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  trigger TEXT NOT NULL,
  from_list_id TEXT,
  to_list_id TEXT,
  conditions TEXT NOT NULL DEFAULT '[]',
  actions TEXT NOT NULL,
  runs INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

function tableCols(database: Database.Database, table: string) {
  return (
    database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((c) => c.name);
}

function addColIfMissing(
  database: Database.Database,
  table: string,
  col: string,
  ddl: string,
) {
  if (!tableCols(database, table).includes(col)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function migrateSchema(database: Database.Database) {
  addColIfMissing(database, "users", "plan", "plan TEXT NOT NULL DEFAULT 'free'");
  addColIfMissing(database, "users", "stripe_customer_id", "stripe_customer_id TEXT");
  addColIfMissing(
    database,
    "users",
    "stripe_subscription_id",
    "stripe_subscription_id TEXT",
  );
  addColIfMissing(
    database,
    "users",
    "stripe_subscription_status",
    "stripe_subscription_status TEXT",
  );
  addColIfMissing(database, "users", "email_verified_at", "email_verified_at TEXT");
  addColIfMissing(database, "users", "email_verify_token", "email_verify_token TEXT");
  addColIfMissing(
    database,
    "users",
    "email_verify_expires",
    "email_verify_expires TEXT",
  );
  addColIfMissing(database, "boards", "share_token", "share_token TEXT");
  addColIfMissing(
    database,
    "lists",
    "default_priority",
    "default_priority TEXT NOT NULL DEFAULT 'medium'",
  );
  addColIfMissing(database, "cards", "completed_at", "completed_at TEXT");
  addColIfMissing(database, "cards", "recurrence", "recurrence TEXT");
  addColIfMissing(database, "cards", "next_occur_at", "next_occur_at TEXT");
  addColIfMissing(
    database,
    "automations",
    "conditions",
    "conditions TEXT NOT NULL DEFAULT '[]'",
  );
}

export function getSqlite() {
  if (sqlite) return sqlite;
  fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
  sqlite = new Database(SQLITE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  migrateSchema(sqlite);
  return sqlite;
}

export function getDb() {
  if (db) return db;
  db = drizzle(getSqlite(), { schema });
  return db;
}
