import { NextResponse } from "next/server";
import { loadCatalog, saveCatalog } from "@/lib/catalogStore";
import {
  isRegistryConfigured,
  refreshCatalogVersions,
} from "@/lib/registryVersions";

export async function POST() {
  if (!isRegistryConfigured()) {
    return NextResponse.json(
      { enabled: false, updated: false, services: [] },
      { status: 200 }
    );
  }

  const catalog = loadCatalog();
  const result = await refreshCatalogVersions(catalog);
  if (result.updated) {
    saveCatalog(result.services);
  }
  return NextResponse.json({
    enabled: true,
    updated: result.updated,
    services: result.services,
  });
}
