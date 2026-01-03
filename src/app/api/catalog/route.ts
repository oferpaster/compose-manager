import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalogStore";
import { PREDEFINED_NETWORKS } from "@/lib/serviceCatalog";

export async function GET() {
  return NextResponse.json({
    services: loadCatalog(),
    networks: PREDEFINED_NETWORKS,
  });
}
