"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
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
  springBoot: false,
  propertiesTemplateFile: "",
  applicationPropertiesTemplate: "",
});

type ExtractedService = ServiceCatalogItem & { sourceName: string };

type ComposeService = Record<string, unknown>;

type ComposeYaml = {
  services?: Record<string, ComposeService>;
  networks?: Record<string, unknown> | string[];
};

const PROMETHEUS_DEFAULTS: Record<
  string,
  { port: string; metricsPath: string }
> = {
  loki: { port: "3100", metricsPath: "/metrics" },
  keycloak: { port: "9000", metricsPath: "/metrics" },
  "kafka-exporter": { port: "9308", metricsPath: "/metrics" },
  "postgres-exporter": { port: "9187", metricsPath: "/metrics" },
  "node-exporter": { port: "9100", metricsPath: "/metrics" },
};

function splitImageTag(image: string) {
  const lastColon = image.lastIndexOf(":");
  const lastSlash = image.lastIndexOf("/");
  if (lastColon > -1 && lastColon > lastSlash) {
    return { name: image.slice(0, lastColon), tag: image.slice(lastColon + 1) };
  }
  return { name: image, tag: "latest" };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const entry = item as {
            source?: string;
            target?: string;
            read_only?: boolean;
          };
          if (entry.source && entry.target) {
            return `${entry.source}:${entry.target}${
              entry.read_only ? ":ro" : ""
            }`;
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

function normalizeNetworkName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("-") ? trimmed.slice(1).trim() : trimmed;
}

function parseNetworks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeNetworkName(String(item)))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const normalized = normalizeNetworkName(value);
    return normalized ? [normalized] : [];
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .map((key) => normalizeNetworkName(key))
      .filter(Boolean);
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
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, string>
    >((acc, [key, val]) => {
      acc[key] = String(val);
      return acc;
    }, {});
  }
  return {};
}

function parseLogging(value: unknown) {
  if (!value || typeof value !== "object") return "";
  return yamlStringify(value, {
    indent: 2,
    aliasDuplicateObjects: false,
  }).trim();
}

function parseCommand(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(" ");
  }
  if (typeof value === "string") return value;
  return "";
}

function parseHealthcheck(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      test: "",
      interval: "",
      timeout: "",
      retries: undefined as number | undefined,
      startPeriod: "",
    };
  }
  const health = value as Record<string, unknown>;
  const testValue = health.test;
  const test = Array.isArray(testValue)
    ? testValue.map((item) => String(item)).join(" ")
    : typeof testValue === "string"
    ? testValue
    : "";
  const retriesRaw = health.retries;
  const retries =
    typeof retriesRaw === "number"
      ? retriesRaw
      : typeof retriesRaw === "string" && retriesRaw.trim()
      ? Number(retriesRaw)
      : undefined;

  return {
    test,
    interval: typeof health.interval === "string" ? health.interval : "",
    timeout: typeof health.timeout === "string" ? health.timeout : "",
    retries: Number.isFinite(retries as number) ? retries : undefined,
    startPeriod:
      typeof health.start_period === "string" ? health.start_period : "",
  };
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
  const router = useRouter();
  const [composeText, setComposeText] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedService[]>([]);
  const [extractedNetworks, setExtractedNetworks] = useState<
    { name: string; driver?: string }[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [existingNetworks, setExistingNetworks] = useState<
    { name: string; driver?: string }[]
  >([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setSaveMessage("");
  }, [composeText]);

  useEffect(() => {
    if (extracted.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    if (selectedIndex < 0 || selectedIndex >= extracted.length) {
      setSelectedIndex(0);
    }
  }, [extracted, selectedIndex]);

  useEffect(() => {
    async function loadNetworks() {
      const response = await fetch("/api/networks");
      const data = (await response.json()) as {
        networks: { name: string; driver?: string }[];
      };
      setExistingNetworks(data.networks || []);
    }

    loadNetworks().catch(() => null);
  }, []);

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

    const networksFromCompose = new Map<
      string,
      { name: string; driver?: string }
    >();
    if (Array.isArray(parsed.networks)) {
      parsed.networks.forEach((network) => {
        if (typeof network === "string") {
          networksFromCompose.set(network, { name: network });
        }
      });
    } else if (parsed.networks && typeof parsed.networks === "object") {
      Object.entries(parsed.networks).forEach(([name, value]) => {
        const driver =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as { driver?: string }).driver || ""
            : "";
        networksFromCompose.set(name, { name, driver: driver || undefined });
      });
    }

    const map = new Map<string, ExtractedService>();

    Object.entries(parsed.services).forEach(([serviceName, service]) => {
      const image = typeof service.image === "string" ? service.image : "";
      if (!image) return;
      const parsedImage = splitImageTag(image);
      const imageName = parsedImage.name;
      const version = parsedImage.tag || "latest";

      const ports = parseStringArray(service.ports);
      const volumes = parseStringArray(service.volumes);
      const env = parseEnvironment(service.environment);
      const envFile = parseStringArray(service.env_file);
      const networks = parseNetworks(service.networks);
      networks.forEach((network) => {
        if (!networksFromCompose.has(network)) {
          networksFromCompose.set(network, { name: network });
        }
      });
      const capAdd = parseStringArray(service.cap_add);
      const containerName =
        typeof service.container_name === "string"
          ? service.container_name
          : "";
      const hostname =
        typeof service.hostname === "string" ? service.hostname : "";
      const pid = typeof service.pid === "string" ? service.pid : "";
      const user = typeof service.user === "string" ? service.user : "";
      const privileged = Boolean(service.privileged);
      const healthcheck = parseHealthcheck(service.healthcheck);
      const command = parseCommand(service.command);
      const entrypoint = parseCommand(service.entrypoint);
      const springBoot =
        volumes.some((vol) => vol.includes("application.properties")) ||
        hasApplicationPropertiesVolume(service.volumes);
      const normalizedName = serviceName.replace(/-\d+$/, "").toLowerCase();
      const normalizedContainer = containerName
        .replace(/-\d+$/, "")
        .toLowerCase();
      const prometheusPreset =
        PROMETHEUS_DEFAULTS[normalizedName] ||
        PROMETHEUS_DEFAULTS[normalizedContainer];

      const existing = map.get(imageName);
      if (existing) {
        existing.versions = mergeUnique(existing.versions, [version]);
        existing.defaultPorts = mergeUnique(existing.defaultPorts || [], ports);
        existing.defaultVolumes = mergeUnique(
          existing.defaultVolumes || [],
          volumes
        );
        existing.defaultNetworks = mergeUnique(
          existing.defaultNetworks || [],
          networks
        );
        existing.defaultEnv = { ...existing.defaultEnv, ...env };
        if (springBoot && existing.defaultPrometheusEnabled !== true) {
          existing.defaultPrometheusEnabled = true;
          existing.defaultPrometheusMetricsPath =
            existing.defaultPrometheusMetricsPath || "/actuator/metrics";
          existing.defaultPrometheusScrapeInterval =
            existing.defaultPrometheusScrapeInterval || "5s";
        }
        if (prometheusPreset) {
          existing.defaultPrometheusEnabled = true;
          existing.defaultPrometheusPort =
            existing.defaultPrometheusPort || prometheusPreset.port;
          existing.defaultPrometheusMetricsPath =
            existing.defaultPrometheusMetricsPath ||
            prometheusPreset.metricsPath;
          existing.defaultPrometheusScrapeInterval =
            existing.defaultPrometheusScrapeInterval || "5s";
        }
        return;
      }

      const base = emptyService();
      base.image = imageName;
      base.versions = [version];
      base.defaultPorts = ports;
      base.defaultVolumes = volumes;
      base.defaultEnvFile = envFile;
      base.defaultNetworks = networks;
      base.defaultEnv = env;
      base.defaultNetworkMode =
        typeof service.network_mode === "string" ? service.network_mode : "";
      base.defaultCapAdd = capAdd;
      base.defaultLogging = parseLogging(service.logging);
      base.defaultHealthcheckTest = healthcheck.test;
      base.defaultHealthcheckInterval = healthcheck.interval;
      base.defaultHealthcheckTimeout = healthcheck.timeout;
      base.defaultHealthcheckRetries = healthcheck.retries;
      base.defaultHealthcheckStartPeriod = healthcheck.startPeriod;
      base.defaultRestart =
        typeof service.restart === "string" ? service.restart : "";
      base.defaultCommand = command;
      base.defaultEntrypoint = entrypoint;
      base.defaultHostname = hostname;
      base.defaultPid = pid;
      base.defaultUser = user;
      base.defaultPrivileged = privileged;
      base.defaultPrometheusEnabled = false;
      base.defaultPrometheusPort = "";
      base.defaultPrometheusMetricsPath = "";
      base.defaultPrometheusScrapeInterval = "";
      base.defaultContainerName = containerName;
      base.springBoot = springBoot;
      if (springBoot) {
        base.defaultPrometheusEnabled = true;
        base.defaultPrometheusMetricsPath = "/actuator/metrics";
        base.defaultPrometheusScrapeInterval = "5s";
      }
      if (prometheusPreset) {
        base.defaultPrometheusEnabled = true;
        base.defaultPrometheusPort = prometheusPreset.port;
        base.defaultPrometheusMetricsPath = prometheusPreset.metricsPath;
        base.defaultPrometheusScrapeInterval = "5s";
      }

      const baseServiceName = serviceName.replace(/-\d+$/, "");
      map.set(imageName, {
        ...base,
        sourceName: baseServiceName,
      });
    });

    const next = Array.from(map.values()).map((item) => ({
      ...item,
      id: item.id || item.image.split("/").pop() || "",
      name: item.name || item.sourceName,
    }));

    setExtracted(next);
    setExtractedNetworks(Array.from(networksFromCompose.values()));
  };

  const updateExtracted = (index: number, next: ExtractedService) => {
    setExtracted((prev) =>
      prev.map((item, idx) => (idx === index ? next : item))
    );
  };

  const removeExtracted = (index: number) => {
    setExtracted((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      if (extractedNetworks.length > 0) {
        const networksResponse = await fetch("/api/networks");
        const networksData = (await networksResponse.json()) as {
          networks: { name: string; driver?: string }[];
        };
        const currentNetworks = networksData.networks || [];
        const currentMap = new Map(
          currentNetworks.map((network) => [network.name, { ...network }])
        );
        let hasChanges = false;

        extractedNetworks.forEach((network) => {
          const existing = currentMap.get(network.name);
          if (!existing) {
            currentMap.set(network.name, { ...network });
            hasChanges = true;
            return;
          }
          if (network.driver && existing.driver !== network.driver) {
            existing.driver = network.driver;
            currentMap.set(network.name, existing);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          const nextNetworks = Array.from(currentMap.values());
          await fetch("/api/networks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ networks: nextNetworks }),
          });
          setExistingNetworks(nextNetworks);
        }
      }

      const response = await fetch("/api/catalog-config");
      const data = (await response.json()) as {
        services: ServiceCatalogItem[];
      };
      const existing = data.services || [];
      const next = [...existing];

      extracted.forEach((service) => {
        const { sourceName: _sourceName, ...payload } = service;
        const index = next.findIndex((item) => item.image === payload.image);
        if (index >= 0) {
          const current = next[index];
          const mergedVersions = mergeUnique(
            current.versions || [],
            payload.versions || []
          );
          next[index] = {
            ...current,
            id: payload.id || current.id,
            name: payload.name || current.name,
            description: payload.description || current.description,
            versions: mergedVersions,
            defaultNetworks: payload.defaultNetworks || [],
            defaultPorts: payload.defaultPorts || [],
            defaultVolumes: payload.defaultVolumes || [],
            defaultEnvFile: payload.defaultEnvFile || [],
            defaultCapAdd: payload.defaultCapAdd || [],
            defaultEnv: payload.defaultEnv || {},
            defaultRestart: payload.defaultRestart || "",
            defaultCommand: payload.defaultCommand || "",
            defaultEntrypoint: payload.defaultEntrypoint || "",
            defaultNetworkMode: payload.defaultNetworkMode || "",
            defaultLogging: payload.defaultLogging || "",
            defaultHealthcheckTest: payload.defaultHealthcheckTest || "",
            defaultHealthcheckInterval:
              payload.defaultHealthcheckInterval || "",
            defaultHealthcheckTimeout: payload.defaultHealthcheckTimeout || "",
            defaultHealthcheckRetries: payload.defaultHealthcheckRetries,
            defaultHealthcheckStartPeriod:
              payload.defaultHealthcheckStartPeriod || "",
            defaultPrivileged:
              typeof payload.defaultPrivileged === "boolean"
                ? payload.defaultPrivileged
                : current.defaultPrivileged,
            defaultPid: payload.defaultPid || "",
            defaultUser: payload.defaultUser || "",
            defaultHostname: payload.defaultHostname || "",
            defaultContainerName: payload.defaultContainerName || "",
            springBoot:
              typeof payload.springBoot === "boolean"
                ? payload.springBoot
                : current.springBoot,
            defaultPrometheusEnabled: current.defaultPrometheusEnabled,
            defaultPrometheusPort: current.defaultPrometheusPort || "",
            defaultPrometheusMetricsPath:
              current.defaultPrometheusMetricsPath || "",
            defaultPrometheusScrapeInterval:
              current.defaultPrometheusScrapeInterval || "",
          };
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
      router.push("/templates");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const normalizedSearch = serviceSearch.trim().toLowerCase();
  const filteredServices = extracted.filter((service) => {
    if (!normalizedSearch) return true;
    const label = (service.name || service.id || service.image || "").toLowerCase();
    return label.includes(normalizedSearch);
  });
  const sortedServices = [...filteredServices].sort((a, b) => {
    const aLabel = (a.name || a.id || a.image || "").toLowerCase();
    const bLabel = (b.name || b.id || b.image || "").toLowerCase();
    return aLabel.localeCompare(bLabel);
  });
  const selectedService =
    selectedIndex >= 0 ? extracted[selectedIndex] : null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-7xl space-y-6">
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
            <label
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm text-slate-600 transition ${
                isDragging
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
            >
              Upload or drop compose file
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

        {extractedNetworks.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Networks detected
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {extractedNetworks.map((network) => {
                const existing = existingNetworks.find(
                  (item) => item.name === network.name
                );
                const isNew = !existing;
                const driverLabel = network.driver
                  ? `driver: ${network.driver}`
                  : "driver: default";
                const driverChanged =
                  !isNew &&
                  network.driver &&
                  existing?.driver !== network.driver;
                return (
                  <span
                    key={network.name}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      isNew || driverChanged
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {network.name} · {driverLabel}
                    {isNew ? " (new)" : driverChanged ? " (updated)" : ""}
                  </span>
                );
              })}
            </div>
            {extractedNetworks.some((network) => {
              const existing = existingNetworks.find(
                (item) => item.name === network.name
              );
              return (
                !existing ||
                (network.driver && existing.driver !== network.driver)
              );
            }) ? (
              <p className="mt-3 text-sm text-emerald-700">
                New/updated networks will be applied to the default networks
                list when you save.
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Extracted services
            </h2>
          </div>

          {extracted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No services extracted yet.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <aside className="space-y-4">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Search by name"
                />
                <div className="pt-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedServices.map((service) => {
                        const index = extracted.indexOf(service);
                        return (
                          <tr
                            key={`${service.image}-${index}`}
                            className={`border-t ${
                              selectedIndex === index
                                ? "bg-slate-100"
                                : "bg-white"
                            }`}
                          >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedIndex(index)}
                              className="w-full text-left font-semibold text-slate-900"
                            >
                              {service.name || service.id || service.image}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedIndex(index)}
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
                              <button
                                onClick={() => removeExtracted(index)}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                                title="Remove"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="currentColor"
                                >
                                  <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </aside>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {selectedService ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Image</p>
                        <p className="text-base font-semibold text-slate-900">
                          {selectedService.image}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        Versions: {selectedService.versions.join(", ")}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        Service Name
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.id}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
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
                          value={selectedService.name}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
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
                          value={selectedService.description}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              description: event.target.value,
                            })
                          }
                          placeholder="Auto extracted from compose"
                        />
                      </label>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        Default restart policy
                        <select
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.defaultRestart || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultRestart: event.target.value,
                            })
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
                          value={
                            selectedService.defaultPrivileged ? "yes" : "no"
                          }
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultPrivileged: event.target.value === "yes",
                            })
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                      <label className="text-sm text-slate-600">
                        Default network_mode
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.defaultNetworkMode || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultNetworkMode: event.target.value,
                            })
                          }
                          placeholder="host"
                        />
                      </label>
                      <label className="text-sm text-slate-600">
                        Default hostname
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.defaultHostname || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
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
                          value={selectedService.defaultUser || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultUser: event.target.value,
                            })
                          }
                          placeholder="1000:1000"
                        />
                      </label>
                      <label className="text-sm text-slate-600">
                        Default PID mode
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.defaultPid || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultPid: event.target.value,
                            })
                          }
                          placeholder="host"
                        />
                      </label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              Spring Boot
                            </p>
                            <p className="text-xs text-slate-500">
                              Enable application.properties template.
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedService.springBoot)}
                              onChange={(event) =>
                                updateExtracted(selectedIndex, {
                                  ...selectedService,
                                  springBoot: event.target.checked,
                                })
                              }
                            />
                            Enable
                          </label>
                        </div>
                        {selectedService.springBoot ? (
                          <label className="mt-3 block text-sm text-slate-600">
                            application.properties template
                            <textarea
                              className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                              value={selectedService.applicationPropertiesTemplate || ""}
                              onChange={(event) =>
                                updateExtracted(selectedIndex, {
                                  ...selectedService,
                                  applicationPropertiesTemplate: event.target.value,
                                })
                              }
                              placeholder="spring.application.name=service"
                            />
                          </label>
                        ) : null}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              Prometheus metrics
                            </p>
                            <p className="text-xs text-slate-500">
                              Defaults for scraped metrics.
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                selectedService.defaultPrometheusEnabled
                              )}
                              onChange={(event) =>
                                updateExtracted(selectedIndex, {
                                  ...selectedService,
                                  defaultPrometheusEnabled:
                                    event.target.checked,
                                })
                              }
                            />
                            Enable
                          </label>
                        </div>
                        {selectedService.defaultPrometheusEnabled ? (
                          <div className="mt-3 grid gap-4 md:grid-cols-2">
                            <label className="text-sm text-slate-600">
                              Default metrics port
                              <input
                                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                                value={
                                  selectedService.defaultPrometheusPort || ""
                                }
                                onChange={(event) =>
                                  updateExtracted(selectedIndex, {
                                    ...selectedService,
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
                                value={
                                  selectedService.defaultPrometheusMetricsPath ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateExtracted(selectedIndex, {
                                    ...selectedService,
                                    defaultPrometheusMetricsPath:
                                      event.target.value,
                                  })
                                }
                                placeholder="/metrics"
                              />
                            </label>
                            <label className="text-sm text-slate-600">
                              Default scrape interval
                              <input
                                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                                value={
                                  selectedService.defaultPrometheusScrapeInterval ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateExtracted(selectedIndex, {
                                    ...selectedService,
                                    defaultPrometheusScrapeInterval:
                                      event.target.value,
                                  })
                                }
                                placeholder="5s"
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <label className="text-sm text-slate-600 md:col-span-2">
                        Default command
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.defaultCommand || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultCommand: event.target.value,
                            })
                          }
                          placeholder="./start.sh"
                        />
                      </label>
                      <label className="text-sm text-slate-600 md:col-span-2">
                        Default entrypoint
                        <input
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={selectedService.defaultEntrypoint || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultEntrypoint: event.target.value,
                            })
                          }
                          placeholder="/bin/app"
                        />
                      </label>
                      <label className="text-sm text-slate-600">
                        Default ports (one per line)
                        <textarea
                          className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={(selectedService.defaultPorts || []).join(
                            "\n"
                          )}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
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
                          className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={(selectedService.defaultVolumes || []).join(
                            "\n"
                          )}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
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
                          className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={(selectedService.defaultEnvFile || []).join(
                            "\n"
                          )}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultEnvFile: event.target.value
                                .split("\n")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="./app.env"
                        />
                      </label>
                      <label className="text-sm text-slate-600">
                        Default networks (one per line)
                        <textarea
                          className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={(selectedService.defaultNetworks || []).join(
                            "\n"
                          )}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultNetworks: event.target.value
                                .split("\n")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="backend"
                        />
                      </label>
                      <label className="text-sm text-slate-600">
                        Default cap_add (one per line)
                        <textarea
                          className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={(selectedService.defaultCapAdd || []).join(
                            "\n"
                          )}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultCapAdd: event.target.value
                                .split("\n")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="NET_ADMIN"
                        />
                      </label>
                      <label className="text-sm text-slate-600 md:col-span-2">
                        Default logging (YAML)
                        <textarea
                          className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                          value={selectedService.defaultLogging || ""}
                          onChange={(event) =>
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultLogging: event.target.value,
                            })
                          }
                          placeholder={`driver: local\noptions:\n  max-size: \"10m\"`}
                        />
                      </label>
                      <label className="text-sm text-slate-600 md:col-span-2">
                        Default environment (KEY=value per line)
                        <textarea
                          className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                          value={Object.entries(
                            selectedService.defaultEnv || {}
                          )
                            .map(([key, value]) => `${key}=${value}`)
                            .join("\n")}
                          onChange={(event) => {
                            const nextEnv = event.target.value
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .reduce<Record<string, string>>((acc, line) => {
                                const [key, ...rest] = line.split("=");
                                acc[key] = rest.join("=");
                                return acc;
                              }, {});
                            updateExtracted(selectedIndex, {
                              ...selectedService,
                              defaultEnv: nextEnv,
                            });
                          }}
                          placeholder="KEY=value"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a service to edit its defaults.
                  </p>
                )}
              </div>
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
