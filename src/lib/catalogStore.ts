import fs from "fs";
import path from "path";
import { ServiceCatalogItem } from "./serviceCatalog";

const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");

export function loadCatalog(): ServiceCatalogItem[] {
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      const raw = fs.readFileSync(CATALOG_PATH, "utf8");
      const parsed = JSON.parse(raw) as ServiceCatalogItem[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function saveCatalog(nextCatalog: ServiceCatalogItem[]) {
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(nextCatalog, null, 2), "utf8");
}

export function findServiceById(serviceId: string) {
  return loadCatalog().find((service) => service.id === serviceId) || null;
}

export function findServiceByImage(image: string) {
  return loadCatalog().find((service) => service.image === image) || null;
}
