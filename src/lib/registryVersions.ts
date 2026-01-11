import { ServiceCatalogItem } from "./serviceCatalog";

const REGISTRY_HOST = process.env.REGISTRY_HOST || "";
const REGISTRY_USERNAME = process.env.REGISTRY_USERNAME || "";
const REGISTRY_PASSWORD = process.env.REGISTRY_PASSWORD || "";
const REGISTRY_PROTOCOL = process.env.REGISTRY_PROTOCOL || "https";

export function isRegistryConfigured() {
  return Boolean(
    REGISTRY_HOST.trim() &&
      REGISTRY_USERNAME.trim() &&
      REGISTRY_PASSWORD.trim()
  );
}

function getRegistryBaseUrl() {
  const trimmed = REGISTRY_HOST.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${REGISTRY_PROTOCOL}://${trimmed}`;
}

function parseImageName(image: string) {
  const imageWithoutDigest = image.split("@")[0];
  const lastColon = imageWithoutDigest.lastIndexOf(":");
  const lastSlash = imageWithoutDigest.lastIndexOf("/");
  const pathPart =
    lastColon > -1 && lastColon > lastSlash
      ? imageWithoutDigest.slice(0, lastColon)
      : imageWithoutDigest;
  const cleaned = pathPart.replace(/^https?:\/\//, "");
  const segments = cleaned.split("/").filter(Boolean);
  if (segments.length === 0) return { registry: "", repository: "" };
  const first = segments[0];
  const hasRegistry = first.includes(".") || first.includes(":");
  if (!hasRegistry) {
    return { registry: "", repository: pathPart };
  }
  return { registry: first, repository: segments.slice(1).join("/") };
}

function normalizeHost(host: string) {
  return host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isValidVersionTag(tag: string) {
  if (!tag) return false;
  if (tag.includes(".sig") || tag.includes(".att")) return false;
  return /^\d+(?:\.\d+)*$/.test(tag);
}

function compareVersions(a: string, b: string) {
  const aParts = a.split(".").map((part) => Number(part));
  const bParts = b.split(".").map((part) => Number(part));
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i += 1) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) {
      return bVal - aVal;
    }
  }
  return 0;
}

export async function fetchImageTags(image: string) {
  if (!isRegistryConfigured()) return null;
  const { registry, repository } = parseImageName(image);
  if (!registry || !repository) return null;
  if (normalizeHost(registry) !== normalizeHost(REGISTRY_HOST)) return null;

  const baseUrl = getRegistryBaseUrl();
  if (!baseUrl) return null;
  const url = `${baseUrl}/v2/${repository}/tags/list`;
  const auth = Buffer.from(
    `${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`
  ).toString("base64");

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { tags?: string[] };
  if (!Array.isArray(data.tags)) return [];
  return data.tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => isValidVersionTag(tag));
}

export async function refreshServiceVersions(
  service: ServiceCatalogItem
): Promise<{ service: ServiceCatalogItem; updated: boolean }> {
  if (!service.image) return { service, updated: false };
  const tags = await fetchImageTags(service.image);
  if (!tags) return { service, updated: false };
  const existing = service.versions || [];
  const next = [...existing];
  const existingSet = new Set(existing);
  tags.forEach((tag) => {
    if (!existingSet.has(tag)) {
      next.push(tag);
      existingSet.add(tag);
    }
  });
  const sorted = [...next].sort(compareVersions);
  if (sorted.length === existing.length) {
    return { service, updated: false };
  }
  return { service: { ...service, versions: sorted }, updated: true };
}

export async function refreshCatalogVersions(
  services: ServiceCatalogItem[]
) {
  let changed = false;
  const nextServices: ServiceCatalogItem[] = [];
  for (const service of services) {
    const result = await refreshServiceVersions(service);
    if (result.updated) changed = true;
    nextServices.push(result.service);
  }
  return { services: nextServices, updated: changed };
}
