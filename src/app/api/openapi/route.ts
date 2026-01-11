import { NextResponse } from "next/server";

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ComposeBuilder API",
    version: "1.0.0",
    description:
      "API for managing projects, compose versions, templates, scripts, utilities, exports, snapshots, and image downloads.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Projects" },
    { name: "Composes" },
    { name: "Snapshots" },
    { name: "Images" },
    { name: "Templates" },
    { name: "Networks" },
    { name: "Scripts" },
    { name: "Utilities" },
    { name: "Catalog" },
  ],
  components: {
    schemas: {
      KeyValue: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
        },
      },
      NetworkConfig: {
        type: "object",
        properties: {
          name: { type: "string" },
          driver: { type: "string" },
        },
      },
      ServiceConfig: {
        type: "object",
        properties: {
          id: { type: "string" },
          groupId: { type: "string" },
          serviceId: { type: "string" },
          name: { type: "string" },
          version: { type: "string" },
          ports: { type: "array", items: { type: "string" } },
          volumes: { type: "array", items: { type: "string" } },
          env: { type: "array", items: { $ref: "#/components/schemas/KeyValue" } },
          envFile: { type: "array", items: { type: "string" } },
          networks: { type: "array", items: { type: "string" } },
          hostname: { type: "string" },
          privileged: { type: "boolean" },
          restart: { type: "string" },
          command: { type: "string" },
          entrypoint: { type: "string" },
          extraHosts: { type: "array", items: { type: "string" } },
          user: { type: "string" },
          pid: { type: "string" },
          networkMode: { type: "string" },
          capAdd: { type: "array", items: { type: "string" } },
          logging: { type: "string" },
          containerName: { type: "string" },
          dependsOn: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                condition: { type: "string" },
              },
            },
          },
          extraYaml: { type: "string" },
          healthcheck: {
            type: "object",
            properties: {
              test: { type: "string" },
              interval: { type: "string" },
              timeout: { type: "string" },
              retries: { type: "integer" },
              startPeriod: { type: "string" },
            },
          },
          applicationProperties: { type: "string" },
          prometheusEnabled: { type: "boolean" },
          prometheusPort: { type: "string" },
          prometheusMetricsPath: { type: "string" },
          prometheusScrapeInterval: { type: "string" },
        },
      },
      ComposeConfig: {
        type: "object",
        properties: {
          id: { type: "string" },
          projectId: { type: "string" },
          name: { type: "string" },
          globalEnv: { type: "array", items: { $ref: "#/components/schemas/KeyValue" } },
          networks: { type: "array", items: { type: "string" } },
          services: { type: "array", items: { $ref: "#/components/schemas/ServiceConfig" } },
          scriptIds: { type: "array", items: { type: "string" } },
          utilityIds: { type: "array", items: { type: "string" } },
          nginx: {
            type: "object",
            properties: {
              config: { type: "string" },
              cert: { type: "string" },
              key: { type: "string" },
              ca: { type: "string" },
            },
          },
          prometheus: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              configYaml: { type: "string" },
            },
          },
          loggingTemplate: { type: "string" },
        },
      },
      ExportOptions: {
        type: "object",
        properties: {
          includeCompose: { type: "boolean" },
          includeConfigs: { type: "boolean" },
          includeScripts: { type: "boolean" },
          includeUtilities: { type: "boolean" },
          imageDownloadIds: { type: "array", items: { type: "string" } },
        },
      },
      ImageOption: {
        type: "object",
        properties: {
          image: { type: "string" },
          version: { type: "string" },
          services: { type: "array", items: { type: "string" } },
        },
      },
      ImageDownload: {
        type: "object",
        properties: {
          id: { type: "string" },
          fileName: { type: "string" },
          status: { type: "string" },
          errorMessage: { type: "string" },
          createdAt: { type: "string" },
          images: { type: "array", items: { $ref: "#/components/schemas/ImageOption" } },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      ProjectCapabilities: {
        type: "object",
        properties: {
          imageDownloads: { type: "boolean" },
        },
      },
      ComposeRow: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          project_id: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      Snapshot: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          file_name: { type: "string" },
          created_at: { type: "string" },
        },
      },
      Script: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          file_name: { type: "string" },
          description: { type: "string" },
          usage: { type: "string" },
          content: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      Utility: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          file_name: { type: "string" },
          file_path: { type: "string" },
          created_at: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      ServiceCatalogItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          image: { type: "string" },
          versions: { type: "array", items: { type: "string" } },
          defaultPorts: { type: "array", items: { type: "string" } },
          defaultVolumes: { type: "array", items: { type: "string" } },
          defaultEnv: { type: "object", additionalProperties: { type: "string" } },
          defaultEnvFile: { type: "array", items: { type: "string" } },
          defaultContainerName: { type: "string" },
          defaultNetworks: { type: "array", items: { type: "string" } },
          defaultRestart: { type: "string" },
          defaultPrivileged: { type: "boolean" },
          defaultPid: { type: "string" },
          defaultUser: { type: "string" },
          defaultHostname: { type: "string" },
          defaultCommand: { type: "string" },
          defaultEntrypoint: { type: "string" },
          defaultNetworkMode: { type: "string" },
          defaultCapAdd: { type: "array", items: { type: "string" } },
          defaultLogging: { type: "string" },
          defaultPrometheusEnabled: { type: "boolean" },
          defaultPrometheusPort: { type: "string" },
          defaultPrometheusMetricsPath: { type: "string" },
          defaultPrometheusScrapeInterval: { type: "string" },
          defaultHealthcheckTest: { type: "string" },
          defaultHealthcheckInterval: { type: "string" },
          defaultHealthcheckTimeout: { type: "string" },
          defaultHealthcheckRetries: { type: "integer" },
          defaultHealthcheckStartPeriod: { type: "string" },
          defaultDependsOn: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                condition: { type: "string" },
              },
            },
          },
          springBoot: { type: "boolean" },
          propertiesTemplateFile: { type: "string" },
          applicationPropertiesTemplate: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        responses: {
          "200": {
            description: "Projects list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    projects: { type: "array", items: { $ref: "#/components/schemas/Project" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create project",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Created project",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project and versions",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Project + compose list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    project: { $ref: "#/components/schemas/Project" },
                    composes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ComposeRow" },
                    },
                    capabilities: {
                      $ref: "#/components/schemas/ProjectCapabilities",
                    },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete project and composes",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: { type: "object", properties: { ok: { type: "boolean" } } },
              },
            },
          },
        },
      },
    },
    "/api/composes": {
      get: {
        tags: ["Composes"],
        summary: "List compose versions",
        responses: {
          "200": {
            description: "Compose list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    composes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ComposeRow" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Composes"],
        summary: "Create compose version",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  projectId: { type: "string" },
                  config: { $ref: "#/components/schemas/ComposeConfig" },
                },
                required: ["projectId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Created compose",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    config: { $ref: "#/components/schemas/ComposeConfig" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/composes/{id}": {
      get: {
        tags: ["Composes"],
        summary: "Get compose config",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Compose config",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { config: { $ref: "#/components/schemas/ComposeConfig" } },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Composes"],
        summary: "Update compose config",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  config: { $ref: "#/components/schemas/ComposeConfig" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Composes"],
        summary: "Delete compose",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/api/composes/{id}/export": {
      get: {
        tags: ["Composes"],
        summary: "Export compose bundle (default options)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "ZIP export",
            content: { "application/zip": { schema: { type: "string", format: "binary" } } },
          },
        },
      },
      post: {
        tags: ["Composes"],
        summary: "Export compose bundle with options",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ExportOptions" } } },
        },
        responses: {
          "200": {
            description: "ZIP export",
            content: { "application/zip": { schema: { type: "string", format: "binary" } } },
          },
        },
      },
    },
    "/api/composes/{id}/snapshots": {
      get: {
        tags: ["Snapshots"],
        summary: "List snapshots",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Snapshots list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    snapshots: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Snapshot" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Snapshots"],
        summary: "Create snapshot",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  options: { $ref: "#/components/schemas/ExportOptions" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Created snapshot",
            content: {
              "application/json": {
                schema: { type: "object", properties: { snapshot: { $ref: "#/components/schemas/Snapshot" } } },
              },
            },
          },
        },
      },
    },
    "/api/composes/{id}/snapshots/{snapshotId}": {
      get: {
        tags: ["Snapshots"],
        summary: "Download snapshot",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "snapshotId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Snapshot ZIP",
            content: { "application/zip": { schema: { type: "string", format: "binary" } } },
          },
        },
      },
      delete: {
        tags: ["Snapshots"],
        summary: "Delete snapshot",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "snapshotId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/api/composes/{id}/images": {
      get: {
        tags: ["Images"],
        summary: "List available images and download requests",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Images and downloads",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    images: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ImageOption" },
                    },
                    downloads: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ImageDownload" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Images"],
        summary: "Download selected images into a tar archive",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { images: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Download created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    download: { $ref: "#/components/schemas/ImageDownload" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/composes/{id}/images/{downloadId}": {
      get: {
        tags: ["Images"],
        summary: "Download image archive",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "downloadId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Tar archive",
            content: {
              "application/x-tar": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Images"],
        summary: "Delete image download",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "downloadId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/api/templates/{serviceId}": {
      get: {
        tags: ["Templates"],
        summary: "Get application.properties template for a service",
        parameters: [
          { name: "serviceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Template content",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { template: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/templates/versions/status": {
      get: {
        tags: ["Templates"],
        summary: "Check if registry version refresh is enabled",
        responses: {
          "200": {
            description: "Registry status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { enabled: { type: "boolean" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/templates/versions/refresh": {
      post: {
        tags: ["Templates"],
        summary: "Refresh versions for all templates",
        responses: {
          "200": {
            description: "Refresh results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    updated: { type: "boolean" },
                    services: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ServiceCatalogItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/templates/{serviceId}/versions/refresh": {
      post: {
        tags: ["Templates"],
        summary: "Refresh versions for one template",
        parameters: [
          { name: "serviceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Refresh results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    updated: { type: "boolean" },
                    service: { $ref: "#/components/schemas/ServiceCatalogItem" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/catalog": {
      get: {
        tags: ["Catalog"],
        summary: "Get catalog + networks",
        responses: {
          "200": {
            description: "Catalog data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    services: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ServiceCatalogItem" },
                    },
                    networks: {
                      type: "array",
                      items: { $ref: "#/components/schemas/NetworkConfig" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/catalog-config": {
      get: {
        tags: ["Catalog"],
        summary: "Get service catalog",
        responses: {
          "200": {
            description: "Catalog list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    services: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ServiceCatalogItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Catalog"],
        summary: "Replace service catalog",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  services: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ServiceCatalogItem" },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Saved" } },
      },
    },
    "/api/networks": {
      get: {
        tags: ["Networks"],
        summary: "Get networks",
        responses: {
          "200": {
            description: "Networks list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    networks: {
                      type: "array",
                      items: { $ref: "#/components/schemas/NetworkConfig" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Networks"],
        summary: "Replace networks",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  networks: {
                    type: "array",
                    items: { $ref: "#/components/schemas/NetworkConfig" },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Saved" } },
      },
    },
    "/api/scripts": {
      get: {
        tags: ["Scripts"],
        summary: "List scripts",
        responses: {
          "200": {
            description: "Scripts list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    scripts: { type: "array", items: { $ref: "#/components/schemas/Script" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Scripts"],
        summary: "Create script",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  fileName: { type: "string" },
                  description: { type: "string" },
                  usage: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created" } },
      },
    },
    "/api/scripts/{id}": {
      get: {
        tags: ["Scripts"],
        summary: "Get script",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Script",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { script: { $ref: "#/components/schemas/Script" } },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Scripts"],
        summary: "Update script",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  fileName: { type: "string" },
                  description: { type: "string" },
                  usage: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Scripts"],
        summary: "Delete script",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/api/utilities": {
      get: {
        tags: ["Utilities"],
        summary: "List utilities",
        responses: {
          "200": {
            description: "Utilities list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    utilities: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Utility" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Utilities"],
        summary: "Create utility (file upload)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  name: { type: "string" },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: { "200": { description: "Created" } },
      },
    },
    "/api/utilities/{id}": {
      get: {
        tags: ["Utilities"],
        summary: "Get utility",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Utility",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { utility: { $ref: "#/components/schemas/Utility" } },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Utilities"],
        summary: "Update utility (file upload optional)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Utilities"],
        summary: "Delete utility",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/api/utilities/{id}/download": {
      get: {
        tags: ["Utilities"],
        summary: "Download utility file",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Utility file",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
