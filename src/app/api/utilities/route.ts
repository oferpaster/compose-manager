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

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, file_name, updated_at FROM utilities ORDER BY updated_at DESC"
    )
    .all();
  return NextResponse.json({ utilities: rows });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") || "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const fileName = file.name || "utility.bin";
  const finalName = name || fileName;
  const db = getDb();

  const utilityDir = path.join(UTILITIES_DIR, id);
  ensureUtilitiesDir(utilityDir);
  const filePath = path.join(utilityDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  db.prepare(
    "INSERT INTO utilities (id, name, file_name, content, file_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, finalName, fileName, "", filePath, now, now);

  return NextResponse.json({ id });
}
