import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { findServiceById } from "@/lib/catalogStore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  const service = findServiceById(serviceId);
  if (
    !service?.propertiesTemplateFile &&
    service?.applicationPropertiesTemplate
  ) {
    return NextResponse.json({
      template: service.applicationPropertiesTemplate,
    });
  }

  if (!service?.propertiesTemplateFile) {
    const fallbackPath = path.join(
      process.cwd(),
      "data",
      "service-templates",
      serviceId,
      "application.properties"
    );
    if (fs.existsSync(fallbackPath)) {
      const template = fs.readFileSync(fallbackPath, "utf8");
      return NextResponse.json({ template });
    }
    return NextResponse.json({ template: "" });
  }

  if (service.applicationPropertiesTemplate) {
    return NextResponse.json({ template: service.applicationPropertiesTemplate });
  }

  const templatePath = path.join(process.cwd(), service.propertiesTemplateFile);
  if (!fs.existsSync(templatePath)) {
    return NextResponse.json({ template: "" });
  }

  const template = fs.readFileSync(templatePath, "utf8");
  return NextResponse.json({ template });
}
