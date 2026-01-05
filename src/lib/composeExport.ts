import archiver from "archiver";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import { ComposeConfig, generatePrometheusYaml } from "./compose";
import { loadCatalog } from "./catalogStore";
import { saveComposeAssets } from "./storage";
import { getDb } from "./db";

function bufferFromStream(stream: PassThrough) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function buildComposeZipBuffer(config: ComposeConfig, composeId: string) {
  return buildComposeZipBufferWithOptions(config, composeId, {
    includeCompose: true,
    includeConfigs: true,
    includeScripts: true,
    includeUtilities: true,
  });
}

export type ExportOptions = {
  includeCompose: boolean;
  includeConfigs: boolean;
  includeScripts: boolean;
  includeUtilities: boolean;
};

export async function buildComposeZipBufferWithOptions(
  config: ComposeConfig,
  composeId: string,
  options: ExportOptions
) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);
  await appendComposeEntries(archive, config, composeId, options);

  await archive.finalize();
  return bufferFromStream(stream);
}

export async function createComposeArchiveStream(
  config: ComposeConfig,
  composeId: string,
  options: ExportOptions
) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);
  await appendComposeEntries(archive, config, composeId, options);
  archive.finalize();
  return stream;
}

async function appendComposeEntries(
  archive: archiver.Archiver,
  config: ComposeConfig,
  composeId: string,
  options: ExportOptions
) {
  const db = getDb();
  saveComposeAssets(config);

  const composeDir = path.join(process.cwd(), "data", "compose-files", composeId);
  const composePath = path.join(composeDir, "docker-compose.yml");
  const envPath = path.join(composeDir, ".env");

  if (options.includeCompose && fs.existsSync(composePath)) {
    archive.file(composePath, { name: "docker-compose.yml" });
  }
  if (options.includeConfigs && fs.existsSync(envPath)) {
    archive.file(envPath, { name: ".env" });
  }

  if (options.includeConfigs) {
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
  }

  if (options.includeScripts) {
    const scriptIds = Array.isArray(config.scriptIds) ? config.scriptIds : [];
    if (scriptIds.length > 0) {
      const placeholders = scriptIds.map(() => "?").join(",");
      const scripts = db
        .prepare(`SELECT id, file_name, content FROM scripts WHERE id IN (${placeholders})`)
        .all(...scriptIds) as { id: string; file_name: string; content: string }[];
      scripts.forEach((script) => {
        const fileName = script.file_name || "script.sh";
        archive.append(script.content || "", { name: `scripts/${fileName}` });
      });
    }
  }

  if (options.includeUtilities) {
    const utilityIds = Array.isArray(config.utilityIds) ? config.utilityIds : [];
    if (utilityIds.length > 0) {
      const placeholders = utilityIds.map(() => "?").join(",");
      const utilities = db
        .prepare(`SELECT id, file_name, file_path FROM utilities WHERE id IN (${placeholders})`)
        .all(...utilityIds) as { id: string; file_name: string; file_path?: string }[];
      utilities.forEach((utility) => {
        const fileName = utility.file_name || "utility.bin";
        if (utility.file_path && fs.existsSync(utility.file_path)) {
          archive.file(utility.file_path, { name: `utilities/${fileName}` });
        }
      });
    }
  }

  if (options.includeConfigs) {
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

    if (config.prometheus?.enabled) {
      const prometheusYaml =
        config.prometheus.configYaml?.trim() || generatePrometheusYaml(config, loadCatalog());
      if (prometheusYaml.trim()) {
        archive.append(prometheusYaml, { name: "prometheus/prometheus.yml" });
      }
    }
  }
}
