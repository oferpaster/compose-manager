"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function parseLogging(value: unknown) {
  if (!value || typeof value !== "object") return "";
  return yamlStringify(value, { indent: 2, aliasDuplicateObjects: false }).trim();
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
    startPeriod: typeof health.start_period === "string" ? health.start_period : "",
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
  const [composeText, setComposeText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedService[]>([]);
  const [extractedNetworks, setExtractedNetworks] = useState<
    { name: string; driver?: string }[]
  >([]);
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

    const networksFromCompose = new Map<string, { name: string; driver?: string }>();
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
            ? ((value as { driver?: string }).driver || "")
            : "";
        networksFromCompose.set(name, { name, driver: driver || undefined });
      });
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
      const envFile = parseStringArray(service.env_file);
      const networks = parseNetworks(service.networks);
      networks.forEach((network) => {
        if (!networksFromCompose.has(network)) {
          networksFromCompose.set(network, { name: network });
        }
      });
      const capAdd = parseStringArray(service.cap_add);
      const containerName =
        typeof service.container_name === "string" ? service.container_name : "";
      const hostname = typeof service.hostname === "string" ? service.hostname : "";
      const pid = typeof service.pid === "string" ? service.pid : "";
      const user = typeof service.user === "string" ? service.user : "";
      const privileged = Boolean(service.privileged);
      const healthcheck = parseHealthcheck(service.healthcheck);
      const command = parseCommand(service.command);
      const entrypoint = parseCommand(service.entrypoint);
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
      base.defaultRestart = typeof service.restart === "string" ? service.restart : "";
      base.defaultCommand = command;
      base.defaultEntrypoint = entrypoint;
      base.defaultHostname = hostname;
      base.defaultPid = pid;
      base.defaultUser = user;
      base.defaultPrivileged = privileged;
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
    setExtractedNetworks(Array.from(networksFromCompose.values()));
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
      const data = (await response.json()) as { services: ServiceCatalogItem[] };
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
          const mergedNetworks = mergeUnique(
            current.defaultNetworks || [],
            payload.defaultNetworks || []
          );
          const mergedPorts = mergeUnique(
            current.defaultPorts || [],
            payload.defaultPorts || []
          );
          const mergedVolumes = mergeUnique(
            current.defaultVolumes || [],
            payload.defaultVolumes || []
          );
          const mergedEnvFile = mergeUnique(
            current.defaultEnvFile || [],
            payload.defaultEnvFile || []
          );
          const mergedCapAdd = mergeUnique(
            current.defaultCapAdd || [],
            payload.defaultCapAdd || []
          );
          const mergedEnv = { ...(current.defaultEnv || {}), ...(payload.defaultEnv || {}) };
          next[index] = {
            ...current,
            versions: mergedVersions,
            defaultNetworks: mergedNetworks,
            defaultPorts: mergedPorts,
            defaultVolumes: mergedVolumes,
            defaultEnvFile: mergedEnvFile,
            defaultCapAdd: mergedCapAdd,
            defaultEnv: mergedEnv,
            defaultRestart: current.defaultRestart || payload.defaultRestart || "",
            defaultCommand: current.defaultCommand || payload.defaultCommand || "",
            defaultEntrypoint: current.defaultEntrypoint || payload.defaultEntrypoint || "",
            defaultNetworkMode:
              current.defaultNetworkMode || payload.defaultNetworkMode || "",
            defaultLogging: current.defaultLogging || payload.defaultLogging || "",
            defaultHealthcheckTest:
              current.defaultHealthcheckTest || payload.defaultHealthcheckTest || "",
            defaultHealthcheckInterval:
              current.defaultHealthcheckInterval || payload.defaultHealthcheckInterval || "",
            defaultHealthcheckTimeout:
              current.defaultHealthcheckTimeout || payload.defaultHealthcheckTimeout || "",
            defaultHealthcheckRetries:
              current.defaultHealthcheckRetries ?? payload.defaultHealthcheckRetries,
            defaultHealthcheckStartPeriod:
              current.defaultHealthcheckStartPeriod ||
              payload.defaultHealthcheckStartPeriod ||
              "",
            defaultPrivileged:
              typeof current.defaultPrivileged === "boolean"
                ? current.defaultPrivileged
                : payload.defaultPrivileged,
            defaultPid: current.defaultPid || payload.defaultPid || "",
            defaultUser: current.defaultUser || payload.defaultUser || "",
            defaultHostname: current.defaultHostname || payload.defaultHostname || "",
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

        {extractedNetworks.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Networks detected</h2>
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
                  !isNew && network.driver && existing?.driver !== network.driver;
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
              return !existing || (network.driver && existing.driver !== network.driver);
            }) ? (
              <p className="mt-3 text-sm text-emerald-700">
                New/updated networks will be applied to the default networks list
                when you save.
              </p>
            ) : null}
          </section>
        ) : null}

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

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      Default restart policy
                      <select
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={service.defaultRestart || ""}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
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
                        value={service.defaultPrivileged ? "yes" : "no"}
                        onChange={(event) =>
                          updateExtracted(index, {
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
                      Default network_mode
                      <input
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={service.defaultNetworkMode || ""}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
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
                        value={service.defaultHostname || ""}
                        onChange={(event) =>
                          updateExtracted(index, {
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
                          updateExtracted(index, {
                            ...service,
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
                        value={service.defaultPid || ""}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
                            defaultPid: event.target.value,
                          })
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
                          updateExtracted(index, {
                            ...service,
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
                        value={service.defaultEntrypoint || ""}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
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
                        value={(service.defaultPorts || []).join("\n")}
                        onChange={(event) =>
                          updateExtracted(index, {
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
                        className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={(service.defaultVolumes || []).join("\n")}
                        onChange={(event) =>
                          updateExtracted(index, {
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
                        className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={(service.defaultEnvFile || []).join("\n")}
                        onChange={(event) =>
                          updateExtracted(index, {
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
                    <label className="text-sm text-slate-600">
                      Default networks (one per line)
                      <textarea
                        className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        value={(service.defaultNetworks || []).join("\n")}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
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
                        value={(service.defaultCapAdd || []).join("\n")}
                        onChange={(event) =>
                          updateExtracted(index, {
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
                    <label className="text-sm text-slate-600 md:col-span-2">
                      Default logging (YAML)
                      <textarea
                        className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                        value={service.defaultLogging || ""}
                        onChange={(event) =>
                          updateExtracted(index, {
                            ...service,
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
                        value={Object.entries(service.defaultEnv || {})
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
                          updateExtracted(index, { ...service, defaultEnv: nextEnv });
                        }}
                        placeholder="KEY=value"
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
