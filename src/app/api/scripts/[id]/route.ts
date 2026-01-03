import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM scripts WHERE id = ?").get(id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ script: row });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    fileName?: string;
    description?: string;
    usage?: string;
    content?: string;
  };
  const db = getDb();
  const existing = db.prepare("SELECT id FROM scripts WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE scripts SET name = ?, file_name = ?, description = ?, usage = ?, content = ?, updated_at = ? WHERE id = ?"
  ).run(
    body.name?.trim() || "Untitled Script",
    body.fileName?.trim() || "script.sh",
    body.description?.trim() || "",
    body.usage?.trim() || "",
    body.content || "",
    now,
    id
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM scripts WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
