"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ComposeConfig,
  generateEnvFile,
  generateComposeYaml,
  generatePrometheusYaml,
  KeyValue,
  normalizeComposeConfig,
  parseComposeYamlToConfig,
  parseEnvText,
  ServiceConfig,
} from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

const emptyKeyValue = (): KeyValue => ({ key: "", value: "" });

type CatalogResponse = {
  services: ServiceCatalogItem[];
  networks: { name: string; driver?: string }[];
};
type ScriptSummary = {
  id: string;
  name: string;
  file_name: string;
  description: string;
  usage: string;
};

type ServiceGroup = {
  groupId: string;
  serviceId: string;
  instances: ServiceConfig[];
};

type Props = {
  initialConfig: ComposeConfig;
  onSave: (config: ComposeConfig) => Promise<void>;
};

function buildGroups(services: ServiceConfig[]): ServiceGroup[] {
  const groups: ServiceGroup[] = [];
  const groupMap = new Map<string, ServiceGroup>();

  services.forEach((service) => {
    const existing = groupMap.get(service.groupId);
    if (existing) {
      existing.instances.push(service);
      return;
    }

    const group: ServiceGroup = {
      groupId: service.groupId,
      serviceId: service.serviceId,
      instances: [service],
    };

    groupMap.set(service.groupId, group);
    groups.push(group);
  });

  return groups;
}

export default function ComposeEditor({ initialConfig, onSave }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<ComposeConfig>(initialConfig);
  const [catalog, setCatalog] = useState<CatalogResponse>({
    services: [],
    networks: [],
  });
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [selectedService, setSelectedService] =
    useState<ServiceCatalogItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [serviceCount, setServiceCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);
  const composeScrollRef = useRef<HTMLPreElement | null>(null);
  const [isEnvEditorOpen, setIsEnvEditorOpen] = useState(false);
  const [envDraft, setEnvDraft] = useState("");
  const [isYamlEditorOpen, setIsYamlEditorOpen] = useState(false);
  const [yamlDraft, setYamlDraft] = useState("");
  const [yamlError, setYamlError] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [prometheusDraft, setPrometheusDraft] = useState("");
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);

  useEffect(() => {
    setConfig(normalizeComposeConfig(initialConfig));
  }, [initialConfig]);

  useEffect(() => {
    async function loadCatalog() {
      const response = await fetch("/api/catalog");
      const data = (await response.json()) as CatalogResponse;
      setCatalog(data);
    }

    loadCatalog().catch(() => null);
  }, []);

  useEffect(() => {
    async function loadScripts() {
      const response = await fetch("/api/scripts");
      const data = (await response.json()) as { scripts: ScriptSummary[] };
      setScripts(data.scripts || []);
    }

    loadScripts().catch(() => null);
  }, []);

  const groupedServices = useMemo<ServiceGroup[]>(
    () => buildGroups(config.services),
    [config.services]
  );
  const filteredGroups = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return groupedServices;
    return groupedServices.filter((group) => {
      const info = catalog.services.find((item) => item.id === group.serviceId);
      const name = info?.name || group.serviceId;
      const instanceNames = group.instances
        .map((instance) => instance.name)
        .join(" ");
      return `${name} ${group.serviceId} ${instanceNames}`
        .toLowerCase()
        .includes(query);
    });
  }, [catalog.services, groupedServices, serviceSearch]);

  const composeYaml = useMemo(
    () => generateComposeYaml(config, catalog.services, catalog.networks),
    [config, catalog.services, catalog.networks]
  );
  const prometheusYaml = useMemo(() => {
    if (config.prometheus?.configYaml?.trim()) {
      return config.prometheus.configYaml;
    }
    return generatePrometheusYaml(config, catalog.services);
  }, [config, catalog.services]);
  const envFile = useMemo(() => generateEnvFile(config), [config]);

  const validation = useMemo(() => {
    const definedGlobal = new Set<string>();
    const definedService = new Set<string>();

    config.globalEnv.forEach((entry) => {
      if (entry.key.trim()) definedGlobal.add(entry.key.trim());
    });
    config.services.forEach((service) => {
      service.env.forEach((entry) => {
        if (entry.key.trim()) definedService.add(entry.key.trim());
      });
    });

    const referenced = new Set<string>();
    const pattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::[^}]*)?\}/g;
    const extractFromText = (text: string) => {
      let match: RegExpExecArray | null = null;
      while ((match = pattern.exec(text)) !== null) {
        referenced.add(match[1]);
      }
    };

    extractFromText(composeYaml);
    extractFromText(envFile);
    config.services.forEach((service) => {
      if (service.applicationProperties) {
        extractFromText(service.applicationProperties);
      }
    });

    const definedAll = new Set<string>([...definedGlobal, ...definedService]);
    const missing = Array.from(referenced).filter(
      (key) => !definedAll.has(key)
    );
    const unused = Array.from(definedGlobal).filter(
      (key) => !referenced.has(key)
    );
    missing.sort();
    unused.sort();

    return { missing, unused };
  }, [composeYaml, config, envFile]);

  const highlightLines = useMemo(() => {
    if (!hoveredGroupId) return new Set<number>();
    const group = groupedServices.find(
      (item) => item.groupId === hoveredGroupId
    );
    if (!group) return new Set<number>();

    const targetNames = new Set(
      group.instances.map((instance) => instance.name)
    );
    const lines = composeYaml.split("\n");
    const highlighted = new Set<number>();

    const getIndent = (line: string) => line.match(/^ */)?.[0].length ?? 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed.endsWith(":")) return;
      const name = trimmed.slice(0, -1);
      if (!targetNames.has(name)) return;

      const startIndent = getIndent(line);
      highlighted.add(index);
      for (let next = index + 1; next < lines.length; next += 1) {
        const nextLine = lines[next];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed.length > 0 && getIndent(nextLine) <= startIndent) break;
        highlighted.add(next);
      }
    });

    return highlighted;
  }, [composeYaml, groupedServices, hoveredGroupId]);

  useEffect(() => {
    if (!hoveredGroupId) {
      setScrollTarget(null);
      return;
    }

    const group = groupedServices.find(
      (item) => item.groupId === hoveredGroupId
    );
    if (!group) return;
    const targetNames = new Set(
      group.instances.map((instance) => instance.name)
    );
    const lines = composeYaml.split("\n");
    const targetIndex = lines.findIndex((line) => {
      const trimmed = line.trim();
      return trimmed.endsWith(":") && targetNames.has(trimmed.slice(0, -1));
    });
    if (targetIndex >= 0) {
      setScrollTarget(targetIndex);
    }
  }, [composeYaml, groupedServices, hoveredGroupId]);

  useEffect(() => {
    if (scrollTarget === null) return;
    const container = composeScrollRef.current;
    if (!container) return;
    const target = container.querySelector(
      `[data-line-index="${scrollTarget}"]`
    ) as HTMLElement | null;
    if (!target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top;
    container.scrollTo({
      top: container.scrollTop + offset - container.clientHeight / 2,
      behavior: "smooth",
    });
  }, [scrollTarget]);

  const addGlobalEnv = () => {
    setConfig((prev) => ({
      ...prev,
      globalEnv: [...prev.globalEnv, emptyKeyValue()],
    }));
  };

  const updateGlobalEnv = (index: number, next: KeyValue) => {
    setConfig((prev) => ({
      ...prev,
      globalEnv: prev.globalEnv.map((entry, idx) =>
        idx === index ? next : entry
      ),
    }));
  };

  const removeGlobalEnv = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      globalEnv: prev.globalEnv.filter((_, idx) => idx !== index),
    }));
  };

  const updateNginxField = (
    field: "cert" | "key" | "ca" | "config",
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      nginx: {
        cert: prev.nginx?.cert || "",
        key: prev.nginx?.key || "",
        ca: prev.nginx?.ca || "",
        config: prev.nginx?.config || "",
        [field]: value,
      },
    }));
  };

  const updatePrometheus = (
    field: "enabled" | "configYaml",
    value: boolean | string
  ) => {
    setConfig((prev) => ({
      ...prev,
      prometheus: {
        enabled: prev.prometheus?.enabled || false,
        configYaml: prev.prometheus?.configYaml || "",
        [field]: value,
      },
    }));
  };

  const handleNginxFile = async (
    field: "cert" | "key" | "ca" | "config",
    file: File
  ) => {
    const content = await file.text();
    updateNginxField(field, content);
  };

  const toggleNetwork = (network: string) => {
    setConfig((prev) => {
      const exists = prev.networks.includes(network);
      return {
        ...prev,
        networks: exists
          ? prev.networks.filter((item) => item !== network)
          : [...prev.networks, network],
      };
    });
  };

  const updateLoggingTemplate = (value: string) => {
    setConfig((prev) => ({ ...prev, loggingTemplate: value }));
  };

  const toggleScript = (scriptId: string) => {
    setConfig((prev) => {
      const current = prev.scriptIds || [];
      const exists = current.includes(scriptId);
      return {
        ...prev,
        scriptIds: exists
          ? current.filter((item) => item !== scriptId)
          : [...current, scriptId],
      };
    });
  };

  const removeGroup = (groupId: string) => {
    setConfig((prev) => ({
      ...prev,
      services: prev.services.filter((service) => service.groupId !== groupId),
    }));
  };

  const moveGroup = (groupId: string, direction: "up" | "down") => {
    setConfig((prev) => {
      const groups = buildGroups(prev.services);
      const groupOrder = groups.map((group) => group.groupId);
      const index = groupOrder.indexOf(groupId);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= groupOrder.length) return prev;

      const nextOrder = [...groupOrder];
      const [moved] = nextOrder.splice(index, 1);
      nextOrder.splice(targetIndex, 0, moved);

      const groupedMap = new Map<string, ServiceConfig[]>();
      groups.forEach((group) => {
        groupedMap.set(group.groupId, group.instances);
      });

      const nextServices = nextOrder.flatMap((id) => groupedMap.get(id) || []);
      return { ...prev, services: nextServices };
    });
  };

  const handleAddService = async () => {
    if (!selectedService) return;
    const version = selectedVersion || selectedService.versions[0] || "latest";
    const count = Math.max(1, serviceCount || 1);

    try {
      await onSave(config);
      setSaveMessage("Saved");
      setSaveStatus("success");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save");
      setSaveStatus("error");
      return;
    }

    router.push(
      `/compose/${config.id}/add-service?serviceId=${selectedService.id}&version=${version}&count=${count}`
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      await onSave(config);
      setSaveMessage("Saved");
      setSaveStatus("success");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const openEnvEditor = () => {
    setEnvDraft(generateEnvFile(config));
    setIsEnvEditorOpen(true);
  };

  const applyEnvEditor = () => {
    setConfig((prev) => ({ ...prev, globalEnv: parseEnvText(envDraft) }));
    setIsEnvEditorOpen(false);
  };

  const openYamlEditor = () => {
    setYamlDraft(composeYaml);
    setYamlError("");
    setIsYamlEditorOpen(true);
  };

  const applyYamlEditor = () => {
    const result = parseComposeYamlToConfig(
      yamlDraft,
      config,
      catalog.services
    );
    if (result.error) {
      setYamlError(result.error);
      return;
    }
    setConfig(result.config);
    setIsYamlEditorOpen(false);
  };

  return (
    <div className="grid h-[calc(100vh-6rem)] gap-6 overflow-hidden lg:grid-cols-[1.3fr_1fr_0.9fr]">
      <section className="h-full overflow-y-auto pr-1 space-y-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-500">
                Compose
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">
                Edit compose
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={config.projectId ? `/projects/${config.projectId}` : "/"}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
              >
                ← Back
              </a>
              <button
                onClick={() => setIsValidationOpen(true)}
                className="cursor-pointer rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700"
              >
                Validate
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsEditMenuOpen((prev) => !prev)}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
                >
                  Edit inline
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="ml-2 inline-block h-3 w-3"
                    fill="currentColor"
                  >
                    <path d="M5.5 7.5l4.5 4.5 4.5-4.5-1.5-1.5-3 3-3-3-1.5 1.5z" />
                  </svg>
                </button>
                {isEditMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                      onClick={() => {
                        setIsEditMenuOpen(false);
                        openEnvEditor();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
                    >
                      Edit .env
                    </button>
                    <button
                      onClick={() => {
                        setIsEditMenuOpen(false);
                        openYamlEditor();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
                    >
                      Edit YAML
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                onClick={handleSave}
                className="cursor-pointer rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow"
                disabled={isSaving}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="mr-2 inline-block h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M5 3h12l4 4v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 2v6h10V5H7zm0 10v6h10v-6H7z" />
                </svg>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {(validation.missing.length > 0 || validation.unused.length > 0) && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {validation.missing.length > 0 ? (
                <p>
                  Missing envs: {validation.missing.slice(0, 5).join(", ")}
                  {validation.missing.length > 5 ? "…" : ""}
                </p>
              ) : null}
              {validation.unused.length > 0 ? (
                <p className={validation.missing.length > 0 ? "mt-1" : ""}>
                  Unused envs: {validation.unused.slice(0, 5).join(", ")}
                  {validation.unused.length > 5 ? "…" : ""}
                </p>
              ) : null}
            </section>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Compose name
            <input
              value={config.name}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="e.g. core-services"
            />
          </label>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Networks</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {catalog.networks.map((network) => (
              <button
                key={network.name}
                onClick={() => toggleNetwork(network.name)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  config.networks.includes(network.name)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {network.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Global environment
          </h2>
          <div className="space-y-3">
            {config.globalEnv.map((entry, index) => (
              <div
                key={`env-${index}`}
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  value={entry.key}
                  onChange={(event) =>
                    updateGlobalEnv(index, {
                      ...entry,
                      key: event.target.value,
                    })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  placeholder="KEY"
                />
                <input
                  value={entry.value}
                  onChange={(event) =>
                    updateGlobalEnv(index, {
                      ...entry,
                      value: event.target.value,
                    })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  placeholder="value"
                />
                <button
                  onClick={() => removeGlobalEnv(index)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addGlobalEnv}
            className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"
          >
            + Add global env
          </button>
        </section>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Ports Overview
            </h2>
            <span className="text-sm text-slate-500">Toggle</span>
          </summary>
          <div className="mt-4 space-y-4">
            {config.services.filter((service) => service.ports.length > 0)
              .length === 0 ? (
              <p className="text-sm text-slate-500">
                No port mappings defined.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Ports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.services
                      .filter((service) => service.ports.length > 0)
                      .map((service) => (
                        <tr key={`ports-${service.id}`} className="border-t">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {service.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {service.ports.join(", ")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Volumes Overview
            </h2>
            <span className="text-sm text-slate-500">Toggle</span>
          </summary>
          <div className="mt-4 space-y-4">
            {config.services.filter((service) => service.volumes.length > 0)
              .length === 0 ? (
              <p className="text-sm text-slate-500">No volumes mounted.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Volumes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.services
                      .filter((service) => service.volumes.length > 0)
                      .map((service) => (
                        <tr key={`volumes-${service.id}`} className="border-t">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {service.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {service.volumes.join(", ")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Logging</h2>
              <span className="text-xs uppercase tracking-widest text-slate-400">
                x-logging
              </span>
            </div>
            <span className="text-sm text-slate-500">Toggle</span>
          </summary>
          <div className="mt-4">
            <label className="text-sm text-slate-600">
              Default logging template (YAML)
              <textarea
                className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={config.loggingTemplate || ""}
                onChange={(event) => updateLoggingTemplate(event.target.value)}
                placeholder={`driver: local\\noptions:\\n  max-size: \"10m\"\\n  max-file: \"5\"`}
              />
            </label>
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Nginx config
              </h2>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                optional
              </p>
            </div>
            <span className="text-sm text-slate-500">Toggle</span>
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Certificate (.crt)</p>
                <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleNginxFile("cert", file);
                    }}
                  />
                </label>
              </div>
              <textarea
                className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={config.nginx?.cert || ""}
                onChange={(event) =>
                  updateNginxField("cert", event.target.value)
                }
                placeholder="-----BEGIN CERTIFICATE-----"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Private key (.key)</p>
                <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleNginxFile("key", file);
                    }}
                  />
                </label>
              </div>
              <textarea
                className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={config.nginx?.key || ""}
                onChange={(event) =>
                  updateNginxField("key", event.target.value)
                }
                placeholder="-----BEGIN PRIVATE KEY-----"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">CA bundle (.ca)</p>
                <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleNginxFile("ca", file);
                    }}
                  />
                </label>
              </div>
              <textarea
                className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={config.nginx?.ca || ""}
                onChange={(event) => updateNginxField("ca", event.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">nginx.conf</p>
                <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleNginxFile("config", file);
                    }}
                  />
                </label>
              </div>
              <textarea
                className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={config.nginx?.config || ""}
                onChange={(event) =>
                  updateNginxField("config", event.target.value)
                }
                placeholder="server { ... }"
              />
            </div>
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Prometheus
              </h2>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                optional
              </p>
            </div>
            <span className="text-sm text-slate-500">Toggle</span>
          </summary>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(config.prometheus?.enabled)}
                onChange={(event) =>
                  updatePrometheus("enabled", event.target.checked)
                }
              />
              Enable Prometheus export
            </label>
            {config.prometheus?.enabled ? (
              <label className="text-sm text-slate-600">
                prometheus.yml (editable)
                <textarea
                  className="mt-2 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                  value={prometheusDraft || prometheusYaml}
                  onChange={(event) => {
                    setPrometheusDraft(event.target.value);
                    updatePrometheus("configYaml", event.target.value);
                  }}
                  onFocus={() => setPrometheusDraft(prometheusYaml)}
                />
              </label>
            ) : null}
          </div>
        </details>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Scripts</h2>
            <span className="text-xs uppercase tracking-widest text-slate-400">
              optional
            </span>
          </div>
          {scripts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No scripts yet. Add them in Settings → Scripts.
            </p>
          ) : (
            <div className="space-y-2">
              {scripts.map((script) => {
                const selected = config.scriptIds?.includes(script.id);
                return (
                  <button
                    key={script.id}
                    onClick={() => toggleScript(script.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                      selected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{script.name}</p>
                      <p
                        className={
                          selected ? "text-slate-200" : "text-slate-500"
                        }
                      >
                        {script.description || "No description"}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-widest">
                      {selected ? "Selected" : "Select"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Add service group
          </h2>
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_0.7fr_auto]">
            <div>
              <label className="text-sm text-slate-600">Service</label>
              <input
                list="services"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                placeholder="Search service..."
                onChange={(event) => {
                  const matched = catalog.services.find(
                    (service) =>
                      service.name.toLowerCase() ===
                        event.target.value.toLowerCase() ||
                      service.id === event.target.value
                  );
                  setSelectedService(matched || null);
                  setSelectedVersion("");
                }}
              />
              <datalist id="services">
                {catalog.services.map((service) => (
                  <option key={service.id} value={service.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm text-slate-600">Version</label>
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={selectedVersion}
                onChange={(event) => setSelectedVersion(event.target.value)}
                disabled={!selectedService}
              >
                <option value="">Default</option>
                {selectedService?.versions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Instances</label>
              <input
                type="number"
                min={1}
                value={serviceCount}
                onChange={(event) =>
                  setServiceCount(Math.max(1, Number(event.target.value) || 1))
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddService}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Configure
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Configured services
            </h2>
            <div className="flex items-center gap-3">
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
                placeholder="Search services..."
              />
              <span className="text-xs uppercase tracking-widest text-slate-400">
                grouped
              </span>
            </div>
          </div>
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No services match your search.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group, index) => {
                const serviceInfo = catalog.services.find(
                  (item) => item.id === group.serviceId
                );
                return (
                  <div
                    key={group.groupId}
                    onMouseEnter={() => setHoveredGroupId(group.groupId)}
                    onMouseLeave={() => setHoveredGroupId(null)}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {serviceInfo?.name || group.serviceId}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {group.instances.length} instance(s):{" "}
                          {group.instances
                            .map((instance) => instance.name)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/compose/${config.id}/service/${group.groupId}`
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeGroup(group.groupId)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => moveGroup(group.groupId, "up")}
                          disabled={index === 0}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-40"
                        >
                          Move up
                        </button>
                        <button
                          onClick={() => moveGroup(group.groupId, "down")}
                          disabled={index === filteredGroups.length - 1}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-40"
                        >
                          Move down
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">docker-compose.yml</h2>
          <span className="text-xs uppercase tracking-widest text-slate-300">
            live
          </span>
        </div>
        <pre
          className="mt-4 h-[78vh] overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed"
          ref={composeScrollRef}
        >
          <code className="block whitespace-pre">
            {composeYaml.split("\n").map((line, index) => (
              <span
                key={`compose-line-${index}`}
                data-line-index={index}
                className={`block ${
                  highlightLines.has(index)
                    ? "bg-amber-400/20 text-amber-100"
                    : ""
                }`}
              >
                {line.length ? line : " "}
              </span>
            ))}
          </code>
        </pre>
      </aside>

      <aside className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">.env</h2>
          <span className="text-xs uppercase tracking-widest text-slate-300">
            live
          </span>
        </div>
        <pre className="mt-4 h-[78vh] overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed">
          {envFile || "# No global environment variables yet."}
        </pre>
      </aside>

      {isEnvEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit .env
              </h2>
              <button
                onClick={() => setIsEnvEditorOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <textarea
              className="mt-4 min-h-[320px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
              value={envDraft}
              onChange={(event) => setEnvDraft(event.target.value)}
              placeholder="KEY=value"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEnvEditorOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={applyEnvEditor}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isYamlEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit docker-compose.yml
              </h2>
              <button
                onClick={() => setIsYamlEditorOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <textarea
              className="mt-4 min-h-[360px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
              value={yamlDraft}
              onChange={(event) => setYamlDraft(event.target.value)}
            />
            {yamlError ? (
              <p className="mt-2 text-sm text-rose-600">{yamlError}</p>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsYamlEditorOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={applyYamlEditor}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isValidationOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Validation
              </h2>
              <button
                onClick={() => setIsValidationOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Missing envs
                </p>
                {validation.missing.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">None</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-rose-600">
                    {validation.missing.map((key) => (
                      <li key={`missing-${key}`}>{key}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Unused envs
                </p>
                {validation.unused.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">None</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {validation.unused.map((key) => (
                      <li key={`unused-${key}`}>{key}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Checks ${"{VAR}"} and ${"{VAR:default}"} in compose, .env, and
              application.properties.
            </p>
          </div>
        </div>
      ) : null}

      {saveMessage ? (
        <div
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            saveStatus === "success"
              ? "border-emerald-200 bg-emerald-500 text-white"
              : "border-rose-200 bg-rose-500 text-white"
          }`}
        >
          {saveMessage}
        </div>
      ) : null}
    </div>
  );
}
