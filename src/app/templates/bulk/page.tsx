"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parse as yamlParse } from "yaml";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

const emptyService = (): ServiceCatalogItem => ({
  id: "",
  name: "",
  description: "",
  image: "",
  versions: [],
  defaultPorts: [],
  defaultVolumes: [],
  defaultEnv: {},
  defaultContainerName: "",
  defaultNetworks: [],
  defaultRestart: "",
  springBoot: false,
  propertiesTemplateFile: "",
  applicationPropertiesTemplate: "",
});

type ExtractedService = ServiceCatalogItem & { sourceName: string };

type ComposeService = Record<string, unknown>;

type ComposeYaml = {
  services?: Record<string, ComposeService>;
};

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const entry = item as { source?: string; target?: string; read_only?: boolean };
          if (entry.source && entry.target) {
            return `${entry.source}:${entry.target}${entry.read_only ? ":ro" : ""}`;
          }
          if (entry.target) return entry.target;
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string") return [value];
  return [];
}

function parseNetworks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>);
  }
  return [];
}

function parseEnvironment(value: unknown): Record<string, string> {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, string>>((acc, item) => {
      const [key, ...rest] = String(item).split("=");
      if (key.trim()) acc[key.trim()] = rest.join("=");
      return acc;
    }, {});
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [key, val]) => {
        acc[key] = String(val);
        return acc;
      },
      {}
    );
  }
  return {};
}

function hasApplicationPropertiesVolume(value: unknown) {
  if (!Array.isArray(value)) return false;
  return value.some((item) => {
    if (typeof item === "string") {
      return item.includes("application.properties");
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const entry = item as { target?: string };
      return entry.target?.includes("application.properties");
    }
    return false;
  });
}

function mergeUnique<T>(base: T[], next: T[]) {
  const set = new Set(base);
  next.forEach((item) => set.add(item));
  return Array.from(set);
}

export default function BulkTemplatesPage() {
  const [composeText, setComposeText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedService[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setSaveMessage("");
  }, [composeText]);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setComposeText(text);
  };

  const handleExtract = () => {
    setError("");
    let parsed: ComposeYaml;
    try {
      parsed = yamlParse(composeText) as ComposeYaml;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid YAML");
      return;
    }

    if (!parsed?.services || typeof parsed.services !== "object") {
      setError("Compose file must include services.");
      return;
    }

    const map = new Map<string, ExtractedService>();

    Object.entries(parsed.services).forEach(([serviceName, service]) => {
      const image = typeof service.image === "string" ? service.image : "";
      if (!image) return;
      const [imageName, ...tagParts] = image.split(":");
      const version = tagParts.length > 0 ? tagParts.join(":") : "latest";

      const ports = parseStringArray(service.ports);
      const volumes = parseStringArray(service.volumes);
      const env = parseEnvironment(service.environment);
      const networks = parseNetworks(service.networks);
      const containerName =
        typeof service.container_name === "string" ? service.container_name : "";
      const springBoot =
        volumes.some((vol) => vol.includes("application.properties")) ||
        hasApplicationPropertiesVolume(service.volumes);

      const existing = map.get(imageName);
      if (existing) {
        existing.versions = mergeUnique(existing.versions, [version]);
        existing.defaultPorts = mergeUnique(existing.defaultPorts || [], ports);
        existing.defaultVolumes = mergeUnique(existing.defaultVolumes || [], volumes);
        existing.defaultNetworks = mergeUnique(existing.defaultNetworks || [], networks);
        existing.defaultEnv = { ...existing.defaultEnv, ...env };
        return;
      }

      const base = emptyService();
      base.image = imageName;
      base.versions = [version];
      base.defaultPorts = ports;
      base.defaultVolumes = volumes;
      base.defaultNetworks = networks;
      base.defaultEnv = env;
      base.defaultContainerName = containerName;
      base.springBoot = springBoot;

      map.set(imageName, {
        ...base,
        sourceName: serviceName,
      });
    });

    const next = Array.from(map.values()).map((item) => ({
      ...item,
      id: item.id || item.image.split("/").pop() || "",
      name: item.name || item.sourceName,
    }));

    setExtracted(next);
  };

  const updateExtracted = (index: number, next: ExtractedService) => {
    setExtracted((prev) => prev.map((item, idx) => (idx === index ? next : item)));
  };

  const removeExtracted = (index: number) => {
    setExtracted((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/catalog-config");
      const data = (await response.json()) as { services: ServiceCatalogItem[] };
      const existing = data.services || [];
      const next = [...existing];

      extracted.forEach((service) => {
        const payload: ServiceCatalogItem = { ...service };
        delete (payload as ExtractedService).sourceName;
        const index = next.findIndex((item) => item.image === payload.image);
        if (index >= 0) {
          const current = next[index];
          const mergedVersions = mergeUnique(
            current.versions || [],
            payload.versions || []
          );
          next[index] = { ...current, versions: mergedVersions };
        } else {
          const id = payload.id.trim();
          if (!id) return;
          next.push(payload);
        }
      });

      const save = await fetch("/api/catalog-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: next }),
      });
      if (!save.ok) {
        throw new Error("Failed to save templates");
      }
      setSaveMessage("Saved");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Bulk templates
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Extract services from compose
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to templates
            </Link>
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              disabled={isSaving || extracted.length === 0}
            >
              Save templates
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-sm text-slate-600">
            Paste docker-compose.yml
            <textarea
              className="mt-2 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
              value={composeText}
              onChange={(event) => setComposeText(event.target.value)}
              placeholder="services:\n  my-service: ..."
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              Upload compose file
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
            <button
              onClick={handleExtract}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Extract
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Extracted services</h2>
          </div>

          {extracted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No services extracted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {extracted.map((service, index) => (
                <div
                  key={`${service.image}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Image</p>
                      <p className="text-base font-semibold text-slate-900">
                        {service.image}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        Versions: {service.versions.join(", ")}
                      </span>
                      <button
                        onClick={() => removeExtracted(index)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      Service Name
                      <input
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={service.id}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
                            id: event.target.value,
                          })
                        }
                        placeholder="inventory-service"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      Display Name
                      <input
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={service.name}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
                            name: event.target.value,
                          })
                        }
                        placeholder="Inventory Service"
                      />
                    </label>
                    <label className="text-sm text-slate-600 md:col-span-2">
                      Description
                      <input
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={service.description}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
                            description: event.target.value,
                          })
                        }
                        placeholder="Auto extracted from compose"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
          {saveMessage ? (
            <p className="text-sm text-slate-600">{saveMessage}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
