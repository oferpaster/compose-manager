import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { getDb } from "@/lib/db";
import { ComposeConfig } from "@/lib/compose";
import { createComposeArchiveStream, ExportOptions } from "@/lib/composeExport";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const snapshots = db
    .prepare(
      "SELECT id, name, description, file_name, created_at FROM snapshots WHERE compose_id = ? ORDER BY created_at DESC"
    )
    .all(id) as {
    id: string;
    name: string;
    description: string;
    file_name: string;
    created_at: string;
  }[];

  return NextResponse.json({ snapshots });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    options?: Partial<ExportOptions>;
  };
  const name = (body.name || "").trim();
  const description = (body.description || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Snapshot name is required" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare(
      "SELECT composes.config_json, composes.name as compose_name, projects.name as project_name, projects.id as project_id FROM composes JOIN projects ON projects.id = composes.project_id WHERE composes.id = ?"
    )
    .get(id) as
    | {
        config_json: string;
        compose_name: string;
        project_name: string;
        project_id: string;
      }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Compose not found" }, { status: 404 });
  }

  const config = JSON.parse(row.config_json) as ComposeConfig;
  const options: ExportOptions = {
    includeCompose: body.options?.includeCompose !== false,
    includeConfigs: body.options?.includeConfigs !== false,
    includeScripts: body.options?.includeScripts !== false,
    includeUtilities: body.options?.includeUtilities !== false,
    imageDownloadIds: [],
  };
  ensureSnapshotDir();
  const snapshotId = crypto.randomUUID();
  const safeProject = row.project_name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeCompose = row.compose_name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeSnapshot = name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const fileName = `${safeProject}__${safeCompose}__${safeSnapshot}.zip`;
  const filePath = path.join(SNAPSHOT_DIR, `${snapshotId}.zip`);

  const archiveStream = await createComposeArchiveStream(config, id, options);
  const fileStream = fs.createWriteStream(filePath);
  await pipeline(archiveStream, fileStream);

  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO snapshots (id, compose_id, project_id, name, description, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(snapshotId, id, row.project_id, name, description, fileName, createdAt);

  return NextResponse.json({
    snapshot: {
      id: snapshotId,
      name,
      description,
      file_name: fileName,
      created_at: createdAt,
    },
  });
}
