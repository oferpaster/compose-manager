import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const PRIMARY_DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FALLBACK_DATA_DIR = "/tmp/composebuilder-data";

let db: Database.Database | null = null;

function ensureDataDir(targetDir: string) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
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
  database
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS utilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        content TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
    )
    .run();
  const utilityColumns = database
    .prepare("PRAGMA table_info(utilities)")
    .all() as { name: string }[];
  const hasFilePath = utilityColumns.some((col) => col.name === "file_path");
  if (!hasFilePath) {
    database.prepare("ALTER TABLE utilities ADD COLUMN file_path TEXT").run();
  }
  database
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        compose_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        file_name TEXT NOT NULL,
        created_at TEXT NOT NULL
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
  let dbPath = path.join(PRIMARY_DATA_DIR, "app.db");
  try {
    ensureDataDir(PRIMARY_DATA_DIR);
    db = new Database(dbPath);
  } catch (error) {
    const fallbackPath = path.join(FALLBACK_DATA_DIR, "app.db");
    try {
      ensureDataDir(FALLBACK_DATA_DIR);
      db = new Database(fallbackPath);
      dbPath = fallbackPath;
      console.warn(
        `Failed to open database at ${path.join(PRIMARY_DATA_DIR, "app.db")}. ` +
          `Using fallback at ${dbPath}.`,
        error
      );
    } catch (fallbackError) {
      console.error("Failed to open sqlite database.", fallbackError);
      throw fallbackError;
    }
  }
  initDb(db);
  return db;
}
