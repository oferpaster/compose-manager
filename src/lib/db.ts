import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let db: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function initDb(database: Database.Database) {
  database
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
    )
    .run();
  database
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS composes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
    )
    .run();

  database
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        description TEXT NOT NULL,
        usage TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
    )
    .run();

  const columns = database.prepare("PRAGMA table_info(composes)").all() as { name: string }[];
  const hasProjectId = columns.some((col) => col.name === "project_id");
  if (!hasProjectId) {
    database.prepare("ALTER TABLE composes ADD COLUMN project_id TEXT").run();
  }

  const scriptColumns = database.prepare("PRAGMA table_info(scripts)").all() as { name: string }[];
  const hasFileName = scriptColumns.some((col) => col.name === "file_name");
  if (!hasFileName) {
    database.prepare("ALTER TABLE scripts ADD COLUMN file_name TEXT").run();
  }
}

export function getDb() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  initDb(db);
  return db;
}
