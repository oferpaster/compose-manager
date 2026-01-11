import { NextResponse } from "next/server";
import { loadCatalog, saveCatalog } from "@/lib/catalogStore";
import {
  isRegistryConfigured,
  refreshServiceVersions,
} from "@/lib/registryVersions";

type RouteParams = {
  params: Promise<{ serviceId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { serviceId } = await params;
  if (!isRegistryConfigured()) {
    return NextResponse.json(
      { enabled: false, updated: false, service: null },
      { status: 200 }
    );
  }

  const catalog = loadCatalog();
  const index = catalog.findIndex((service) => service.id === serviceId);
  if (index === -1) {
    return NextResponse.json(
      { enabled: true, updated: false, service: null },
      { status: 404 }
    );
  }

  const result = await refreshServiceVersions(catalog[index]);
  if (result.updated) {
    const next = [...catalog];
    next[index] = result.service;
    saveCatalog(next);
  }

  return NextResponse.json({
    enabled: true,
    updated: result.updated,
    service: result.service,
  });
}
