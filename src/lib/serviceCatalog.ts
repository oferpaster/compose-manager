export type ServiceCatalogItem = {
  id: string;
  name: string;
  description: string;
  image: string;
  versions: string[];
  defaultPorts?: string[];
  defaultVolumes?: string[];
  defaultEnv?: Record<string, string>;
  defaultEnvFile?: string[];
  defaultContainerName?: string;
  defaultNetworks?: string[];
  defaultRestart?: string;
  defaultPrivileged?: boolean;
  defaultPid?: string;
  defaultUser?: string;
  defaultHostname?: string;
  defaultCommand?: string;
  defaultEntrypoint?: string;
  defaultNetworkMode?: string;
  defaultCapAdd?: string[];
  defaultLogging?: string;
  defaultHealthcheckTest?: string;
  defaultHealthcheckInterval?: string;
  defaultHealthcheckTimeout?: string;
  defaultHealthcheckRetries?: number;
  defaultHealthcheckStartPeriod?: string;
  springBoot?: boolean;
  propertiesTemplateFile?: string;
  applicationPropertiesTemplate?: string;
};

export const SERVICE_CATALOG: ServiceCatalogItem[] = [];

export function findServiceById(serviceId: string) {
  return SERVICE_CATALOG.find((service) => service.id === serviceId) || null;
}

export function findServiceByImage(image: string) {
  return SERVICE_CATALOG.find((service) => service.image === image) || null;
}
