import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { ServiceCatalogItem } from "./serviceCatalog";

export type KeyValue = {
  key: string;
  value: string;
};

export type ServiceConfig = {
  id: string;
  groupId: string;
  serviceId: string;
  name: string;
  version: string;
  containerName?: string;
  ports: string[];
  volumes: string[];
  env: KeyValue[];
  networks: string[];
  hostname?: string;
  privileged?: boolean;
  restart?: string;
  command?: string;
  entrypoint?: string;
  extraHosts: string[];
  dependsOn: string[];
  extraYaml: string;
  applicationProperties?: string;
};

export type ComposeConfig = {
  id: string;
  projectId?: string;
  name: string;
  globalEnv: KeyValue[];
  networks: string[];
  services: ServiceConfig[];
  scriptIds?: string[];
  nginx?: {
    cert?: string;
    key?: string;
    ca?: string;
    config?: string;
  };
};

export function createEmptyCompose(name: string): ComposeConfig {
  return {
    id: "",
    projectId: "",
    name,
    globalEnv: [],
    networks: ["backend"],
    services: [],
    scriptIds: [],
    nginx: {
      cert: "",
      key: "",
      ca: "",
      config: "",
    },
  };
}

export function normalizeComposeConfig(config: ComposeConfig): ComposeConfig {
  const globalEnv = Array.isArray(config.globalEnv) ? config.globalEnv : [];
  const networks = Array.isArray(config.networks) ? config.networks : [];
  const servicesInput = Array.isArray(config.services) ? config.services : [];
  const scriptIds = Array.isArray(config.scriptIds) ? config.scriptIds : [];
  const nginx = {
    cert: config.nginx?.cert || "",
    key: config.nginx?.key || "",
    ca: config.nginx?.ca || "",
    config: config.nginx?.config || "",
  };
  const usedNames = new Set<string>();
  const counters: Record<string, number> = {};

  const allocateName = (base: string) => {
    let nextIndex = counters[base] || 1;
    let candidate = `${base}-${nextIndex}`;
    while (usedNames.has(candidate)) {
      nextIndex += 1;
      candidate = `${base}-${nextIndex}`;
    }
    counters[base] = nextIndex + 1;
    usedNames.add(candidate);
    return candidate;
  };

  const services: ServiceConfig[] = [];

  servicesInput.forEach((service) => {
    const { count: _count, ...rest } = service as ServiceConfig & { count?: number };
    const groupId = rest.groupId || crypto.randomUUID();
    const base = rest.serviceId || "service";
    const rawCount = Number(_count);
    const count = Number.isFinite(rawCount) && rawCount > 1 ? rawCount : 1;

    if (count === 1) {
      let name = rest.name?.trim();
      if (!name || usedNames.has(name)) {
        name = allocateName(base);
      } else {
        usedNames.add(name);
      }
      services.push({ ...rest, id: rest.id || crypto.randomUUID(), groupId, name });
      return;
    }

    for (let index = 0; index < count; index += 1) {
      const name = allocateName(base);
      services.push({
        ...rest,
        id: crypto.randomUUID(),
        groupId,
        name,
      });
    }
  });

  return { ...config, globalEnv, networks, services, scriptIds, nginx };
}

export function createServiceConfig(
  service: ServiceCatalogItem,
  overrides?: Partial<ServiceConfig>
): ServiceConfig {
  const groupId = overrides?.groupId || crypto.randomUUID();
  const name = overrides?.name || `${service.id}-1`;
  return {
    id: crypto.randomUUID(),
    groupId,
    serviceId: service.id,
    name,
    version: service.versions[0] || "latest",
    containerName: service.defaultContainerName || "",
    ports: service.defaultPorts ? [...service.defaultPorts] : [],
    volumes: service.defaultVolumes ? [...service.defaultVolumes] : [],
    env: service.defaultEnv
      ? Object.entries(service.defaultEnv).map(([key, value]) => ({ key, value }))
      : [],
    networks: service.defaultNetworks ? [...service.defaultNetworks] : [],
    restart: service.defaultRestart || "",
    hostname: "",
    privileged: false,
    restart: "",
    command: "",
    entrypoint: "",
    extraHosts: [],
    dependsOn: [],
    extraYaml: "",
    applicationProperties: "",
    ...overrides,
  };
}

export function keyValueArrayToObject(entries: KeyValue[]) {
  return entries
    .filter((entry) => entry.key.trim().length > 0)
    .reduce<Record<string, string>>((acc, entry) => {
      acc[entry.key] = entry.value;
      return acc;
    }, {});
}

function mergeExtraYaml(target: Record<string, unknown>, extraYaml: string) {
  if (!extraYaml.trim()) return { merged: target, error: "" };
  try {
    const parsed = yamlParse(extraYaml);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { merged: { ...target, ...parsed }, error: "" };
    }
    return { merged: target, error: "Extra YAML must be a map/object." };
  } catch (error) {
    return { merged: target, error: error instanceof Error ? error.message : "Invalid YAML" };
  }
}

function findServiceById(catalog: ServiceCatalogItem[], serviceId: string) {
  return catalog.find((service) => service.id === serviceId) || null;
}

function findServiceByImage(catalog: ServiceCatalogItem[], image: string) {
  return catalog.find((service) => service.image === image) || null;
}

export function generateComposeObject(
  config: ComposeConfig,
  catalog: ServiceCatalogItem[]
) {
  const services: Record<string, Record<string, unknown>> = {};
  const usedNetworks = new Set<string>(config.networks);

  config.services.forEach((serviceConfig) => {
    const service = findServiceById(catalog, serviceConfig.serviceId);
    if (!service) return;
    const serviceName = serviceConfig.name?.trim() || service.id;
    const imageTag = serviceConfig.version || "latest";
    const environment = keyValueArrayToObject(serviceConfig.env);
    const serviceNetworks = serviceConfig.networks.length
      ? serviceConfig.networks
      : config.networks;

    serviceNetworks.forEach((network) => usedNetworks.add(network));

    const propertiesMount =
      service.springBoot && serviceConfig.applicationProperties
        ? `./${serviceName}/application.properties:/opt/app/application.properties`
        : "";

    const volumes = serviceConfig.volumes.length ? [...serviceConfig.volumes] : [];
    if (propertiesMount && !volumes.includes(propertiesMount)) {
      volumes.push(propertiesMount);
    }

    const baseService: Record<string, unknown> = {
      image: `${service.image}:${imageTag}`,
      container_name: serviceConfig.containerName?.trim() || undefined,
      ports: serviceConfig.ports.length ? serviceConfig.ports : undefined,
      volumes: volumes.length ? volumes : undefined,
      environment: Object.keys(environment).length ? environment : undefined,
      networks: serviceNetworks.length ? serviceNetworks : undefined,
      hostname: serviceConfig.hostname?.trim() || undefined,
      privileged: serviceConfig.privileged || undefined,
      restart: serviceConfig.restart?.trim() || undefined,
      command: serviceConfig.command?.trim() || undefined,
      entrypoint: serviceConfig.entrypoint?.trim() || undefined,
      extra_hosts: serviceConfig.extraHosts.length ? serviceConfig.extraHosts : undefined,
      depends_on: serviceConfig.dependsOn.length ? serviceConfig.dependsOn : undefined,
    };

    const { merged, error } = mergeExtraYaml(baseService, serviceConfig.extraYaml);
    if (error) {
      merged["x-extra-yaml-error"] = error;
    }

    services[serviceName] = merged;
  });

  const networks: Record<string, Record<string, unknown>> = {};
  Array.from(usedNetworks).forEach((network) => {
    networks[network] = {};
  });

  return {
    services,
    networks: Object.keys(networks).length ? networks : undefined,
  };
}

export function generateComposeYaml(
  config: ComposeConfig,
  catalog: ServiceCatalogItem[]
) {
  const composeObject = generateComposeObject(config, catalog);
  return yamlStringify(composeObject, { indent: 2, aliasDuplicateObjects: false });
}

export function generateEnvFile(config: ComposeConfig) {
  return config.globalEnv
    .filter((entry) => entry.key.trim().length > 0)
    .map((entry) => `${entry.key}=${entry.value}`)
    .join("\n");
}

export function parseEnvText(text: string): KeyValue[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return { key: key.trim(), value: rest.join("=").trim() };
    })
    .filter((entry) => entry.key.length > 0);
}

type ParseResult = {
  config: ComposeConfig;
  error: string;
};

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function parseNetworks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>);
  }
  return [];
}

function parseEnvironment(value: unknown): KeyValue[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const [key, ...rest] = String(item).split("=");
      return { key: key.trim(), value: rest.join("=").trim() };
    });
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).map(([key, val]) => ({
      key,
      value: String(val),
    }));
  }
  return [];
}

function parseCommand(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(" ");
  }
  if (typeof value === "string") return value;
  return "";
}

export function parseComposeYamlToConfig(
  yamlText: string,
  current: ComposeConfig,
  catalog: ServiceCatalogItem[]
): ParseResult {
  let parsed: unknown;
  try {
    parsed = yamlParse(yamlText);
  } catch (error) {
    return { config: current, error: error instanceof Error ? error.message : "Invalid YAML" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { config: current, error: "Compose YAML must be a map/object." };
  }

  const root = parsed as Record<string, unknown>;
  const servicesRaw = root.services;
  if (!servicesRaw || typeof servicesRaw !== "object" || Array.isArray(servicesRaw)) {
    return { config: current, error: "Compose YAML must include services." };
  }

  const servicesMap = servicesRaw as Record<string, Record<string, unknown>>;
  const previousByName = new Map<string, ServiceConfig>();
  current.services.forEach((service) => {
    previousByName.set(service.name, service);
  });

  const groupIds = new Map<string, string>();
  const baseNameToGroupId = new Map<string, string>();
  current.services.forEach((service) => {
    const baseName = service.serviceId || service.name.replace(/-\d+$/, "");
    if (!baseNameToGroupId.has(baseName)) {
      baseNameToGroupId.set(baseName, service.groupId);
    }
  });
  const nextServices: ServiceConfig[] = [];

  Object.entries(servicesMap).forEach(([serviceName, value]) => {
    const serviceBody = value || {};
    const image = typeof serviceBody.image === "string" ? serviceBody.image : "";
    const imageParts = image.split(":");
    const imageName = imageParts[0] || "";
    const version = imageParts.length > 1 ? imageParts.slice(1).join(":") : "latest";
    const baseName = serviceName.replace(/-\d+$/, "");
    const catalogService = imageName
      ? findServiceByImage(catalog, imageName)
      : findServiceById(catalog, baseName);
    const serviceKey = catalogService?.id || baseName || serviceName;
    const existingGroupId = baseNameToGroupId.get(serviceKey);
    const groupId = groupIds.get(serviceKey) || existingGroupId || crypto.randomUUID();
    groupIds.set(serviceKey, groupId);
    const baseConfig = catalogService
      ? createServiceConfig(catalogService, { groupId, name: serviceName, version })
      : ({
          id: crypto.randomUUID(),
          groupId,
          serviceId: baseName || serviceName,
          name: serviceName,
          version,
          ports: [],
          volumes: [],
          env: [],
          networks: [],
          hostname: "",
          privileged: false,
          restart: "",
          command: "",
          entrypoint: "",
          extraHosts: [],
          dependsOn: [],
          extraYaml: "",
          applicationProperties: "",
        } as ServiceConfig);

    const environment = parseEnvironment(serviceBody.environment);
    const ports = parseStringArray(serviceBody.ports);
    const volumes = parseStringArray(serviceBody.volumes);
    const networks = parseNetworks(serviceBody.networks);
    const extraHosts = parseStringArray(serviceBody.extra_hosts);
    const dependsOn = parseStringArray(serviceBody.depends_on);

    const nextService: ServiceConfig = {
      ...baseConfig,
      ports,
      volumes,
      env: environment,
      networks,
      hostname: typeof serviceBody.hostname === "string" ? serviceBody.hostname : "",
      privileged: Boolean(serviceBody.privileged),
      restart: typeof serviceBody.restart === "string" ? serviceBody.restart : "",
      command: parseCommand(serviceBody.command),
      entrypoint: parseCommand(serviceBody.entrypoint),
      extraHosts,
      dependsOn,
      containerName:
        typeof serviceBody.container_name === "string" ? serviceBody.container_name : "",
    };

    const previous = previousByName.get(serviceName);
    if (previous?.applicationProperties) {
      nextService.applicationProperties = previous.applicationProperties;
    }

    nextServices.push(nextService);
  });

  const networks = parseNetworks(root.networks);
  const nextConfig = normalizeComposeConfig({
    ...current,
    networks,
    services: nextServices,
  });

  return { config: nextConfig, error: "" };
}
