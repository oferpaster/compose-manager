import { NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; downloadId: string }> }
) {
  const { id, downloadId } = await params;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT file_name, file_path FROM image_downloads WHERE id = ? AND compose_id = ?"
    )
    .get(downloadId, id) as { file_name: string; file_path: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }

  if (!fs.existsSync(row.file_path)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const stream = Readable.toWeb(fs.createReadStream(row.file_path)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Disposition": `attachment; filename=${row.file_name}`,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; downloadId: string }> }
) {
  const { id, downloadId } = await params;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT file_path FROM image_downloads WHERE id = ? AND compose_id = ?"
    )
    .get(downloadId, id) as { file_path: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }

  if (fs.existsSync(row.file_path)) {
    fs.unlinkSync(row.file_path);
  }
  db.prepare("DELETE FROM image_downloads WHERE id = ?").run(downloadId);

  return NextResponse.json({ ok: true });
}
