import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const environments = db
    .prepare(
      "SELECT id, name, description, updated_at FROM environments WHERE project_id = ? ORDER BY updated_at DESC"
    )
    .all(projectId);

  return NextResponse.json({ project, environments });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    projectId?: string;
  };
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const db = getDb();
  const project = db
    .prepare("SELECT id FROM projects WHERE id = ?")
    .get(body.projectId) as { id: string } | undefined;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = body.name?.trim() || "Untitled Environment";
  const description = body.description?.trim() || "";

  db.prepare(
    "INSERT INTO environments (id, project_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, body.projectId, name, description, now, now);

  return NextResponse.json({ id, name, description });
}
