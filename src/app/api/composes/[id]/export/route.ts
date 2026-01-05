import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getDb } from "@/lib/db";
import { ComposeConfig } from "@/lib/compose";
import {
  buildComposeZipBuffer,
  createComposeArchiveStream,
  ExportOptions,
} from "@/lib/composeExport";

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

export async function POST(
  request: Request,
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

  const body = (await request.json()) as Partial<ExportOptions>;
  const options: ExportOptions = {
    includeCompose: body.includeCompose !== false,
    includeConfigs: body.includeConfigs !== false,
    includeScripts: body.includeScripts !== false,
    includeUtilities: body.includeUtilities !== false,
  };

  const config = JSON.parse(row.config_json) as ComposeConfig;
  const stream = await createComposeArchiveStream(config, id, options);

  const safeProject = row.project_name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeCompose = row.compose_name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const fileName = `${safeProject}__${safeCompose}.zip`;

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${fileName}`,
    },
  });
}
