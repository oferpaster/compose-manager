"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ServiceInstanceEditor from "@/components/ServiceInstanceEditor";
import {
  ComposeConfig,
  createServiceConfig,
  normalizeComposeConfig,
  ServiceConfig,
} from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

type CatalogResponse = {
  services: ServiceCatalogItem[];
  networks: { name: string; driver?: string }[];
};

export default function AddServicePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [compose, setCompose] = useState<ComposeConfig | null>(null);
  const [instances, setInstances] = useState<ServiceConfig[]>([]);
  const [catalog, setCatalog] = useState<CatalogResponse>({ services: [], networks: [] });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [templateCache, setTemplateCache] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const serviceId = searchParams.get("serviceId") || "";
  const versionParam = searchParams.get("version") || "";
  const countParam = Number(searchParams.get("count") || "1");

  useEffect(() => {
    async function loadCatalog() {
      const response = await fetch("/api/catalog");
      const data = (await response.json()) as CatalogResponse;
      setCatalog(data);
    }

    loadCatalog().catch(() => null);
  }, []);

  useEffect(() => {
    async function loadCompose() {
      const response = await fetch(`/api/composes/${params.id}`);
      if (!response.ok) {
        setError("Compose not found");
        return;
      }
      const data = (await response.json()) as { config: ComposeConfig };
      setCompose(normalizeComposeConfig(data.config));
    }

    loadCompose().catch(() => setError("Failed to load compose"));
  }, [params.id]);

  const availableServiceNames = useMemo(() => {
    const names = new Set<string>();
    if (compose) {
      compose.services.forEach((service) => names.add(service.name));
    }
    instances.forEach((service) => names.add(service.name));
    return Array.from(names);
  }, [compose, instances]);

  const loadTemplate = useCallback(
    async (serviceIdToLoad: string) => {
      if (serviceIdToLoad in templateCache) {
        return templateCache[serviceIdToLoad];
      }

      const response = await fetch(`/api/templates/${serviceIdToLoad}`);
      if (!response.ok) {
        setTemplateCache((prev) => ({ ...prev, [serviceIdToLoad]: "" }));
        return "";
      }
      const data = (await response.json()) as { template: string };

      const template = data.template ?? "";
      setTemplateCache((prev) => ({
        ...prev,
        [serviceIdToLoad]: template,
      }));
      return template;
    },
    [templateCache]
  );

  useEffect(() => {
    if (!compose || initialized || catalog.services.length === 0) return;

    if (!serviceId) {
      setError("Missing service selection");
      return;
    }

    const service = catalog.services.find((item) => item.id === serviceId);
    if (!service) {
      setError("Service not found");
      return;
    }

    const version = versionParam || service.versions[0] || "latest";
    const count = Math.max(1, Number.isFinite(countParam) ? countParam : 1);
    const groupId = crypto.randomUUID();
    const existingNames = new Set(compose.services.map((item) => item.name));

    let nextIndex = 1;
    const buildName = () => `${service.id}-${nextIndex}`;
    while (existingNames.has(buildName())) {
      nextIndex += 1;
    }

    const nextInstances: ServiceConfig[] = [];
    for (let i = 0; i < count; i += 1) {
      const name = `${service.id}-${nextIndex + i}`;
      const instance = createServiceConfig(service, {
        groupId,
        name,
        version,
      });
      nextInstances.push(instance);
    }

    setInstances(nextInstances);
    setSelectedId(nextInstances[0]?.id || null);
    if (service.springBoot) {
      loadTemplate(service.id).then((template) => {
        if (!template) return;
        setInstances((prev) =>
          prev.map((instance) => ({
            ...instance,
            applicationProperties: template,
          }))
        );
      });
    }

    setInitialized(true);
  }, [
    compose,
    catalog.services,
    serviceId,
    versionParam,
    countParam,
    initialized,
    loadTemplate,
  ]);

  const updateInstance = (id: string, next: ServiceConfig) => {
    setInstances((prev) => prev.map((item) => (item.id === id ? next : item)));
  };

  const removeInstance = (id: string) => {
    setInstances((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (!instances.length) {
      setSelectedId(null);
      return;
    }
    const exists = instances.some((instance) => instance.id === selectedId);
    if (!exists) {
      setSelectedId(instances[0].id);
    }
  }, [instances, selectedId]);

  const addInstance = () => {
    if (!instances.length) return;
    const base = instances[0];
    const existingNames = new Set(instances.map((instance) => instance.name));
    const baseName =
      base.serviceId || base.name.replace(/-\d+$/, "") || "service";
    let index = 1;
    let candidate = `${baseName}-${index}`;
    while (existingNames.has(candidate)) {
      index += 1;
      candidate = `${baseName}-${index}`;
    }
    const nextName = candidate;
    const nextContainerName =
      base.containerName && base.containerName === base.name
        ? nextName
        : base.containerName;
    const nextInstance: ServiceConfig = {
      ...base,
      id: crypto.randomUUID(),
      name: nextName,
      containerName: nextContainerName,
    };
    setInstances((prev) => [...prev, nextInstance]);
    setSelectedId(nextInstance.id);
  };

  const handleSave = async () => {
    if (!compose) return;
    setIsSaving(true);
    setError("");

    try {
      const nextConfig: ComposeConfig = {
        ...compose,
        services: [...compose.services, ...instances],
      };
      const response = await fetch(`/api/composes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextConfig.name, config: nextConfig }),
      });

      if (!response.ok) {
        throw new Error("Failed to save service group");
      }

      router.push(`/compose/${params.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const headerTitle = useMemo(() => {
    const service = catalog.services.find((item) => item.id === serviceId);
    return service ? service.name : "Service";
  }, [catalog.services, serviceId]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {error}
        </div>
      </main>
    );
  }

  if (!compose) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Loading service configuration...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Add service</p>
            <h1 className="text-3xl font-semibold text-slate-900">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/compose/${params.id}`)}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600"
            >
              <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">←</span>
              Back
            </button>
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save group"}
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <button
              onClick={addInstance}
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              + Add instance
            </button>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Instance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr
                      key={instance.id}
                      className={`border-t ${
                        selectedId === instance.id
                          ? "service-instance-selected bg-slate-200"
                          : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedId(instance.id)}
                          className="w-full text-left font-semibold text-slate-900"
                        >
                          {instance.name}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">
                          {instance.version || "latest"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedId(instance.id)}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                          title="Edit"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42L18.2 3.29a1.003 1.003 0 0 0-1.42 0L15 5.08l3.75 3.75 1.96-1.62z" />
                          </svg>
                        </button>
                        {instances.length > 1 ? (
                          <button
                            onClick={() => removeInstance(instance.id)}
                            className="ml-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                            title="Remove"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="currentColor"
                            >
                              <path d="M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z" />
                            </svg>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
          <div>
            {selectedId ? (
              <ServiceInstanceEditor
                key={selectedId}
                service={
                  instances.find((instance) => instance.id === selectedId) ||
                  instances[0]
                }
                catalog={catalog.services}
                networks={catalog.networks.map((network) => network.name)}
                availableServiceNames={availableServiceNames}
                onChange={(next) => updateInstance(selectedId, next)}
                onRemove={
                  instances.length > 1
                    ? () => removeInstance(selectedId)
                    : undefined
                }
                onLoadTemplate={loadTemplate}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                Select an instance to edit.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
