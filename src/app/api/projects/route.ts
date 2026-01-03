import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC")
    .all();

  return NextResponse.json({ projects: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim() || "Untitled Project";
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getDb();

  db.prepare(
    "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(id, name, now, now);

  return NextResponse.json({ id, name });
}
