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
    { name: "Environments" },
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
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
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
          environmentId: { type: "string" },
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
      Environment: {
        type: "object",
        properties: {
          id: { type: "string" },
          project_id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      ComposeRow: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          project_id: { type: "string" },
          environment_id: { type: "string" },
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
          created_at: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      ScriptListItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          file_name: { type: "string" },
          description: { type: "string" },
          usage: { type: "string" },
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
      UtilityDetail: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          file_name: { type: "string" },
          file_path: { type: "string" },
        },
      },
      UtilityListItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          file_name: { type: "string" },
          updated_at: { type: "string" },
        },
      },
      ProjectSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
      ComposeSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
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
          "500": {
            description: "Failed to load projects",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to create project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project details",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Project details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    project: { $ref: "#/components/schemas/ProjectSummary" },
                    capabilities: {
                      $ref: "#/components/schemas/ProjectCapabilities",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Environment not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to load project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete project and environments",
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
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to delete project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/environments": {
      get: {
        tags: ["Environments"],
        summary: "List environments for a project",
        parameters: [
          { name: "projectId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Environment list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    project: { $ref: "#/components/schemas/ProjectSummary" },
                    environments: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Environment" },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing projectId",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Environments"],
        summary: "Create environment",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  projectId: { type: "string" },
                },
                required: ["projectId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Created environment",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing projectId",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/environments/{id}": {
      get: {
        tags: ["Environments"],
        summary: "Get environment details",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "projectId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Environment details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    project: { $ref: "#/components/schemas/ProjectSummary" },
                    environment: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                      },
                    },
                    composes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ComposeSummary" },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing projectId",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Environment not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Environments"],
        summary: "Delete environment and composes",
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
          "404": {
            description: "Environment not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "500": {
            description: "Failed to load composes",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
                  environmentId: { type: "string" },
                  config: { $ref: "#/components/schemas/ComposeConfig" },
                },
                required: ["projectId", "environmentId"],
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
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to create compose",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Updated" },
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Composes"],
        summary: "Delete compose",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Deleted" },
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "404": {
            description: "Snapshot not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
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
        responses: {
          "200": { description: "Deleted" },
          "404": {
            description: "Snapshot not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Compose not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Download failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "404": {
            description: "Download not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Deleted" },
          "404": {
            description: "Download not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
          "404": {
            description: "Template not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "500": {
            description: "Failed to check registry status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "400": {
            description: "Refresh not available",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to refresh versions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
                    service: {
                      $ref: "#/components/schemas/ServiceCatalogItem",
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Refresh not available",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Template not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to refresh versions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "500": {
            description: "Failed to load catalog",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "500": {
            description: "Failed to load catalog",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Saved" },
          "400": {
            description: "Invalid catalog payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to save catalog",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
          "500": {
            description: "Failed to load networks",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Saved" },
          "400": {
            description: "Invalid network payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to save networks",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
                    scripts: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ScriptListItem" },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Failed to load scripts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Created" },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to create script",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
          "404": {
            description: "Script not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to load script",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Updated" },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Script not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to update script",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Scripts"],
        summary: "Delete script",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Deleted" },
          "404": {
            description: "Script not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to delete script",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
                      items: { $ref: "#/components/schemas/UtilityListItem" },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Failed to load utilities",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Created" },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to create utility",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
                  properties: { utility: { $ref: "#/components/schemas/UtilityDetail" } },
                },
              },
            },
          },
          "404": {
            description: "Utility not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to load utility",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        responses: {
          "200": { description: "Updated" },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Utility not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to update utility",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Utilities"],
        summary: "Delete utility",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Deleted" },
          "404": {
            description: "Utility not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to delete utility",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
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
          "404": {
            description: "Utility not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to download utility",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
