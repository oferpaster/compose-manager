import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getDb } from "@/lib/db";
import { normalizeComposeConfig, ComposeConfig } from "@/lib/compose";
import { loadCatalog } from "@/lib/catalogStore";
import {
  pullDockerImages,
  saveDockerImagesTar,
  isDockerImageDownloadEnabled,
} from "@/lib/dockerImages";

type ImageOption = {
  image: string;
  version: string;
  services: string[];
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DOWNLOAD_DIR = path.join(DATA_DIR, "downloads");

function ensureDir(target: string) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function buildImageOptions(config: ComposeConfig): ImageOption[] {
  const catalog = loadCatalog();
  const catalogById = new Map(catalog.map((service) => [service.id, service]));
  const images = new Map<string, { version: string; services: Set<string> }>();

  config.services.forEach((serviceConfig) => {
    const service = catalogById.get(serviceConfig.serviceId);
    if (!service?.image) return;
    const version =
      serviceConfig.version || service.versions?.[0] || "latest";
    const image = `${service.image}:${version}`;
    const name = serviceConfig.name || serviceConfig.serviceId || service.id;
    if (!images.has(image)) {
      images.set(image, { version, services: new Set() });
    }
    images.get(image)?.services.add(name);
  });

  return Array.from(images.entries())
    .map(([image, value]) => ({
      image,
      version: value.version,
      services: Array.from(value.services).sort(),
    }))
    .sort((a, b) => a.image.localeCompare(b.image));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const compose = db
    .prepare("SELECT id, project_id, name, config_json FROM composes WHERE id = ?")
    .get(id) as { id: string; project_id: string; name: string; config_json: string } | undefined;

  if (!compose) {
    return NextResponse.json({ error: "Compose not found" }, { status: 404 });
  }

  const config = normalizeComposeConfig(JSON.parse(compose.config_json));
  const enabled = isDockerImageDownloadEnabled();
  const images = enabled ? buildImageOptions(config) : [];

  const downloads = db
    .prepare(
      `SELECT id, file_name, images_json, status, error_message, created_at
       FROM image_downloads WHERE compose_id = ? ORDER BY created_at DESC`
    )
    .all(id) as {
    id: string;
    file_name: string;
    images_json: string;
    status: string;
    error_message?: string;
    created_at: string;
  }[];

  const parsedDownloads = downloads.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    status: row.status,
    errorMessage: row.error_message || "",
    createdAt: row.created_at,
    images: (() => {
      try {
        return JSON.parse(row.images_json) as ImageOption[];
      } catch {
        return [];
      }
    })(),
  }));

  return NextResponse.json({ enabled, images, downloads: parsedDownloads });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDockerImageDownloadEnabled()) {
    return NextResponse.json(
      { error: "Docker image downloads are not configured" },
      { status: 400 }
    );
  }
  const db = getDb();
  const compose = db
    .prepare("SELECT id, project_id, name, config_json FROM composes WHERE id = ?")
    .get(id) as { id: string; project_id: string; name: string; config_json: string } | undefined;

  if (!compose) {
    return NextResponse.json({ error: "Compose not found" }, { status: 404 });
  }

  const body = (await request.json()) as { images?: string[] };
  const requestedImages = Array.isArray(body.images)
    ? body.images.filter(Boolean)
    : [];
  if (requestedImages.length === 0) {
    return NextResponse.json({ error: "Select at least one image" }, { status: 400 });
  }

  const config = normalizeComposeConfig(JSON.parse(compose.config_json));
  const available = buildImageOptions(config);
  const selected = available.filter((item) => requestedImages.includes(item.image));

  if (selected.length === 0) {
    return NextResponse.json({ error: "No matching images" }, { status: 400 });
  }

  const project = db
    .prepare("SELECT name FROM projects WHERE id = ?")
    .get(compose.project_id) as { name: string } | undefined;

  const safeProject = sanitizeName(project?.name || "project");
  const safeCompose = sanitizeName(compose.name || "compose");
  const stamp = formatTimestamp(new Date());
  const fileName = `${safeProject}__${safeCompose}__${stamp}.tar`;

  ensureDir(DOWNLOAD_DIR);
  const filePath = path.join(DOWNLOAD_DIR, fileName);
  const downloadId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO image_downloads
      (id, compose_id, project_id, file_name, file_path, images_json, status, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    downloadId,
    compose.id,
    compose.project_id,
    fileName,
    filePath,
    JSON.stringify(selected),
    "queued",
    "",
    now,
    now
  );

  try {
    await pullDockerImages(selected.map((item) => item.image));
    const entries = selected.map((item) => {
      const serviceName = sanitizeName(item.services[0] || "service");
      const version = sanitizeName(item.version || "latest");
      return {
        image: item.image,
        fileName: `${serviceName}_${version}.tar`,
      };
    });
    await saveDockerImagesTar(entries, filePath, {
      generatedAt: now,
      composeId: compose.id,
      projectId: compose.project_id,
      images: selected,
    });
    db.prepare(
      "UPDATE image_downloads SET status = ?, updated_at = ? WHERE id = ?"
    ).run("completed", new Date().toISOString(), downloadId);
  } catch (error) {
    db.prepare(
      "UPDATE image_downloads SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"
    ).run(
      "failed",
      error instanceof Error ? error.message : "Download failed",
      new Date().toISOString(),
      downloadId
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    download: {
      id: downloadId,
      fileName,
      status: "completed",
      createdAt: now,
      images: selected,
    },
  });
}
