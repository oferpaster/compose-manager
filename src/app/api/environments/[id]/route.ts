import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const db = getDb();
  const project = db
    .prepare("SELECT id, name FROM projects WHERE id = ?")
    .get(projectId) as { id: string; name: string } | undefined;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const environment = db
    .prepare(
      "SELECT id, name, description FROM environments WHERE id = ? AND project_id = ?"
    )
    .get(id, projectId) as
    | { id: string; name: string; description: string }
    | undefined;

  if (!environment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const composes = db
    .prepare(
      "SELECT id, name, updated_at FROM composes WHERE environment_id = ? ORDER BY updated_at DESC"
    )
    .all(id);

  return NextResponse.json({ project, environment, composes });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM composes WHERE environment_id = ?").run(id);
  db.prepare("DELETE FROM environments WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
