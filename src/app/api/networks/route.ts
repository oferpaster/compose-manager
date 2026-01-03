import { NextResponse } from "next/server";
import { loadNetworks, saveNetworks } from "@/lib/networkStore";

export async function GET() {
  return NextResponse.json({ networks: loadNetworks() });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { networks?: string[] };
  const networks = Array.isArray(body.networks) ? body.networks : [];
  saveNetworks(networks);
  return NextResponse.json({ ok: true });
}
