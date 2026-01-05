import { NextResponse } from "next/server";
import fs from "fs";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT file_name, file_path FROM utilities WHERE id = ?")
    .get(id) as { file_name?: string; file_path?: string } | undefined;

  if (!row?.file_path) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!fs.existsSync(row.file_path)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const buffer = fs.readFileSync(row.file_path);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename=${row.file_name || "utility.bin"}`,
    },
  });
}
