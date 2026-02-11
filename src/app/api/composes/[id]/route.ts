import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { saveComposeAssets } from "@/lib/storage";
import { ComposeConfig, normalizeComposeConfig } from "@/lib/compose";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT config_json, project_id, environment_id FROM composes WHERE id = ?")
    .get(id) as
    | { config_json: string; project_id: string; environment_id: string }
    | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = JSON.parse(row.config_json) as ComposeConfig;
  const config = normalizeComposeConfig({
    ...parsed,
    projectId: parsed.projectId || row.project_id,
    environmentId: parsed.environmentId || row.environment_id,
  });
  return NextResponse.json({ config });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as { name?: string; config?: ComposeConfig };
  const db = getDb();
  const existing = db
    .prepare("SELECT id, project_id, environment_id FROM composes WHERE id = ?")
    .get(id) as { id: string; project_id: string; environment_id: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const name = body.name?.trim() || body.config?.name || "Untitled Compose";
  const config: ComposeConfig = normalizeComposeConfig({
    ...(body.config || {
      id,
      projectId: "",
      environmentId: "",
      name,
      globalEnv: [],
      networks: ["backend"],
      services: [],
    }),
    id,
    projectId: body.config?.projectId || existing.project_id,
    environmentId: body.config?.environmentId || existing.environment_id,
    name,
  });

  db.prepare(
    "UPDATE composes SET name = ?, config_json = ?, updated_at = ?, environment_id = ? WHERE id = ?"
  ).run(
    name,
    JSON.stringify(config),
    now,
    config.environmentId || existing.environment_id,
    id
  );

  saveComposeAssets(config);

  return NextResponse.json({ id, config });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM composes WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
