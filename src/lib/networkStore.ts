import fs from "fs";
import path from "path";

const NETWORKS_PATH = path.join(process.cwd(), "data", "networks.json");

export function loadNetworks(): string[] {
  if (fs.existsSync(NETWORKS_PATH)) {
    try {
      const raw = fs.readFileSync(NETWORKS_PATH, "utf8");
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function saveNetworks(networks: string[]) {
  fs.mkdirSync(path.dirname(NETWORKS_PATH), { recursive: true });
  fs.writeFileSync(NETWORKS_PATH, JSON.stringify(networks, null, 2), "utf8");
}
