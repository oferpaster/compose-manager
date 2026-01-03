export type ServiceCatalogItem = {
  id: string;
  name: string;
  description: string;
  image: string;
  versions: string[];
  defaultPorts?: string[];
  defaultVolumes?: string[];
  defaultEnv?: Record<string, string>;
  defaultContainerName?: string;
  defaultNetworks?: string[];
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
