"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ComposeConfig,
  createServiceConfig,
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
type UtilitySummary = {
  id: string;
  name: string;
  file_name: string;
};

type ServiceGroup = {
  groupId: string;
  serviceId: string;
  instances: ServiceConfig[];
};

type Props = {
  initialConfig: ComposeConfig;
  onSave: (config: ComposeConfig) => Promise<void>;
  mode?: "full" | "playground";
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

export default function ComposeEditor({
  initialConfig,
  onSave,
  mode = "full",
}: Props) {
  const router = useRouter();
  const PLAYGROUND_STORAGE_KEY = "composebuilder.playground";
  const isPlayground = mode === "playground";
  const [config, setConfig] = useState<ComposeConfig>(initialConfig);
  const [playgroundLoaded, setPlaygroundLoaded] = useState(false);
  const [catalog, setCatalog] = useState<CatalogResponse>({
    services: [],
    networks: [],
  });
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [utilities, setUtilities] = useState<UtilitySummary[]>([]);
  const [selectedService, setSelectedService] =
    useState<ServiceCatalogItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [serviceCount, setServiceCount] = useState(1);
  const [serviceQuery, setServiceQuery] = useState("");
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
  const [isPortsOverviewOpen, setIsPortsOverviewOpen] = useState(false);
  const [isVolumesOverviewOpen, setIsVolumesOverviewOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [prometheusDraft, setPrometheusDraft] = useState("");
  const [prometheusDraftDirty, setPrometheusDraftDirty] = useState(false);
  const [prometheusAuto, setPrometheusAuto] = useState(true);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [missingEnvSearch, setMissingEnvSearch] = useState("");
  const [unusedEnvSearch, setUnusedEnvSearch] = useState("");
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [missingEnvValues, setMissingEnvValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isPlayground) return;
    setConfig(normalizeComposeConfig(initialConfig));
  }, [initialConfig, isPlayground]);

  useEffect(() => {
    if (!isPlayground) return;
    const stored = localStorage.getItem(PLAYGROUND_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ComposeConfig;
        setConfig(normalizeComposeConfig(parsed));
      } catch {
        // ignore invalid storage
      }
    }
    setPlaygroundLoaded(true);
  }, [isPlayground]);

  useEffect(() => {
    if (!isPlayground || !playgroundLoaded) return;
    localStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(config));
  }, [config, isPlayground, playgroundLoaded]);

  useEffect(() => {
    async function loadCatalog() {
      const response = await fetch("/api/catalog");
      const data = (await response.json()) as CatalogResponse;
      setCatalog(data);
    }

    loadCatalog().catch(() => null);
  }, []);

  useEffect(() => {
    if (isPlayground) {
      setScripts([]);
      return;
    }
    async function loadScripts() {
      const response = await fetch("/api/scripts");
      const data = (await response.json()) as { scripts: ScriptSummary[] };
      setScripts(data.scripts || []);
    }

    loadScripts().catch(() => null);
  }, [isPlayground]);

  useEffect(() => {
    if (isPlayground) {
      setUtilities([]);
      return;
    }
    async function loadUtilities() {
      const response = await fetch("/api/utilities");
      const data = (await response.json()) as { utilities: UtilitySummary[] };
      setUtilities(data.utilities || []);
    }

    loadUtilities().catch(() => null);
  }, [isPlayground]);

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
  const envLookup = useMemo(() => {
    const map = new Map<string, string>();
    config.globalEnv.forEach((entry) => {
      const key = entry.key.trim();
      if (key) {
        map.set(key, entry.value);
      }
    });
    return map;
  }, [config.globalEnv]);

  const [validationConfig, setValidationConfig] =
    useState<ComposeConfig>(config);

  useEffect(() => {
    setValidationConfig(config);
  }, [config]);

  const validationComposeYaml = useMemo(
    () =>
      generateComposeYaml(
        validationConfig,
        catalog.services,
        catalog.networks
      ),
    [validationConfig, catalog.services, catalog.networks]
  );
  const validationEnvFile = useMemo(
    () => generateEnvFile(validationConfig),
    [validationConfig]
  );

  const validation = useMemo(() => {
    const definedGlobal = new Set<string>();
    const definedService = new Set<string>();

    validationConfig.globalEnv.forEach((entry) => {
      if (entry.key.trim() && entry.value.trim()) {
        definedGlobal.add(entry.key.trim());
      }
    });
    validationConfig.services.forEach((service) => {
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

    extractFromText(validationComposeYaml);
    extractFromText(validationEnvFile);
    validationConfig.services.forEach((service) => {
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
  }, [validationComposeYaml, validationConfig, validationEnvFile]);

  const resolvePortMapping = (port: string, envMap: Map<string, string>) => {
    const pattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}/g;
    let missing = false;
    let replaced = false;
    const resolved = port.replace(pattern, (match, name, fallback) => {
      replaced = true;
      if (envMap.has(name)) {
        return envMap.get(name) ?? "";
      }
      if (typeof fallback === "string") {
        return fallback;
      }
      missing = true;
      return match;
    });

    if (!replaced || missing || resolved.includes("${") || resolved === port) {
      return port;
    }
    return `${port} - ${resolved}`;
  };

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
    const findServicesIndent = () => {
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].trim() === "services:") {
          return { index: i, indent: getIndent(lines[i]) };
        }
      }
      return null;
    };
    const servicesInfo = findServicesIndent();
    if (!servicesInfo) return highlighted;

    let serviceKeyIndent: number | null = null;
    let inServices = false;

    lines.forEach((line, index) => {
      if (index === servicesInfo.index) {
        inServices = true;
        return;
      }
      if (!inServices) return;

      const indent = getIndent(line);
      const trimmed = line.trim();
      if (trimmed.length === 0) return;
      if (indent <= servicesInfo.indent) {
        inServices = false;
        return;
      }

      if (!trimmed.endsWith(":")) return;
      if (serviceKeyIndent === null) {
        serviceKeyIndent = indent;
      }
      if (indent !== serviceKeyIndent) return;

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

  const handleCopy = async (text: string, type: "compose" | "env") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "compose") {
        setCopiedCompose(true);
        setTimeout(() => setCopiedCompose(false), 1500);
      } else {
        setCopiedEnv(true);
        setTimeout(() => setCopiedEnv(false), 1500);
      }
    } catch {
      // noop
    }
  };

  const handleSortByGroup = () => {
    setConfig((prev) => {
      const nextServices = groupedServices.flatMap((group) =>
        [...group.instances].sort((a, b) => a.name.localeCompare(b.name))
      );
      return { ...prev, services: nextServices };
    });
  };

  const addMissingEnv = (key: string) => {
    const value = missingEnvValues[key] ?? "";
    setConfig((prev) => {
      if (prev.globalEnv.some((entry) => entry.key === key)) return prev;
      const next = {
        ...prev,
        globalEnv: [...prev.globalEnv, { key, value }],
      };
      setValidationConfig(next);
      return next;
    });
    setMissingEnvValues((prev) => ({ ...prev, [key]: "" }));
  };

  const removeUnusedEnv = (key: string) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        globalEnv: prev.globalEnv.filter((entry) => entry.key !== key),
      };
      setValidationConfig(next);
      return next;
    });
  };

  useEffect(() => {
    if (!config.prometheus?.enabled) {
      const anyServiceEnabled = config.services.some(
        (service) => service.prometheusEnabled
      );
      if (anyServiceEnabled) {
        setConfig((prev) => ({
          ...prev,
          prometheus: {
            enabled: true,
            configYaml: prev.prometheus?.configYaml || "",
          },
        }));
      }
    }
  }, [config.prometheus?.enabled, config.services]);

  useEffect(() => {
    if (!config.prometheus?.enabled) return;
    if (!prometheusAuto) return;
    if (prometheusDraftDirty) return;
    if (config.prometheus?.configYaml?.trim()) return;
    setPrometheusDraft(prometheusYaml);
  }, [
    config.prometheus?.enabled,
    config.prometheus?.configYaml,
    prometheusAuto,
    prometheusDraftDirty,
    prometheusYaml,
  ]);

  useEffect(() => {
    if (config.prometheus?.configYaml?.trim()) {
      setPrometheusAuto(false);
    } else {
      setPrometheusAuto(true);
      setPrometheusDraftDirty(false);
    }
  }, [config.prometheus?.configYaml]);

  useEffect(() => {
    if (!isValidationOpen) return;
    setMissingEnvValues((prev) => {
      const next: Record<string, string> = {};
      validation.missing.forEach((key) => {
        next[key] = prev[key] ?? "";
      });
      return next;
    });
  }, [isValidationOpen, validation.missing]);

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
    const getIndent = (line: string) => line.match(/^ */)?.[0].length ?? 0;
    const servicesInfo = (() => {
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].trim() === "services:") {
          return { index: i, indent: getIndent(lines[i]) };
        }
      }
      return null;
    })();
    if (!servicesInfo) return;

    let serviceKeyIndent: number | null = null;
    let inServices = false;
    let targetIndex = -1;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (i === servicesInfo.index) {
        inServices = true;
        continue;
      }
      if (!inServices) continue;

      const indent = getIndent(line);
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      if (indent <= servicesInfo.indent) {
        inServices = false;
        continue;
      }

      if (!trimmed.endsWith(":")) continue;
      if (serviceKeyIndent === null) {
        serviceKeyIndent = indent;
      }
      if (indent !== serviceKeyIndent) continue;

      const name = trimmed.slice(0, -1);
      if (targetNames.has(name)) {
        targetIndex = i;
        break;
      }
    }

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
    setConfig((prev) => {
      const next = {
        ...prev,
        globalEnv: [...prev.globalEnv, emptyKeyValue()],
      };
      setValidationConfig(next);
      return next;
    });
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
    setConfig((prev) => {
      const next = {
        ...prev,
        globalEnv: prev.globalEnv.filter((_, idx) => idx !== index),
      };
      setValidationConfig(next);
      return next;
    });
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
    if (field === "configYaml" && typeof value === "string" && value.trim().length === 0) {
      setPrometheusDraftDirty(false);
      setPrometheusDraft("");
    }
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

  const toggleUtility = (utilityId: string) => {
    setConfig((prev) => {
      const current = prev.utilityIds || [];
      const exists = current.includes(utilityId);
      return {
        ...prev,
        utilityIds: exists
          ? current.filter((item) => item !== utilityId)
          : [...current, utilityId],
      };
    });
  };

  const removeGroup = (groupId: string) => {
    setConfig((prev) => {
      const removedNames = new Set(
        prev.services
          .filter((service) => service.groupId === groupId)
          .map((service) => service.name)
      );
      const remaining = prev.services
        .filter((service) => service.groupId !== groupId)
        .map((service) => ({
          ...service,
          dependsOn: service.dependsOn.filter(
            (entry) => !removedNames.has(entry.name)
          ),
        }));
      return {
        ...prev,
        services: remaining,
      };
    });
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

    if (isPlayground) {
      const existingNames = new Set(config.services.map((service) => service.name));
      let index = 1;
      const nextServices: ServiceConfig[] = [];
      const groupId = crypto.randomUUID();

      for (let i = 0; i < count; i += 1) {
        let name = `${selectedService.id}-${index}`;
        while (existingNames.has(name)) {
          index += 1;
          name = `${selectedService.id}-${index}`;
        }
        existingNames.add(name);
        nextServices.push(
          createServiceConfig(selectedService, {
            groupId,
            name,
            version,
          })
        );
        index += 1;
      }

      setConfig((prev) => ({ ...prev, services: [...prev.services, ...nextServices] }));
      setSelectedService(null);
      setSelectedVersion("");
      setServiceCount(1);
      setServiceQuery("");
      return;
    }

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

  const storePlaygroundState = () => {
    if (!isPlayground) return;
    localStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(config));
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
    setValidationConfig((prev) => ({
      ...prev,
      globalEnv: parseEnvText(envDraft),
    }));
    setIsEnvEditorOpen(false);
  };

  const openYamlEditor = () => {
    setYamlDraft(composeYaml);
    setYamlError("");
    setIsYamlEditorOpen(true);
  };

  const applyYamlEditor = async () => {
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

    if (isPlayground) return;

    setIsSaving(true);
    setSaveMessage("");
    try {
      await onSave(result.config);
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

  return (
    <div className="grid h-[calc(100vh-6rem)] min-w-0 gap-6 overflow-hidden lg:grid-cols-[1.3fr_1fr_0.9fr]">
      <section className="min-w-0 h-full overflow-y-auto space-y-8 pr-1">
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
              {isPlayground ? (
                <button
                  onClick={() => {
                    localStorage.removeItem(PLAYGROUND_STORAGE_KEY);
                    window.location.reload();
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
                >
                  Reset
                </button>
              ) : null}
              <button
                onClick={() => setIsValidationOpen(true)}
                className="cursor-pointer rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700"
              >
                Env Check
              </button>
              {!isPlayground ? (
                <button
                  onClick={handleSave}
                  className="compose-save-button border border-slate-200 cursor-pointer rounded-full border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow"
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
              ) : null}
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
                className={`network-pill rounded-full border px-3 py-1 text-sm ${
                  config.networks.includes(network.name)
                    ? "network-pill-selected border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {network.name}
              </button>
            ))}
          </div>
        </section>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Global environment
            </h2>
            <span className="text-sm text-slate-500">Toggle</span>
          </summary>
          <div className="mt-4 space-y-3">
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
                  onBlur={() => setValidationConfig(config)}
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
                  onBlur={() => setValidationConfig(config)}
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
            className="mt-4 cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"
          >
            + Add global env
          </button>
        </details>

        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Ports Overview
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setIsPortsOverviewOpen(true);
                }}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                title="Open"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M7 3H3v4a1 1 0 1 0 2 0V6h2a1 1 0 1 0 0-2zm14 0h-4a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0V3zM5 17a1 1 0 0 0-2 0v4h4a1 1 0 1 0 0-2H5v-2zm14 0v2h-2a1 1 0 1 0 0 2h4v-4a1 1 0 0 0-2 0z" />
                </svg>
              </button>
              <span className="text-sm text-slate-500">Toggle</span>
            </div>
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
                            <div className="space-y-1">
                              {service.ports.map((port, index) => {
                                const resolved = resolvePortMapping(
                                  port,
                                  envLookup
                                );
                                return (
                                  <div key={`${service.id}-port-${index}`}>
                                    {resolved}
                                  </div>
                                );
                              })}
                            </div>
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setIsVolumesOverviewOpen(true);
                }}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                title="Open"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M7 3H3v4a1 1 0 1 0 2 0V6h2a1 1 0 1 0 0-2zm14 0h-4a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0V3zM5 17a1 1 0 0 0-2 0v4h4a1 1 0 1 0 0-2H5v-2zm14 0v2h-2a1 1 0 1 0 0 2h4v-4a1 1 0 0 0-2 0z" />
                </svg>
              </button>
              <span className="text-sm text-slate-500">Toggle</span>
            </div>
          </summary>
          <div className="mt-4 space-y-4">
            {config.services.filter((service) => {
              const info = catalog.services.find(
                (item) => item.id === service.serviceId
              );
              const hasProps =
                Boolean(info?.springBoot) &&
                Boolean(service.applicationProperties);
              return service.volumes.length > 0 || hasProps;
            }).length === 0 ? (
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
                    {config.services.map((service) => {
                      const info = catalog.services.find(
                        (item) => item.id === service.serviceId
                      );
                      const volumes = [...service.volumes];
                      if (info?.springBoot && service.applicationProperties) {
                        volumes.push(
                          `./${service.name}/application.properties:/opt/app/application.properties`
                        );
                      }
                      if (volumes.length === 0) return null;
                      return (
                        <tr key={`volumes-${service.id}`} className="border-t">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {service.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="space-y-1">
                              {volumes.map((volume, index) => (
                                <div key={`${service.id}-volume-${index}`}>
                                  {volume}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

        {!isPlayground ? (
          <>
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
                    onChange={(event) =>
                      updateNginxField("ca", event.target.value)
                    }
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
                    <div className="flex flex-wrap items-center gap-3">
                      <span>prometheus.yml</span>
                      <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
                        <input
                          type="checkbox"
                          checked={prometheusAuto}
                          onChange={(event) => {
                            const next = event.target.checked;
                            setPrometheusAuto(next);
                            if (next) {
                              setPrometheusDraftDirty(false);
                              setPrometheusDraft(prometheusYaml);
                              updatePrometheus("configYaml", "");
                            }
                          }}
                        />
                        Auto-generate
                      </label>
                      {prometheusAuto ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                          Auto
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setPrometheusAuto(true);
                          setPrometheusDraftDirty(false);
                          setPrometheusDraft(prometheusYaml);
                          updatePrometheus("configYaml", "");
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
                      >
                        Regenerate
                      </button>
                    </div>
                    <textarea
                      className="prometheus-textarea mt-2 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      value={prometheusDraft || prometheusYaml}
                      onChange={(event) => {
                        setPrometheusDraft(event.target.value);
                        setPrometheusDraftDirty(true);
                        updatePrometheus("configYaml", event.target.value);
                      }}
                      onFocus={() => {
                        if (!prometheusDraftDirty && !config.prometheus?.configYaml?.trim()) {
                          setPrometheusDraft(prometheusYaml);
                        }
                      }}
                      disabled={prometheusAuto}
                    />
                    {prometheusAuto ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Auto-generated from services marked for Prometheus. Disable auto to edit.
                      </p>
                    ) : null}
                  </label>
                ) : null}
              </div>
            </details>

            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Scripts
                  </h2>
                  <span className="text-xs uppercase tracking-widest text-slate-400">
                    optional
                  </span>
                </div>
                <span className="text-sm text-slate-500">Toggle</span>
              </summary>
              <div className="mt-4 space-y-4">
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
              </div>
            </details>

            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Utilities
                  </h2>
                  <span className="text-xs uppercase tracking-widest text-slate-400">
                    optional
                  </span>
                </div>
                <span className="text-sm text-slate-500">Toggle</span>
              </summary>
              <div className="mt-4 space-y-4">
                {utilities.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No utilities yet. Add them in Settings → Utilities.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {utilities.map((utility) => {
                      const selected = config.utilityIds?.includes(utility.id);
                      const label = utility.name || utility.file_name;
                      return (
                        <button
                          key={utility.id}
                          onClick={() => toggleUtility(utility.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{label}</p>
                            <p
                              className={
                                selected ? "text-slate-200" : "text-slate-500"
                              }
                            >
                              {utility.file_name || "utility.bin"}
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
              </div>
            </details>
          </>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Add service group
          </h2>
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_0.7fr_auto]">
            <div>
              <label className="text-sm text-slate-600">Service</label>
              <input
                list="services"
                value={serviceQuery}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                placeholder="Search service..."
                onChange={(event) => {
                  setServiceQuery(event.target.value);
                  const matched = catalog.services.find(
                    (service) =>
                      service.name.toLowerCase() ===
                        event.target.value.toLowerCase() ||
                      service.id === event.target.value
                  );
                  setSelectedService(matched || null);
                  setSelectedVersion(matched?.versions[0] || "");
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
                {isPlayground ? "Add" : "Configure"}
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
                          onClick={() => {
                            storePlaygroundState();
                            router.push(
                              `/compose/${config.id}/service/${group.groupId}`
                            );
                          }}
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

      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">docker-compose.yml</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSortByGroup}
              className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Sort by Group
            </button>
            <button
              onClick={openYamlEditor}
              className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Edit YAML
            </button>
            <button
              onClick={() => handleCopy(composeYaml, "compose")}
              className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              {copiedCompose ? "Copied" : "Copy"}
            </button>
            <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
              live
            </span>
          </div>
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

      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">.env</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={openEnvEditor}
              className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Edit .env
            </button>
            <button
              onClick={() => handleCopy(envFile || "", "env")}
              className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              {copiedEnv ? "Copied" : "Copy"}
            </button>
            <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
              live
            </span>
          </div>
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

      {isVolumesOverviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Volumes Overview
                </h2>
                <p className="text-sm text-slate-500">
                  {config.name || "Compose"}
                </p>
              </div>
              <button
                onClick={() => setIsVolumesOverviewOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-auto">
              {config.services.filter((service) => {
                const info = catalog.services.find(
                  (item) => item.id === service.serviceId
                );
                const hasProps =
                  Boolean(info?.springBoot) &&
                  Boolean(service.applicationProperties);
                return service.volumes.length > 0 || hasProps;
              }).length === 0 ? (
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
                      {config.services.map((service) => {
                        const info = catalog.services.find(
                          (item) => item.id === service.serviceId
                        );
                        const volumes = [...service.volumes];
                        if (info?.springBoot && service.applicationProperties) {
                          volumes.push(
                            `./${service.name}/application.properties:/opt/app/application.properties`
                          );
                        }
                        if (volumes.length === 0) return null;
                        return (
                          <tr key={`volumes-modal-${service.id}`} className="border-t">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {service.name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="space-y-1">
                                {volumes.map((volume, index) => (
                                  <div key={`${service.id}-modal-volume-${index}`}>
                                    {volume}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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

      {isPortsOverviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Ports Overview
                </h2>
                <p className="text-sm text-slate-500">
                  {config.name || "Compose"}
                </p>
              </div>
              <button
                onClick={() => setIsPortsOverviewOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-auto">
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
                          <tr key={`ports-modal-${service.id}`} className="border-t">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {service.name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="space-y-1">
                                {service.ports.map((port, index) => {
                                  const resolved = resolvePortMapping(
                                    port,
                                    envLookup
                                  );
                                  return (
                                    <div key={`${service.id}-modal-port-${index}`}>
                                      {resolved}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isValidationOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="flex w-full max-w-3xl max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Environment Check
              </h2>
              <button
                onClick={() => setIsValidationOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-6 overflow-auto">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Missing envs
                </p>
                {validation.missing.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">None</p>
                ) : (
                  <div className="mt-2 space-y-3 text-sm text-rose-600">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      placeholder="Search missing envs..."
                      value={missingEnvSearch}
                      onChange={(event) => setMissingEnvSearch(event.target.value)}
                    />
                    <div className="space-y-2">
                      {validation.missing
                        .filter((key) =>
                          key
                            .toLowerCase()
                            .includes(missingEnvSearch.trim().toLowerCase())
                        )
                        .map((key) => (
                          <div
                            key={`missing-${key}`}
                            className="grid items-center gap-2 md:grid-cols-[1fr_1fr_auto]"
                          >
                            <span className="font-semibold text-rose-600">
                              {key}
                            </span>
                            <input
                              value={missingEnvValues[key] ?? ""}
                              onChange={(event) =>
                                setMissingEnvValues((prev) => ({
                                  ...prev,
                                  [key]: event.target.value,
                                }))
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                              placeholder="value"
                            />
                            <button
                              onClick={() => addMissingEnv(key)}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Unused envs
                </p>
                {validation.unused.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">None</p>
                ) : (
                  <div className="mt-2 space-y-3 text-sm text-slate-600">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      placeholder="Search unused envs..."
                      value={unusedEnvSearch}
                      onChange={(event) => setUnusedEnvSearch(event.target.value)}
                    />
                    <div className="space-y-2">
                      {validation.unused
                        .filter((key) =>
                          key
                            .toLowerCase()
                            .includes(unusedEnvSearch.trim().toLowerCase())
                        )
                        .map((key) => (
                          <div
                            key={`unused-${key}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="font-semibold">{key}</span>
                            <button
                              onClick={() => removeUnusedEnv(key)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
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
