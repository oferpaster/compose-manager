import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id, snapshotId } = await params;
  const db = getDb();
  const snapshot = db
    .prepare(
      "SELECT id, file_name FROM snapshots WHERE id = ? AND compose_id = ?"
    )
    .get(snapshotId, id) as { id: string; file_name: string } | undefined;

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const filePath = path.join(SNAPSHOT_DIR, `${snapshotId}.zip`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Snapshot file missing" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${snapshot.file_name}`,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id, snapshotId } = await params;
  const db = getDb();
  const snapshot = db
    .prepare(
      "SELECT id FROM snapshots WHERE id = ? AND compose_id = ?"
    )
    .get(snapshotId, id) as { id: string } | undefined;

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const filePath = path.join(SNAPSHOT_DIR, `${snapshotId}.zip`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  db.prepare("DELETE FROM snapshots WHERE id = ?").run(snapshotId);

  return NextResponse.json({ ok: true });
}
