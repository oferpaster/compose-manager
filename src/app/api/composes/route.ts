import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { saveComposeAssets } from "@/lib/storage";
import { ComposeConfig, normalizeComposeConfig } from "@/lib/compose";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, project_id, updated_at FROM composes ORDER BY updated_at DESC"
    )
    .all();

  return NextResponse.json({ composes: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    projectId?: string;
    config?: ComposeConfig;
  };
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const name = body.name?.trim() || "Untitled Compose";
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const config: ComposeConfig = normalizeComposeConfig({
    ...(body.config || {
      id,
      projectId: body.projectId,
      name,
      globalEnv: [],
      networks: ["backend"],
      services: [],
    }),
    id,
    projectId: body.projectId,
    name,
  });

  const db = getDb();
  db.prepare(
    "INSERT INTO composes (id, project_id, name, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, body.projectId, name, JSON.stringify(config), now, now);

  saveComposeAssets(config);

  return NextResponse.json({ id, config });
}
