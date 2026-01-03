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

export const PREDEFINED_NETWORKS = [
  "frontend",
  "backend",
  "metrics",
  "edge",
  "debrif",
];

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    id: "postgres",
    name: "Postgres",
    description: "PostgreSQL database",
    image: "postgres",
    versions: ["16", "15", "14"],
    defaultPorts: ["5432:5432"],
    defaultEnv: {
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_DB: "app",
    },
    defaultVolumes: ["./data/postgres:/var/lib/postgresql/data"],
  },
  {
    id: "redis",
    name: "Redis",
    description: "In-memory cache",
    image: "redis",
    versions: ["7", "6"],
    defaultPorts: ["6379:6379"],
  },
  {
    id: "kafka",
    name: "Kafka",
    description: "Apache Kafka broker",
    image: "bitnami/kafka",
    versions: ["3.7", "3.6"],
    defaultPorts: ["9092:9092"],
  },
  {
    id: "udp-listener",
    name: "UDP Listener",
    description: "Lightweight UDP listener",
    image: "ghcr.io/example/udp-listener",
    versions: ["1.2.0", "1.1.0", "1.0.0"],
    defaultPorts: ["9000:9000/udp"],
  },
  {
    id: "user-service",
    name: "User Service",
    description: "Spring Boot service for user management",
    image: "ghcr.io/example/user-service",
    versions: ["2.1.0", "2.0.0"],
    defaultPorts: ["8081:8080"],
    springBoot: true,
    propertiesTemplateFile:
      "data/service-templates/user-service/application.properties",
  },
  {
    id: "billing-service",
    name: "Billing Service",
    description: "Spring Boot service for billing",
    image: "ghcr.io/example/billing-service",
    versions: ["1.4.0", "1.3.0"],
    defaultPorts: ["8082:8080"],
    springBoot: true,
    propertiesTemplateFile:
      "data/service-templates/billing-service/application.properties",
  },
  {
    id: "inventory-service",
    name: "Inventory Service",
    description: "Spring Boot service for inventory management",
    image: "ghcr.io/example/inventory-service",
    versions: ["1.0.0", "0.9.0"],
    defaultPorts: ["8083:8080"],
    springBoot: true,
    propertiesTemplateFile:
      "data/service-templates/inventory-service/application.properties",
  },
];

export function findServiceById(serviceId: string) {
  return SERVICE_CATALOG.find((service) => service.id === serviceId) || null;
}

export function findServiceByImage(image: string) {
  return SERVICE_CATALOG.find((service) => service.image === image) || null;
}
