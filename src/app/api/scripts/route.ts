import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, file_name, description, usage, updated_at FROM scripts ORDER BY updated_at DESC"
    )
    .all();
  return NextResponse.json({ scripts: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    fileName?: string;
    description?: string;
    usage?: string;
    content?: string;
  };
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getDb();

  db.prepare(
    "INSERT INTO scripts (id, name, file_name, description, usage, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    body.name?.trim() || "Untitled Script",
    body.fileName?.trim() || "script.sh",
    body.description?.trim() || "",
    body.usage?.trim() || "",
    body.content || "",
    now,
    now
  );

  return NextResponse.json({ id });
}
