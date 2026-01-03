"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ServiceInstanceEditor from "@/components/ServiceInstanceEditor";
import { ComposeConfig, normalizeComposeConfig, ServiceConfig } from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

type CatalogResponse = {
  services: ServiceCatalogItem[];
  networks: string[];
};

export default function EditServiceGroupPage() {
  const params = useParams<{ id: string; groupId: string }>();
  const router = useRouter();
  const [compose, setCompose] = useState<ComposeConfig | null>(null);
  const [instances, setInstances] = useState<ServiceConfig[]>([]);
  const [catalog, setCatalog] = useState<CatalogResponse>({ services: [], networks: [] });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [templateCache, setTemplateCache] = useState<Record<string, string>>({});

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
      const normalized = normalizeComposeConfig(data.config);
      setCompose(normalized);
      const groupInstances = normalized.services.filter(
        (service) => service.groupId === params.groupId
      );
      if (groupInstances.length === 0) {
        setError("Service group not found");
        return;
      }
      setInstances(groupInstances);
    }

    loadCompose().catch(() => setError("Failed to load compose"));
  }, [params.id, params.groupId]);

  const loadTemplate = async (serviceId: string) => {
    if (templateCache[serviceId]) return templateCache[serviceId];

    const response = await fetch(`/api/templates/${serviceId}`);
    if (!response.ok) return "";
    const data = (await response.json()) as { template: string };

    setTemplateCache((prev) => ({ ...prev, [serviceId]: data.template }));
    return data.template;
  };

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
      const groupIndices = compose.services
        .map((service, index) => (service.groupId === params.groupId ? index : -1))
        .filter((index) => index >= 0);

      if (groupIndices.length === 0) {
        throw new Error("Service group not found");
      }

      const firstIndex = Math.min(...groupIndices);
      const remaining = compose.services.filter(
        (service) => service.groupId !== params.groupId
      );
      const nextServices = [
        ...remaining.slice(0, firstIndex),
        ...instances,
        ...remaining.slice(firstIndex),
      ];

      const nextConfig: ComposeConfig = {
        ...compose,
        services: nextServices,
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
          Loading service group...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Edit group</p>
            <h1 className="text-3xl font-semibold text-slate-900">Service instances</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600"
            >
              Back to home
            </button>
            <button
              onClick={() => router.push(`/compose/${params.id}`)}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600"
            >
              Cancel
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
