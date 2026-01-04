import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { ServiceCatalogItem } from "./serviceCatalog";

export type KeyValue = {
  key: string;
  value: string;
};

export type HealthcheckConfig = {
  test: string;
  interval: string;
  timeout: string;
  retries: number | null;
  startPeriod: string;
};

export type NetworkDefinition = {
  name: string;
  driver?: string;
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
  envFile: string[];
  networks: string[];
  networkMode?: string;
  hostname?: string;
  pid?: string;
  user?: string;
  privileged?: boolean;
  restart?: string;
  command?: string;
  entrypoint?: string;
  capAdd: string[];
  logging: string;
  healthcheck: HealthcheckConfig;
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
  loggingTemplate?: string;
  nginx?: {
    cert?: string;
    key?: string;
    ca?: string;
    config?: string;
  };
};

const DEFAULT_LOGGING_TEMPLATE = `driver: local
options:
  max-size: "10m"
  max-file: "5"`;

export function createEmptyCompose(name: string): ComposeConfig {
  return {
    id: "",
    projectId: "",
    name,
    globalEnv: [],
    networks: ["backend"],
    services: [],
    scriptIds: [],
    loggingTemplate: DEFAULT_LOGGING_TEMPLATE,
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
  const loggingTemplate =
    typeof config.loggingTemplate === "string" && config.loggingTemplate.trim().length > 0
      ? config.loggingTemplate
      : DEFAULT_LOGGING_TEMPLATE;
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

    const baseService: ServiceConfig = {
      ...rest,
      id: rest.id || crypto.randomUUID(),
      groupId,
      name: rest.name || "",
      envFile: Array.isArray((rest as ServiceConfig).envFile)
        ? (rest as ServiceConfig).envFile
        : [],
      capAdd: Array.isArray((rest as ServiceConfig).capAdd) ? (rest as ServiceConfig).capAdd : [],
      logging: typeof (rest as ServiceConfig).logging === "string" ? (rest as ServiceConfig).logging : "",
      networkMode:
        typeof (rest as ServiceConfig).networkMode === "string"
          ? (rest as ServiceConfig).networkMode
          : "",
      pid:
        typeof (rest as ServiceConfig).pid === "string" ? (rest as ServiceConfig).pid : "",
      user:
        typeof (rest as ServiceConfig).user === "string" ? (rest as ServiceConfig).user : "",
      containerName:
        typeof (rest as ServiceConfig).containerName === "string"
          ? (rest as ServiceConfig).containerName
          : "",
      healthcheck: (rest as ServiceConfig).healthcheck || {
        test: "",
        interval: "",
        timeout: "",
        retries: null,
        startPeriod: "",
      },
    };

    if (count === 1) {
      let name = rest.name?.trim();
      if (!name || usedNames.has(name)) {
        name = allocateName(base);
      } else {
        usedNames.add(name);
      }
      services.push({ ...baseService, name });
      return;
    }

    for (let index = 0; index < count; index += 1) {
      const name = allocateName(base);
      services.push({
        ...baseService,
        id: crypto.randomUUID(),
        name,
      });
    }
  });

  return { ...config, globalEnv, networks, services, scriptIds, loggingTemplate, nginx };
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
    envFile: service.defaultEnvFile ? [...service.defaultEnvFile] : [],
    networks: service.defaultNetworks ? [...service.defaultNetworks] : [],
    networkMode: service.defaultNetworkMode || "",
    hostname: service.defaultHostname || "",
    pid: service.defaultPid || "",
    user: service.defaultUser || "",
    privileged: service.defaultPrivileged ?? false,
    restart: "",
    command: service.defaultCommand || "",
    entrypoint: service.defaultEntrypoint || "",
    capAdd: service.defaultCapAdd ? [...service.defaultCapAdd] : [],
    logging: service.defaultLogging || "",
    healthcheck: {
      test: service.defaultHealthcheckTest || "",
      interval: service.defaultHealthcheckInterval || "",
      timeout: service.defaultHealthcheckTimeout || "",
      retries:
        typeof service.defaultHealthcheckRetries === "number"
          ? service.defaultHealthcheckRetries
          : null,
      startPeriod: service.defaultHealthcheckStartPeriod || "",
    },
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

function parseYamlMap(text: string) {
  if (!text.trim()) return { value: undefined, error: "" };
  try {
    const parsed = yamlParse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { value: parsed as Record<string, unknown>, error: "" };
    }
    return { value: undefined, error: "YAML must be a map/object." };
  } catch (error) {
    return {
      value: undefined,
      error: error instanceof Error ? error.message : "Invalid YAML",
    };
  }
}

export function generateComposeObject(
  config: ComposeConfig,
  catalog: ServiceCatalogItem[],
  networkDefinitions: NetworkDefinition[] = []
) {
  const services: Record<string, Record<string, unknown>> = {};
  const usedNetworks = new Set<string>(config.networks);
  const networkMap = new Map<string, NetworkDefinition>(
    networkDefinitions.map((network) => [network.name, network])
  );
  const { value: loggingTemplate, error: loggingError } = parseYamlMap(
    config.loggingTemplate || ""
  );

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

    const { value: logging, error: loggingErrorLocal } = parseYamlMap(
      serviceConfig.logging || ""
    );

    const healthcheck: Record<string, unknown> = {};
    if (serviceConfig.healthcheck?.test?.trim()) {
      healthcheck.test = serviceConfig.healthcheck.test.trim();
    }
    if (serviceConfig.healthcheck?.interval?.trim()) {
      healthcheck.interval = serviceConfig.healthcheck.interval.trim();
    }
    if (serviceConfig.healthcheck?.timeout?.trim()) {
      healthcheck.timeout = serviceConfig.healthcheck.timeout.trim();
    }
    if (serviceConfig.healthcheck?.startPeriod?.trim()) {
      healthcheck.start_period = serviceConfig.healthcheck.startPeriod.trim();
    }
    if (typeof serviceConfig.healthcheck?.retries === "number") {
      healthcheck.retries = serviceConfig.healthcheck.retries;
    }

    const baseService: Record<string, unknown> = {
      image: `${service.image}:${imageTag}`,
      container_name: serviceConfig.containerName?.trim() || undefined,
      ports: serviceConfig.ports.length ? serviceConfig.ports : undefined,
      volumes: volumes.length ? volumes : undefined,
      environment: Object.keys(environment).length ? environment : undefined,
      env_file: serviceConfig.envFile.length ? serviceConfig.envFile : undefined,
      networks: serviceNetworks.length ? serviceNetworks : undefined,
      network_mode: serviceConfig.networkMode?.trim() || undefined,
      hostname: serviceConfig.hostname?.trim() || undefined,
      pid: serviceConfig.pid?.trim() || undefined,
      user: serviceConfig.user?.trim() || undefined,
      privileged: serviceConfig.privileged || undefined,
      restart: serviceConfig.restart?.trim() || undefined,
      command: serviceConfig.command?.trim() || undefined,
      entrypoint: serviceConfig.entrypoint?.trim() || undefined,
      cap_add: serviceConfig.capAdd.length ? serviceConfig.capAdd : undefined,
      logging: logging || undefined,
      healthcheck: Object.keys(healthcheck).length ? healthcheck : undefined,
      extra_hosts: serviceConfig.extraHosts.length ? serviceConfig.extraHosts : undefined,
      depends_on: serviceConfig.dependsOn.length ? serviceConfig.dependsOn : undefined,
    };

    const { merged, error } = mergeExtraYaml(baseService, serviceConfig.extraYaml);
    if (error) {
      merged["x-extra-yaml-error"] = error;
    }
    if (loggingErrorLocal) {
      merged["x-logging-error"] = loggingErrorLocal;
    }

    services[serviceName] = merged;
  });

  const networks: Record<string, Record<string, unknown>> = {};
  Array.from(usedNetworks).forEach((network) => {
    const definition = networkMap.get(network);
    networks[network] = definition?.driver ? { driver: definition.driver } : {};
  });

  const composeObject: Record<string, unknown> = {
    services,
    networks: Object.keys(networks).length ? networks : undefined,
  };
  if (loggingTemplate) {
    composeObject["x-logging"] = loggingTemplate;
  }
  if (loggingError) {
    composeObject["x-logging-error"] = loggingError;
  }
  return composeObject;
}

export function generateComposeYaml(
  config: ComposeConfig,
  catalog: ServiceCatalogItem[],
  networkDefinitions: NetworkDefinition[] = []
) {
  const composeObject = generateComposeObject(config, catalog, networkDefinitions);
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

function parseLoggingYaml(value: unknown) {
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

function parseHealthcheck(value: unknown): HealthcheckConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { test: "", interval: "", timeout: "", retries: null, startPeriod: "" };
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
        : null;
  return {
    test,
    interval: typeof health.interval === "string" ? health.interval : "",
    timeout: typeof health.timeout === "string" ? health.timeout : "",
    retries: Number.isFinite(retries as number) ? retries : null,
    startPeriod: typeof health.start_period === "string" ? health.start_period : "",
  };
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
          envFile: [],
          networks: [],
          networkMode: "",
          hostname: "",
          pid: "",
          user: "",
          privileged: false,
          restart: "",
          command: "",
          entrypoint: "",
          capAdd: [],
          logging: "",
          healthcheck: {
            test: "",
            interval: "",
            timeout: "",
            retries: null,
            startPeriod: "",
          },
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
    const envFile = parseStringArray(serviceBody.env_file);
    const capAdd = parseStringArray(serviceBody.cap_add);
    const healthcheck = parseHealthcheck(serviceBody.healthcheck);

    const nextService: ServiceConfig = {
      ...baseConfig,
      ports,
      volumes,
      env: environment,
      envFile,
      networks,
      networkMode:
        typeof serviceBody.network_mode === "string" ? serviceBody.network_mode : "",
      hostname: typeof serviceBody.hostname === "string" ? serviceBody.hostname : "",
      pid: typeof serviceBody.pid === "string" ? serviceBody.pid : "",
      user: typeof serviceBody.user === "string" ? serviceBody.user : "",
      privileged: Boolean(serviceBody.privileged),
      restart: typeof serviceBody.restart === "string" ? serviceBody.restart : "",
      command: parseCommand(serviceBody.command),
      entrypoint: parseCommand(serviceBody.entrypoint),
      capAdd,
      logging: parseLoggingYaml(serviceBody.logging),
      healthcheck,
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
  const loggingTemplate = parseLoggingYaml(root["x-logging"]);
  const nextConfig = normalizeComposeConfig({
    ...current,
    networks,
    services: nextServices,
    loggingTemplate: loggingTemplate || current.loggingTemplate,
  });

  return { config: nextConfig, error: "" };
}
