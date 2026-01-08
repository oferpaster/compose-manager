import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isDockerImageDownloadEnabled } from "@/lib/dockerImages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const project = db.prepare("SELECT id, name FROM projects WHERE id = ?").get(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const composes = db
    .prepare(
      "SELECT id, name, updated_at FROM composes WHERE project_id = ? ORDER BY updated_at DESC"
    )
    .all(id);

  return NextResponse.json({
    project,
    composes,
    capabilities: { imageDownloads: isDockerImageDownloadEnabled() },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM composes WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
