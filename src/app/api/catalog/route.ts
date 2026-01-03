import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalogStore";
import { loadNetworks } from "@/lib/networkStore";

export async function GET() {
  return NextResponse.json({
    services: loadCatalog(),
    networks: loadNetworks(),
  });
}
