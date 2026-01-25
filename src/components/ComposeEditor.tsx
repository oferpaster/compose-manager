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
import DependencyMapModal from "@/components/compose/DependencyMapModal";
import AddServiceGroupSection from "@/components/compose/AddServiceGroupSection";
import ComposeHeader from "@/components/compose/ComposeHeader";
import ComposeYamlPanel from "@/components/compose/ComposeYamlPanel";
import EnvEditorModal from "@/components/compose/EnvEditorModal";
import EnvPanel from "@/components/compose/EnvPanel";
import EnvValidationModal from "@/components/compose/EnvValidationModal";
import GlobalEnvSection from "@/components/compose/GlobalEnvSection";
import LoggingSection from "@/components/compose/LoggingSection";
import NetworksSection from "@/components/compose/NetworksSection";
import NginxConfigSection from "@/components/compose/NginxConfigSection";
import PortsOverviewModal from "@/components/compose/PortsOverviewModal";
import PortsOverviewSection from "@/components/compose/PortsOverviewSection";
import PrometheusSection from "@/components/compose/PrometheusSection";
import SaveToast from "@/components/compose/SaveToast";
import ScriptsSection from "@/components/compose/ScriptsSection";
import UtilitiesSection from "@/components/compose/UtilitiesSection";
import VolumesOverviewModal from "@/components/compose/VolumesOverviewModal";
import VolumesOverviewSection from "@/components/compose/VolumesOverviewSection";
import YamlEditorModal from "@/components/compose/YamlEditorModal";
import ConfiguredServicesSection from "@/components/compose/ConfiguredServicesSection";

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
  const [isDependencyMapOpen, setIsDependencyMapOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [prometheusDraft, setPrometheusDraft] = useState("");
  const [prometheusDraftDirty, setPrometheusDraftDirty] = useState(false);
  const [prometheusAuto, setPrometheusAuto] = useState(true);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [missingEnvSearch, setMissingEnvSearch] = useState("");
  const [unusedEnvSearch, setUnusedEnvSearch] = useState("");
  const [duplicateEnvSearch, setDuplicateEnvSearch] = useState("");
  const [duplicateEnvTargets, setDuplicateEnvTargets] = useState<
    Record<string, string>
  >({});
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [missingEnvValues, setMissingEnvValues] = useState<
    Record<string, string>
  >({});

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
    [config.services],
  );

  const updateDependenciesForService = (
    serviceName: string,
    nextDependsOn: ServiceConfig["dependsOn"],
  ) => {
    setConfig((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.name === serviceName
          ? {
              ...service,
              dependsOn: nextDependsOn,
            }
          : service,
      ),
    }));
  };
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
    [config, catalog.services, catalog.networks],
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
      generateComposeYaml(validationConfig, catalog.services, catalog.networks),
    [validationConfig, catalog.services, catalog.networks],
  );
  const validationEnvFile = useMemo(
    () => generateEnvFile(validationConfig),
    [validationConfig],
  );
  const validationBaseConfig = useMemo(() => {
    if (!isYamlEditorOpen) return validationConfig;
    const result = parseComposeYamlToConfig(
      yamlDraft,
      config,
      catalog.services,
    );
    return result.error ? validationConfig : result.config;
  }, [catalog.services, config, isYamlEditorOpen, validationConfig, yamlDraft]);

  const validation = useMemo(() => {
    const definedGlobal = new Set<string>();
    const definedService = new Set<string>();
    const valuesMap = new Map<string, Set<string>>();

    const globalEnvEntries = isEnvEditorOpen
      ? parseEnvText(envDraft)
      : validationBaseConfig.globalEnv;
    globalEnvEntries.forEach((entry) => {
      if (entry.key.trim() && entry.value.trim()) {
        definedGlobal.add(entry.key.trim());
        const valueKey = entry.value.trim();
        if (valueKey) {
          if (!valuesMap.has(valueKey)) valuesMap.set(valueKey, new Set());
          valuesMap.get(valueKey)?.add(entry.key.trim());
        }
      }
    });
    validationBaseConfig.services.forEach((service) => {
      service.env.forEach((entry) => {
        const key = entry.key.trim();
        if (key) definedService.add(key);
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

    const effectiveComposeYaml = isYamlEditorOpen
      ? yamlDraft
      : validationComposeYaml;
    const effectiveEnvFile = isEnvEditorOpen ? envDraft : validationEnvFile;

    extractFromText(effectiveComposeYaml);
    extractFromText(effectiveEnvFile);
    validationBaseConfig.services.forEach((service) => {
      if (service.applicationProperties) {
        extractFromText(service.applicationProperties);
        return;
      }
      const template = catalog.services.find(
        (item) => item.id === service.serviceId,
      )?.applicationPropertiesTemplate;
      if (template?.trim()) {
        extractFromText(template);
      }
    });

    const definedAll = new Set<string>([...definedGlobal, ...definedService]);
    const missing = Array.from(referenced).filter(
      (key) => !definedAll.has(key),
    );
    const unused = Array.from(definedGlobal).filter(
      (key) => !referenced.has(key),
    );
    missing.sort();
    unused.sort();

    const duplicated = Array.from(valuesMap.entries())
      .filter(([, keys]) => keys.size > 1)
      .map(([value, keys]) => ({
        value,
        keys: Array.from(keys).sort(),
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

    return { missing, unused, duplicated };
  }, [
    catalog.services,
    envDraft,
    isEnvEditorOpen,
    isYamlEditorOpen,
    validationBaseConfig,
    validationComposeYaml,
    validationEnvFile,
    yamlDraft,
  ]);

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
      (item) => item.groupId === hoveredGroupId,
    );
    if (!group) return new Set<number>();

    const targetNames = new Set(
      group.instances.map((instance) => instance.name),
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
        [...group.instances].sort((a, b) => a.name.localeCompare(b.name)),
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

  const refactorDuplicateEnv = (
    value: string,
    nextKeyInput: string,
    keys: string[],
  ) => {
    const nextKey = nextKeyInput.trim();
    if (!nextKey) return;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nextKey)) return;
    const oldKeys = new Set(keys);
    if (oldKeys.size === 0) return;

    const pattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}/g;
    const replaceText = (text: string) =>
      text.replace(pattern, (match, name, fallback) => {
        if (!oldKeys.has(name)) return match;
        if (typeof fallback === "string") {
          return `\${${nextKey}:${fallback}}`;
        }
        return `\${${nextKey}}`;
      });

    const replaceMaybe = (text?: string) => {
      if (!text) return text;
      return replaceText(text);
    };

    setConfig((prev) => {
      const nextGlobalEnv = prev.globalEnv
        .filter((entry) => !oldKeys.has(entry.key))
        .map((entry) => ({
          ...entry,
          value: replaceText(entry.value),
        }));

      const existingIndex = nextGlobalEnv.findIndex(
        (entry) => entry.key === nextKey,
      );
      if (existingIndex >= 0) {
        nextGlobalEnv[existingIndex] = { key: nextKey, value };
      } else {
        nextGlobalEnv.push({ key: nextKey, value });
      }

      const nextServices = prev.services.map((service) => ({
        ...service,
        ports: service.ports.map(replaceText),
        volumes: service.volumes.map(replaceText),
        env: service.env.map((entry) => ({
          ...entry,
          value: replaceText(entry.value),
        })),
        envFile: service.envFile.map(replaceText),
        networkMode: replaceMaybe(service.networkMode),
        hostname: replaceMaybe(service.hostname),
        pid: replaceMaybe(service.pid),
        user: replaceMaybe(service.user),
        restart: replaceMaybe(service.restart),
        command: replaceMaybe(service.command),
        entrypoint: replaceMaybe(service.entrypoint),
        logging: replaceText(service.logging),
        healthcheck: {
          ...service.healthcheck,
          test: replaceText(service.healthcheck.test),
          interval: replaceText(service.healthcheck.interval),
          timeout: replaceText(service.healthcheck.timeout),
          startPeriod: replaceText(service.healthcheck.startPeriod),
        },
        extraYaml: replaceText(service.extraYaml),
        applicationProperties: replaceMaybe(service.applicationProperties),
        prometheusPort: replaceMaybe(service.prometheusPort),
        prometheusMetricsPath: replaceMaybe(service.prometheusMetricsPath),
        prometheusScrapeInterval: replaceMaybe(service.prometheusScrapeInterval),
      }));

      const nextConfig = {
        ...prev,
        globalEnv: nextGlobalEnv,
        services: nextServices,
        loggingTemplate: replaceMaybe(prev.loggingTemplate),
        nginx: prev.nginx
          ? {
              cert: replaceMaybe(prev.nginx.cert),
              key: replaceMaybe(prev.nginx.key),
              ca: replaceMaybe(prev.nginx.ca),
              config: replaceMaybe(prev.nginx.config),
            }
          : prev.nginx,
        prometheus: prev.prometheus
          ? {
              ...prev.prometheus,
              configYaml: replaceMaybe(prev.prometheus.configYaml),
            }
          : prev.prometheus,
      };

      if (isEnvEditorOpen) {
        setEnvDraft(generateEnvFile(nextConfig));
      }
      if (isYamlEditorOpen) {
        setYamlDraft((draft) => replaceText(draft));
      }
      return nextConfig;
    });

    setDuplicateEnvTargets((prev) => ({
      ...prev,
      [value]: "",
    }));
  };

  useEffect(() => {
    if (!config.prometheus?.enabled) {
      const anyServiceEnabled = config.services.some(
        (service) => service.prometheusEnabled,
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
    if (!isValidationOpen) return;
    setDuplicateEnvTargets((prev) => {
      const next: Record<string, string> = {};
      validation.duplicated.forEach((entry) => {
        next[entry.value] = prev[entry.value] ?? "";
      });
      return next;
    });
  }, [isValidationOpen, validation.duplicated]);

  useEffect(() => {
    if (!hoveredGroupId) {
      setScrollTarget(null);
      return;
    }

    const group = groupedServices.find(
      (item) => item.groupId === hoveredGroupId,
    );
    if (!group) return;
    const targetNames = new Set(
      group.instances.map((instance) => instance.name),
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
      `[data-line-index="${scrollTarget}"]`,
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
        idx === index ? next : entry,
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
    value: string,
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
    value: boolean | string,
  ) => {
    if (
      field === "configYaml" &&
      typeof value === "string" &&
      value.trim().length === 0
    ) {
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
    file: File,
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
          .map((service) => service.name),
      );
      const remaining = prev.services
        .filter((service) => service.groupId !== groupId)
        .map((service) => ({
          ...service,
          dependsOn: service.dependsOn.filter(
            (entry) => !removedNames.has(entry.name),
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
      const existingNames = new Set(
        config.services.map((service) => service.name),
      );
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
          }),
        );
        index += 1;
      }

      setConfig((prev) => ({
        ...prev,
        services: [...prev.services, ...nextServices],
      }));
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
      `/compose/${config.id}/add-service?serviceId=${selectedService.id}&version=${version}&count=${count}`,
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
      catalog.services,
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

  const handleServiceQueryChange = (value: string) => {
    setServiceQuery(value);
    const matched = catalog.services.find(
      (service) =>
        service.name.toLowerCase() === value.toLowerCase() ||
        service.id === value,
    );
    setSelectedService(matched || null);
    setSelectedVersion(matched?.versions[0] || "");
  };

  const handlePrometheusRegenerate = () => {
    setPrometheusAuto(true);
    setPrometheusDraftDirty(false);
    setPrometheusDraft(prometheusYaml);
    updatePrometheus("configYaml", "");
  };

  const resetPlayground = () => {
    localStorage.removeItem(PLAYGROUND_STORAGE_KEY);
    window.location.reload();
  };

  return (
    <div className="grid h-[calc(100vh-6rem)] min-w-0 gap-6 overflow-hidden lg:grid-cols-[1.3fr_1fr_0.9fr]">
      <section className="min-w-0 h-full overflow-y-auto space-y-8 pr-1">
        <ComposeHeader
          config={config}
          isPlayground={isPlayground}
          isSaving={isSaving}
          validation={validation}
          onReset={resetPlayground}
          onOpenValidation={() => setIsValidationOpen(true)}
          onOpenDependencies={() => setIsDependencyMapOpen(true)}
          onSave={handleSave}
          onChangeName={(name) =>
            setConfig((prev) => ({ ...prev, name }))
          }
        />

        <NetworksSection
          networks={catalog.networks}
          selectedNetworks={config.networks}
          onToggle={toggleNetwork}
        />

        <GlobalEnvSection
          values={config.globalEnv}
          onAdd={addGlobalEnv}
          onRemove={removeGlobalEnv}
          onUpdate={updateGlobalEnv}
          onBlur={() => setValidationConfig(config)}
        />

        <PortsOverviewSection
          services={config.services}
          resolvePortMapping={(port) => resolvePortMapping(port, envLookup)}
          onOpenModal={() => setIsPortsOverviewOpen(true)}
        />

        <VolumesOverviewSection
          services={config.services}
          catalogServices={catalog.services}
          onOpenModal={() => setIsVolumesOverviewOpen(true)}
        />

        <LoggingSection
          value={config.loggingTemplate || ""}
          onChange={updateLoggingTemplate}
        />

        {!isPlayground ? (
          <>
            <NginxConfigSection
              config={config}
              onFileUpload={handleNginxFile}
              onUpdate={updateNginxField}
            />
            <PrometheusSection
              config={config}
              prometheusAuto={prometheusAuto}
              prometheusDraft={prometheusDraft}
              prometheusDraftDirty={prometheusDraftDirty}
              prometheusYaml={prometheusYaml}
              onToggleAuto={setPrometheusAuto}
              onDraftChange={setPrometheusDraft}
              onDraftDirtyChange={setPrometheusDraftDirty}
              onRegenerate={handlePrometheusRegenerate}
              onUpdate={updatePrometheus}
            />
            <ScriptsSection
              scripts={scripts}
              selectedIds={config.scriptIds || []}
              onToggle={toggleScript}
            />
            <UtilitiesSection
              utilities={utilities}
              selectedIds={config.utilityIds || []}
              onToggle={toggleUtility}
            />
          </>
        ) : null}

        <AddServiceGroupSection
          services={catalog.services}
          selectedService={selectedService}
          serviceQuery={serviceQuery}
          selectedVersion={selectedVersion}
          serviceCount={serviceCount}
          isPlayground={isPlayground}
          onServiceQueryChange={handleServiceQueryChange}
          onVersionChange={setSelectedVersion}
          onServiceCountChange={setServiceCount}
          onAdd={handleAddService}
        />

        <ConfiguredServicesSection
          groups={filteredGroups}
          catalogServices={catalog.services}
          serviceSearch={serviceSearch}
          onServiceSearchChange={setServiceSearch}
          onEditGroup={(groupId) => {
            storePlaygroundState();
            router.push(`/compose/${config.id}/service/${groupId}`);
          }}
          onRemoveGroup={removeGroup}
          onMoveGroup={moveGroup}
          onHoverGroup={setHoveredGroupId}
        />
      </section>

      <ComposeYamlPanel
        composeYaml={composeYaml}
        highlightLines={highlightLines}
        onSortByGroup={handleSortByGroup}
        onOpenEditor={openYamlEditor}
        onCopy={() => handleCopy(composeYaml, "compose")}
        copied={copiedCompose}
        scrollRef={composeScrollRef}
      />

      <EnvPanel
        envFile={envFile || ""}
        onOpenEditor={openEnvEditor}
        onCopy={() => handleCopy(envFile || "", "env")}
        copied={copiedEnv}
      />

      <EnvEditorModal
        open={isEnvEditorOpen}
        draft={envDraft}
        onChange={setEnvDraft}
        onApply={applyEnvEditor}
        onClose={() => setIsEnvEditorOpen(false)}
      />
      <VolumesOverviewModal
        open={isVolumesOverviewOpen}
        onClose={() => setIsVolumesOverviewOpen(false)}
        config={config}
        catalog={catalog}
      />
      <DependencyMapModal
        open={isDependencyMapOpen}
        onClose={() => setIsDependencyMapOpen(false)}
        config={config}
        updateDependenciesForService={updateDependenciesForService}
      />
      <YamlEditorModal
        open={isYamlEditorOpen}
        draft={yamlDraft}
        error={yamlError}
        onChange={setYamlDraft}
        onApply={applyYamlEditor}
        onClose={() => setIsYamlEditorOpen(false)}
      />
      <PortsOverviewModal
        open={isPortsOverviewOpen}
        onClose={() => setIsPortsOverviewOpen(false)}
        config={config}
        resolvePortMapping={(port) => resolvePortMapping(port, envLookup)}
      />
      <EnvValidationModal
        open={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        validation={validation}
        missingEnvSearch={missingEnvSearch}
        unusedEnvSearch={unusedEnvSearch}
        missingEnvValues={missingEnvValues}
        duplicateEnvSearch={duplicateEnvSearch}
        duplicateEnvTargets={duplicateEnvTargets}
        setMissingEnvSearch={setMissingEnvSearch}
        setUnusedEnvSearch={setUnusedEnvSearch}
        setDuplicateEnvSearch={setDuplicateEnvSearch}
        setMissingEnvValues={setMissingEnvValues}
        setDuplicateEnvTargets={setDuplicateEnvTargets}
        addMissingEnv={addMissingEnv}
        removeUnusedEnv={removeUnusedEnv}
        refactorDuplicateEnv={refactorDuplicateEnv}
      />

      <SaveToast message={saveMessage} status={saveStatus} />
    </div>
  );
}
