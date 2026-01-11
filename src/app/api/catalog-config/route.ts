import { NextResponse } from "next/server";
import { loadCatalog, saveCatalog } from "@/lib/catalogStore";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";
import { ensureVersionScheduler } from "@/lib/versionScheduler";

ensureVersionScheduler();

export async function GET() {
  return NextResponse.json({ services: loadCatalog() });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { services?: ServiceCatalogItem[] };
  const services = Array.isArray(body.services) ? body.services : [];
  saveCatalog(services);
  return NextResponse.json({ ok: true });
}
