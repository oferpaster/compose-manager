import fs from "fs";
import http from "http";
import path from "path";
import os from "os";
import archiver from "archiver";
import { pipeline } from "stream/promises";

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
const REGISTRY_HOST = process.env.REGISTRY_HOST || "";
const REGISTRY_USERNAME = process.env.REGISTRY_USERNAME || "";
const REGISTRY_PASSWORD = process.env.REGISTRY_PASSWORD || "";

export function isDockerImageDownloadEnabled() {
  const socketReady = fs.existsSync(DOCKER_SOCKET);
  const registryReady = Boolean(
    REGISTRY_HOST && REGISTRY_USERNAME && REGISTRY_PASSWORD
  );
  return socketReady && registryReady;
}

function buildRegistryAuthHeader() {
  if (!REGISTRY_HOST || !REGISTRY_USERNAME || !REGISTRY_PASSWORD) return "";
  const payload = {
    username: REGISTRY_USERNAME,
    password: REGISTRY_PASSWORD,
    serveraddress: REGISTRY_HOST,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function createDockerRequest(
  pathName: string,
  method: "GET" | "POST",
  headers?: Record<string, string>
) {
  return http.request({
    socketPath: DOCKER_SOCKET,
    path: pathName,
    method,
    headers,
  });
}

async function pullImage(image: string, authHeader: string) {
  await new Promise<void>((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["X-Registry-Auth"] = authHeader;
    }
    const req = createDockerRequest(
      `/images/create?fromImage=${encodeURIComponent(image)}`,
      "POST",
      headers
    );
    let body = "";
    req.on("response", (res) => {
      res.on("data", (chunk) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 300) {
          reject(new Error(body || `Docker pull failed for ${image}`));
          return;
        }
        resolve();
      });
    });
    req.on("error", reject);
    req.end();
  });
}

export async function pullDockerImages(images: string[]) {
  const uniqueImages = Array.from(new Set(images)).filter(Boolean);
  const authHeader = buildRegistryAuthHeader();
  for (const image of uniqueImages) {
    await pullImage(image, authHeader);
  }
}

type ImageTarEntry = {
  image: string;
  fileName: string;
};

async function saveSingleImageTar(image: string, outputPath: string, authHeader: string) {
  await new Promise<void>((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["X-Registry-Auth"] = authHeader;
    }
    const req = createDockerRequest(
      `/images/get?names=${encodeURIComponent(image)}`,
      "GET",
      headers
    );
    req.on("response", async (res) => {
      if (res.statusCode && res.statusCode >= 300) {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          reject(new Error(body || `Failed to export ${image}`));
        });
        return;
      }
      try {
        await pipeline(res, fs.createWriteStream(outputPath));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
    req.end();
  });
}

export async function saveDockerImagesTar(
  entries: ImageTarEntry[],
  outputPath: string,
  metadata?: Record<string, unknown>
) {
  const uniqueEntries = entries
    .filter((entry) => entry.image)
    .reduce<ImageTarEntry[]>((acc, entry) => {
      if (acc.some((item) => item.image === entry.image)) return acc;
      acc.push(entry);
      return acc;
    }, []);
  if (uniqueEntries.length === 0) {
    throw new Error("No images selected");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const authHeader = buildRegistryAuthHeader();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "composebuilder-images-"));
  const tempFiles: { path: string; name: string }[] = [];

  try {
    for (const entry of uniqueEntries) {
      const filePath = path.join(tempDir, entry.fileName);
      await saveSingleImageTar(entry.image, filePath, authHeader);
      tempFiles.push({ path: filePath, name: entry.fileName });
    }

    const archive = archiver("tar");
    const output = fs.createWriteStream(outputPath);
    archive.pipe(output);

    tempFiles.forEach((file) => {
      archive.file(file.path, { name: file.name });
    });

    if (metadata) {
      archive.append(JSON.stringify(metadata, null, 2), {
        name: "images.json",
      });
    }

    await archive.finalize();
    await new Promise<void>((resolve, reject) => {
      output.on("close", () => resolve());
      output.on("error", reject);
    });
  } finally {
    tempFiles.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
