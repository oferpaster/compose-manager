import { NextResponse } from "next/server";
import { loadCatalog, saveCatalog } from "@/lib/catalogStore";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";
import { ensureVersionScheduler } from "@/lib/versionScheduler";

ensureVersionScheduler();

export async function GET() {
  return NextResponse.json({ services: loadCatalog() });
}

export async function PUT(request: Request) {
  let body: { services?: ServiceCatalogItem[] };
  try {
    body = (await request.json()) as { services?: ServiceCatalogItem[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (body.services && !Array.isArray(body.services)) {
    return NextResponse.json(
      { error: "services must be an array" },
      { status: 400 }
    );
  }

  try {
    const services = Array.isArray(body.services) ? body.services : [];
    saveCatalog(services);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save catalog:", error);
    return NextResponse.json(
      { error: "Failed to save catalog" },
      { status: 500 }
    );
  }
}
