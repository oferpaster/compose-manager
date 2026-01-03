"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  springBoot: false,
  propertiesTemplateFile: "",
  applicationPropertiesTemplate: "",
});

export default function TemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [service, setService] = useState<ServiceCatalogItem>(emptyService());
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/catalog-config");
      const data = (await response.json()) as { services: ServiceCatalogItem[] };
      const loaded = data.services || [];
      setServices(loaded);
      if (params.id === "new") {
        setService(emptyService());
        return;
      }
      const match = loaded.find((item) => item.id === params.id);
      setService(match ? { ...match } : emptyService());
    }

    load().catch(() => null);
  }, [params.id]);

  useEffect(() => {
    async function loadNetworks() {
      const response = await fetch("/api/networks");
      const data = (await response.json()) as { networks: string[] };
      setNetworks(data.networks || []);
    }

    loadNetworks().catch(() => null);
  }, []);

  const envText = useMemo(
    () =>
      Object.entries(service.defaultEnv || {})
        .map(([key, value]) => `${key}=${value}`)
        .join("\n"),
    [service.defaultEnv]
  );

  const handleSave = async () => {
    if (!service.id.trim()) {
      setSaveMessage("Service ID is required");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    const nextServices = [...services];
    const existingIndex = nextServices.findIndex((item) => item.id === service.id);
    if (existingIndex >= 0) {
      nextServices[existingIndex] = service;
    } else {
      nextServices.push(service);
    }

    try {
      const response = await fetch("/api/catalog-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: nextServices }),
      });
      if (!response.ok) {
        throw new Error("Failed to save template");
      }
      setSaveMessage("Saved");
      setServices(nextServices);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save");
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
            <p className="text-sm uppercase tracking-widest text-slate-500">Template</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {params.id === "new" ? "New service" : service.name || "Edit service"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/templates")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to templates
            </button>
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save template"}
            </button>
            {saveMessage ? (
              <span className="text-sm text-slate-500">{saveMessage}</span>
            ) : null}
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Service Name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.id}
                onChange={(event) => setService({ ...service, id: event.target.value })}
                placeholder="inventory-service"
              />
            </label>
            <label className="text-sm text-slate-600">
              Name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.name}
                onChange={(event) => setService({ ...service, name: event.target.value })}
                placeholder="Inventory Service"
              />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Description
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.description}
                onChange={(event) =>
                  setService({ ...service, description: event.target.value })
                }
                placeholder="Spring Boot service for inventory"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Image
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.image}
                onChange={(event) => setService({ ...service, image: event.target.value })}
                placeholder="ghcr.io/example/inventory-service"
              />
            </label>
            <label className="text-sm text-slate-600">
              Versions (one per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.versions.join("\n")}
                onChange={(event) =>
                  setService({
                    ...service,
                    versions: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="1.0.0"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default container name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultContainerName || ""}
                onChange={(event) =>
                  setService({ ...service, defaultContainerName: event.target.value })
                }
                placeholder="inventory-service"
              />
            </label>
            <label className="text-sm text-slate-600">
              Spring Boot
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.springBoot ? "yes" : "no"}
                onChange={(event) =>
                  setService({
                    ...service,
                    springBoot: event.target.value === "yes",
                  })
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            {service.springBoot ? null : (
              <label className="text-sm text-slate-600 md:col-span-2">
                application.properties template path
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  value={service.propertiesTemplateFile || ""}
                  onChange={(event) =>
                    setService({ ...service, propertiesTemplateFile: event.target.value })
                  }
                  placeholder="data/service-templates/inventory-service/application.properties"
                />
              </label>
            )}
          </div>

          {service.springBoot ? (
            <div className="mt-4">
              <label className="text-sm text-slate-600">
                application.properties template
                <textarea
                  className="mt-2 min-h-[160px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                  value={service.applicationPropertiesTemplate || ""}
                  onChange={(event) =>
                    setService({
                      ...service,
                      applicationPropertiesTemplate: event.target.value,
                    })
                  }
                  placeholder="server.port=8080"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Default ports (one per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={(service.defaultPorts || []).join("\n")}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultPorts: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="8080:8080"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default volumes (one per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={(service.defaultVolumes || []).join("\n")}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultVolumes: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="./data:/var/lib/app"
              />
            </label>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Default networks</p>
              <div className="flex flex-wrap gap-2">
                {networks.map((network) => {
                  const selected = service.defaultNetworks?.includes(network);
                  return (
                    <button
                      key={network}
                      type="button"
                      onClick={() => {
                        const existing = service.defaultNetworks || [];
                        const next = selected
                          ? existing.filter((item) => item !== network)
                          : [...existing, network];
                        setService({ ...service, defaultNetworks: next });
                      }}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {network}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-600">
              Default environment (KEY=value per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={envText}
                onChange={(event) => {
                  const env = event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .reduce<Record<string, string>>((acc, line) => {
                      const [key, ...rest] = line.split("=");
                      acc[key] = rest.join("=");
                      return acc;
                    }, {});
                  setService({ ...service, defaultEnv: env });
                }}
                placeholder="KEY=value"
              />
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
