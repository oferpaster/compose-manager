import fs from "fs";
import path from "path";

const NETWORKS_PATH = path.join(process.cwd(), "data", "networks.json");

export type NetworkConfig = { name: string; driver?: string };

export function loadNetworks(): NetworkConfig[] {
  if (fs.existsSync(NETWORKS_PATH)) {
    try {
      const raw = fs.readFileSync(NETWORKS_PATH, "utf8");
      const parsed = JSON.parse(raw) as NetworkConfig[];
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item?.name === "string" && item.name.trim());
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function saveNetworks(networks: NetworkConfig[]) {
  fs.mkdirSync(path.dirname(NETWORKS_PATH), { recursive: true });
  fs.writeFileSync(NETWORKS_PATH, JSON.stringify(networks, null, 2), "utf8");
}
