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
  defaultEnvFile: [],
  defaultContainerName: "",
  defaultNetworks: [],
  defaultRestart: "",
  defaultPrivileged: false,
  defaultPid: "",
  defaultUser: "",
  defaultHostname: "",
  defaultCommand: "",
  defaultEntrypoint: "",
  defaultNetworkMode: "",
  defaultCapAdd: [],
  defaultLogging: "",
  defaultPrometheusEnabled: false,
  defaultPrometheusPort: "",
  defaultPrometheusMetricsPath: "",
  defaultPrometheusScrapeInterval: "",
  defaultHealthcheckTest: "",
  defaultHealthcheckInterval: "",
  defaultHealthcheckTimeout: "",
  defaultHealthcheckRetries: undefined,
  defaultHealthcheckStartPeriod: "",
  defaultDependsOn: [],
  springBoot: false,
  propertiesTemplateFile: "",
  applicationPropertiesTemplate: "",
});

export default function TemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [service, setService] = useState<ServiceCatalogItem>(emptyService());
  const [versionsDraft, setVersionsDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/catalog-config");
      const data = (await response.json()) as {
        services: ServiceCatalogItem[];
      };
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
    setVersionsDraft(service.versions.join("\n"));
  }, [service.id, service.versions]);

  useEffect(() => {
    async function loadNetworks() {
      const response = await fetch("/api/networks");
      const data = (await response.json()) as { networks: { name: string }[] };
      setNetworks((data.networks || []).map((network) => network.name));
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
  const dependsOnOptions = useMemo(
    () =>
      services
        .map((item) => item.id)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [services]
  );

  const parseVersionsText = (text: string) =>
    text
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!service.id.trim()) {
      setSaveMessage("Service ID is required");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    const nextService = {
      ...service,
      versions: parseVersionsText(versionsDraft),
    };

    const nextServices = [...services];
    const existingIndex = nextServices.findIndex(
      (item) => item.id === nextService.id
    );
    if (existingIndex >= 0) {
      nextServices[existingIndex] = nextService;
    } else {
      nextServices.push(nextService);
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
      setService(nextService);
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
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Template
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {params.id === "new"
                ? "New service"
                : service.name || "Edit service"}
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
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
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
                onChange={(event) =>
                  setService({ ...service, id: event.target.value })
                }
                placeholder="inventory-service"
              />
            </label>
            <label className="text-sm text-slate-600">
              Name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.name}
                onChange={(event) =>
                  setService({ ...service, name: event.target.value })
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
                onChange={(event) =>
                  setService({ ...service, image: event.target.value })
                }
                placeholder="ghcr.io/example/inventory-service"
              />
            </label>
            <label className="text-sm text-slate-600">
              Versions (one per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={versionsDraft}
                onChange={(event) => setVersionsDraft(event.target.value)}
                onBlur={() =>
                  setService({
                    ...service,
                    versions: parseVersionsText(versionsDraft),
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
                  setService({
                    ...service,
                    defaultContainerName: event.target.value,
                  })
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
            <label className="text-sm text-slate-600">
              Default restart policy
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultRestart || ""}
                onChange={(event) =>
                  setService({ ...service, defaultRestart: event.target.value })
                }
              >
                <option value="">Default</option>
                <option value="no">No</option>
                <option value="always">Always</option>
                <option value="on-failure">On failure</option>
                <option value="unless-stopped">Unless stopped</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Default privileged
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultPrivileged ? "yes" : "no"}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultPrivileged: event.target.value === "yes",
                  })
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Default hostname
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultHostname || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultHostname: event.target.value,
                  })
                }
                placeholder="optional"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default user
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultUser || ""}
                onChange={(event) =>
                  setService({ ...service, defaultUser: event.target.value })
                }
                placeholder="1000:1000"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default PID mode
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultPid || ""}
                onChange={(event) =>
                  setService({ ...service, defaultPid: event.target.value })
                }
                placeholder="host"
              />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Default command
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultCommand || ""}
                onChange={(event) =>
                  setService({ ...service, defaultCommand: event.target.value })
                }
                placeholder="./start.sh"
              />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Default entrypoint
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultEntrypoint || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultEntrypoint: event.target.value,
                  })
                }
                placeholder="/bin/app"
              />
            </label>
            {service.springBoot ? null : (
              <label className="text-sm text-slate-600 md:col-span-2">
                application.properties template path
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  value={service.propertiesTemplateFile || ""}
                  onChange={(event) =>
                    setService({
                      ...service,
                      propertiesTemplateFile: event.target.value,
                    })
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
            <label className="text-sm text-slate-600">
              Default env_file (one per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={(service.defaultEnvFile || []).join("\n")}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultEnvFile: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="./app.env"
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
                      className={`network-pill rounded-full border px-3 py-1 text-sm ${
                        selected
                          ? "network-pill-selected border-slate-900 bg-slate-900 text-white"
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Default network_mode
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultNetworkMode || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultNetworkMode: event.target.value,
                  })
                }
                placeholder="host"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default cap_add (one per line)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={(service.defaultCapAdd || []).join("\n")}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultCapAdd: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="NET_ADMIN"
              />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Depends on</h4>
              <button
                onClick={() =>
                  setService({
                    ...service,
                    defaultDependsOn: [
                      ...(service.defaultDependsOn || []),
                      { name: "", condition: "service_started" },
                    ],
                  })
                }
                className="rounded-lg border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-600"
              >
                + Add dependency
              </button>
            </div>
            {(service.defaultDependsOn || []).length === 0 ? (
              <p className="text-sm text-slate-500">No dependencies added.</p>
            ) : (
              (service.defaultDependsOn || []).map((entry, index) => (
                <div
                  key={`depends-${service.id}-${index}`}
                  className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
                >
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    value={entry.name}
                    onChange={(event) => {
                      const next = [...(service.defaultDependsOn || [])];
                      next[index] = { ...entry, name: event.target.value };
                      setService({ ...service, defaultDependsOn: next });
                    }}
                  >
                    <option value="">Select service</option>
                    {dependsOnOptions
                      .filter((name) => name !== service.id)
                      .filter(
                        (name) =>
                          name === entry.name ||
                          !(service.defaultDependsOn || []).some(
                            (item, idx) =>
                              idx !== index && item.name === name
                          )
                      )
                      .map((name) => (
                        <option key={`dep-${service.id}-${index}-${name}`} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    value={entry.condition}
                    onChange={(event) => {
                      const next = [...(service.defaultDependsOn || [])];
                      next[index] = { ...entry, condition: event.target.value };
                      setService({ ...service, defaultDependsOn: next });
                    }}
                  >
                    <option value="">No condition</option>
                    <option value="service_started">Service started</option>
                    <option value="service_healthy">Service healthy</option>
                    <option value="service_completed_successfully">
                      Service completed successfully
                    </option>
                  </select>
                  <button
                    onClick={() => {
                      const next = (service.defaultDependsOn || []).filter(
                        (_, idx) => idx !== index
                      );
                      setService({ ...service, defaultDependsOn: next });
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Prometheus metrics
                </p>
                <p className="text-xs text-slate-500">
                  Default scrape settings for this template.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={Boolean(service.defaultPrometheusEnabled)}
                  onChange={(event) =>
                    setService({
                      ...service,
                      defaultPrometheusEnabled: event.target.checked,
                    })
                  }
                />
                Enable
              </label>
            </div>
            {service.defaultPrometheusEnabled ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-600">
                  Default metrics port
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    value={service.defaultPrometheusPort || ""}
                    onChange={(event) =>
                      setService({
                        ...service,
                        defaultPrometheusPort: event.target.value,
                      })
                    }
                    placeholder="8080"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Default metrics path
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    value={service.defaultPrometheusMetricsPath || ""}
                    onChange={(event) =>
                      setService({
                        ...service,
                        defaultPrometheusMetricsPath: event.target.value,
                      })
                    }
                    placeholder={
                      service.springBoot ? "/actuator/metrics" : "/metrics"
                    }
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Default scrape interval
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    value={service.defaultPrometheusScrapeInterval || ""}
                    onChange={(event) =>
                      setService({
                        ...service,
                        defaultPrometheusScrapeInterval: event.target.value,
                      })
                    }
                    placeholder="5s"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-600">
              Default logging (YAML)
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={service.defaultLogging || ""}
                onChange={(event) =>
                  setService({ ...service, defaultLogging: event.target.value })
                }
                placeholder={`driver: local\noptions:\n  max-size: \"10m\"`}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Default healthcheck test
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultHealthcheckTest || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultHealthcheckTest: event.target.value,
                  })
                }
                placeholder="CMD-SHELL curl -f http://localhost:8080/actuator/health || exit 1"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default healthcheck interval
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultHealthcheckInterval || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultHealthcheckInterval: event.target.value,
                  })
                }
                placeholder="30s"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default healthcheck timeout
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultHealthcheckTimeout || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultHealthcheckTimeout: event.target.value,
                  })
                }
                placeholder="10s"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default healthcheck retries
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                type="number"
                value={service.defaultHealthcheckRetries ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  setService({
                    ...service,
                    defaultHealthcheckRetries:
                      raw === "" ? undefined : Number(raw),
                  });
                }}
                placeholder="3"
              />
            </label>
            <label className="text-sm text-slate-600">
              Default healthcheck start_period
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.defaultHealthcheckStartPeriod || ""}
                onChange={(event) =>
                  setService({
                    ...service,
                    defaultHealthcheckStartPeriod: event.target.value,
                  })
                }
                placeholder="30s"
              />
            </label>
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
