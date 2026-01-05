import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";

const UTILITIES_DIR = path.join(process.cwd(), "data", "utilities");

function ensureUtilitiesDir(target: string) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT id, name, file_name, file_path FROM utilities WHERE id = ?")
    .get(id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ utility: row });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") || "").trim();
  const db = getDb();
  const existing = db
    .prepare("SELECT id, file_name, file_path FROM utilities WHERE id = ?")
    .get(id) as { id: string; file_name: string; file_path?: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  let fileName = existing.file_name || "utility.bin";
  let filePath = existing.file_path || "";

  if (file && file instanceof File) {
    fileName = file.name || fileName;
    const utilityDir = path.join(UTILITIES_DIR, id);
    ensureUtilitiesDir(utilityDir);
    filePath = path.join(utilityDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  }

  const finalName = name || fileName;
  db.prepare(
    "UPDATE utilities SET name = ?, file_name = ?, file_path = ?, updated_at = ? WHERE id = ?"
  ).run(finalName, fileName, filePath, now, id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const existing = db
    .prepare("SELECT file_path FROM utilities WHERE id = ?")
    .get(id) as { file_path?: string } | undefined;
  if (existing?.file_path && fs.existsSync(existing.file_path)) {
    fs.unlinkSync(existing.file_path);
  }
  const utilityDir = path.join(UTILITIES_DIR, id);
  if (fs.existsSync(utilityDir)) {
    fs.rmSync(utilityDir, { recursive: true, force: true });
  }
  db.prepare("DELETE FROM utilities WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
