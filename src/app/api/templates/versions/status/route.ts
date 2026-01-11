import { NextResponse } from "next/server";
import { isRegistryConfigured } from "@/lib/registryVersions";

export async function GET() {
  return NextResponse.json({ enabled: isRegistryConfigured() });
}
