import { loadCatalog, saveCatalog } from "./catalogStore";
import {
  isRegistryConfigured,
  refreshCatalogVersions,
} from "./registryVersions";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function ensureVersionScheduler() {
  if (!isRegistryConfigured()) return;
  const globalKey = "__composebuilder_version_scheduler__";
  const globalRef = globalThis as unknown as Record<string, boolean>;
  if (globalRef[globalKey]) return;
  globalRef[globalKey] = true;

  const runRefresh = async () => {
    try {
      const catalog = loadCatalog();
      const result = await refreshCatalogVersions(catalog);
      if (result.updated) {
        saveCatalog(result.services);
      }
    } catch {
      // Scheduler should be silent to avoid noisy logs.
    }
  };

  runRefresh().catch(() => null);
  setInterval(() => {
    runRefresh().catch(() => null);
  }, ONE_DAY_MS);
}
