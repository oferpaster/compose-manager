"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

export default function TemplatesPage() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [versionsEnabled, setVersionsEnabled] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/catalog-config");
      const data = (await response.json()) as { services: ServiceCatalogItem[] };
      setServices(data.services || []);
    }

    load().catch(() => null);
  }, []);

  useEffect(() => {
    async function loadStatus() {
      const response = await fetch("/api/templates/versions/status");
      const data = (await response.json()) as { enabled: boolean };
      setVersionsEnabled(Boolean(data.enabled));
    }

    loadStatus().catch(() => null);
  }, []);

  const removeService = (index: number) => {
    const next = services.filter((_, idx) => idx !== index);
    setServices(next);
    saveTemplates(next).catch(() => null);
  };

  const saveTemplates = async (nextServices: ServiceCatalogItem[]) => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/catalog-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: nextServices }),
      });
      if (!response.ok) {
        throw new Error("Failed to save templates");
      }
      setSaveMessage("Saved");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const refreshVersions = async (serviceId: string) => {
    if (!versionsEnabled) return;
    setRefreshingId(serviceId);
    setSaveMessage("");
    try {
      const response = await fetch(`/api/templates/${serviceId}/versions/refresh`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        enabled: boolean;
        updated: boolean;
        service: ServiceCatalogItem | null;
      };
      if (!data.enabled) {
        setSaveMessage("Registry not configured");
        return;
      }
      if (data.service) {
        setServices((prev) =>
          prev.map((item) => (item.id === data.service?.id ? data.service : item))
        );
        setSaveMessage(data.updated ? "Versions updated" : "No new versions");
      }
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to refresh");
    } finally {
      setRefreshingId(null);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const refreshAllVersions = async () => {
    if (!versionsEnabled) return;
    setIsRefreshingAll(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/templates/versions/refresh", {
        method: "POST",
      });
      const data = (await response.json()) as {
        enabled: boolean;
        updated: boolean;
        services: ServiceCatalogItem[];
      };
      if (!data.enabled) {
        setSaveMessage("Registry not configured");
        return;
      }
      setServices(data.services || []);
      setSaveMessage(data.updated ? "Versions updated" : "No new versions");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to refresh");
    } finally {
      setIsRefreshingAll(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Service templates
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Configure defaults
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to settings
            </a>
            <Link
              href="/templates/bulk"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Bulk import
            </Link>
            <span
              className="inline-flex"
              title={
                versionsEnabled
                  ? "Refresh versions for all templates"
                  : "Configure registry credentials to enable version refresh"
              }
            >
              <button
                onClick={refreshAllVersions}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                disabled={!versionsEnabled || isRefreshingAll}
              >
                {isRefreshingAll ? "Refreshing..." : "Refresh all versions"}
              </button>
            </span>
            <Link
              href="/templates/new"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Add template
            </Link>
            {saveMessage ? (
              <span className="text-sm text-slate-500">{saveMessage}</span>
            ) : null}
          </div>
        </header>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No templates yet. Add one to get started.
            </div>
          ) : (
            services.map((service, index) => (
              <div
                key={`${service.id || "service"}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {service.name || "Untitled service"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {service.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/templates/${service.id || "new"}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                  >
                    Edit
                  </Link>
                  <span
                    className="inline-flex"
                    title={
                      versionsEnabled
                        ? "Refresh versions"
                        : "Configure registry credentials to enable version refresh"
                    }
                  >
                    <button
                      onClick={() => refreshVersions(service.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                      disabled={!versionsEnabled || refreshingId === service.id}
                    >
                      {refreshingId === service.id
                        ? "Refreshing..."
                        : "Refresh versions"}
                    </button>
                  </span>
                  <button
                    onClick={() => removeService(index)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                    disabled={isSaving}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
