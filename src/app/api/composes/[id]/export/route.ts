import { NextResponse } from "next/server";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import { getDb } from "@/lib/db";
import { saveComposeAssets } from "@/lib/storage";
import { ComposeConfig } from "@/lib/compose";

function bufferFromStream(stream: PassThrough) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

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
  saveComposeAssets(config);

  const composeDir = path.join(process.cwd(), "data", "compose-files", id);
  const composePath = path.join(composeDir, "docker-compose.yml");
  const envPath = path.join(composeDir, ".env");

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  if (fs.existsSync(composePath)) {
    archive.file(composePath, { name: "docker-compose.yml" });
  }
  if (fs.existsSync(envPath)) {
    archive.file(envPath, { name: ".env" });
  }

  const servicesDir = composeDir;
  if (fs.existsSync(servicesDir)) {
    const entries = fs.readdirSync(servicesDir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isDirectory()) return;
      if (entry.name === "node_modules") return;
      if (entry.name.startsWith(".")) return;
      if (entry.name === "services") return;
      if (entry.name === "..") return;
      if (entry.name === ".env" || entry.name === "docker-compose.yml") return;
      const folderPath = path.join(servicesDir, entry.name);
      const propsPath = path.join(folderPath, "application.properties");
      if (fs.existsSync(propsPath)) {
        archive.file(propsPath, { name: `${entry.name}/application.properties` });
      }
    });
  }

  const scriptIds = Array.isArray(config.scriptIds) ? config.scriptIds : [];
  if (scriptIds.length > 0) {
    const placeholders = scriptIds.map(() => "?").join(",");
    const scripts = db
      .prepare(`SELECT id, file_name, content FROM scripts WHERE id IN (${placeholders})`)
      .all(...scriptIds) as { id: string; file_name: string; content: string }[];
    scripts.forEach((script) => {
      const fileName = script.file_name || "script.sh";
      archive.append(script.content || "", { name: fileName });
    });
  }

  const nginxConfig = config.nginx;
  if (nginxConfig) {
    if (nginxConfig.config?.trim()) {
      archive.append(nginxConfig.config, { name: "nginx/nginx.conf" });
    }
    if (nginxConfig.cert?.trim()) {
      archive.append(nginxConfig.cert, { name: "nginx/ssl/cert.crt" });
    }
    if (nginxConfig.key?.trim()) {
      archive.append(nginxConfig.key, { name: "nginx/ssl/key.key" });
    }
    if (nginxConfig.ca?.trim()) {
      archive.append(nginxConfig.ca, { name: "nginx/ssl/ca.crt" });
    }
  }

  await archive.finalize();
  const buffer = await bufferFromStream(stream);

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
