"use client";

import { useEffect, useMemo, useState } from "react";
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
  networks: string[];
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

  const loadTemplate = async (serviceIdToLoad: string) => {
    if (templateCache[serviceIdToLoad]) return templateCache[serviceIdToLoad];

    const response = await fetch(`/api/templates/${serviceIdToLoad}`);
    if (!response.ok) return "";
    const data = (await response.json()) as { template: string };

    setTemplateCache((prev) => ({ ...prev, [serviceIdToLoad]: data.template }));
    return data.template;
  };

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

    if (service.springBoot) {
      loadTemplate(service.id).then((template) => {
        if (!template) return;
        setInstances(
          nextInstances.map((instance) => ({
            ...instance,
            applicationProperties: template,
          }))
        );
      });
    } else {
      setInstances(nextInstances);
    }

    setInitialized(true);
  }, [compose, catalog.services, serviceId, versionParam, countParam, initialized]);

  const updateInstance = (id: string, next: ServiceConfig) => {
    setInstances((prev) => prev.map((item) => (item.id === id ? next : item)));
  };

  const removeInstance = (id: string) => {
    setInstances((prev) => prev.filter((item) => item.id !== id));
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

        <section className="space-y-6">
          {instances.map((instance) => (
            <ServiceInstanceEditor
              key={instance.id}
              service={instance}
              catalog={catalog.services}
              networks={catalog.networks}
              onChange={(next) => updateInstance(instance.id, next)}
              onRemove={instances.length > 1 ? () => removeInstance(instance.id) : undefined}
              onLoadTemplate={loadTemplate}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
