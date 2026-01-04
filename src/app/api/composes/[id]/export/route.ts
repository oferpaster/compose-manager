import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ComposeConfig } from "@/lib/compose";
import { buildComposeZipBuffer } from "@/lib/composeExport";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT composes.config_json, composes.name as compose_name, projects.name as project_name FROM composes JOIN projects ON projects.id = composes.project_id WHERE composes.id = ?"
    )
    .get(id) as
    | { config_json: string; compose_name: string; project_name: string }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = JSON.parse(row.config_json) as ComposeConfig;
  const buffer = await buildComposeZipBuffer(config, id);

  const safeProject = row.project_name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeCompose = row.compose_name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const fileName = `${safeProject}__${safeCompose}.zip`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${fileName}`,
    },
  });
}
