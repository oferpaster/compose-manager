"use client";

import { useCallback, useEffect } from "react";
import { KeyValue, ServiceConfig } from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

const emptyKeyValue = (): KeyValue => ({ key: "", value: "" });

type Props = {
  service: ServiceConfig;
  catalog: ServiceCatalogItem[];
  networks: string[];
  availableServiceNames?: string[];
  onChange: (service: ServiceConfig) => void;
  onRemove?: () => void;
  onLoadTemplate: (serviceId: string) => Promise<string>;
  splitColumns?: boolean;
};

export default function ServiceInstanceEditor({
  service,
  catalog,
  networks,
  availableServiceNames,
  onChange,
  onRemove,
  onLoadTemplate,
  splitColumns = false,
}: Props) {
  const serviceInfo = catalog.find((item) => item.id === service.serviceId);
  const availableNames = Array.from(new Set(availableServiceNames || []));

  const updateField = useCallback(
    <Key extends keyof ServiceConfig>(key: Key, value: ServiceConfig[Key]) => {
      onChange({ ...service, [key]: value });
    },
    [onChange, service]
  );

  const updateEnv = (index: number, next: KeyValue) => {
    const env = service.env.map((entry, idx) => (idx === index ? next : entry));
    updateField("env", env);
  };

  const addEnv = () => updateField("env", [...service.env, emptyKeyValue()]);
  const removeEnv = (index: number) =>
    updateField(
      "env",
      service.env.filter((_, idx) => idx !== index)
    );

  const updateList = (
    key: "ports" | "volumes" | "extraHosts" | "envFile" | "capAdd",
    value: string
  ) => {
    updateField(key, value.split("\n").map((item) => item.trim()).filter(Boolean));
  };

  const toggleServiceNetwork = (network: string) => {
    const exists = service.networks.includes(network);
    const next = exists
      ? service.networks.filter((item) => item !== network)
      : [...service.networks, network];
    updateField("networks", next);
  };

  const updateHealthcheck = <K extends keyof ServiceConfig["healthcheck"]>(
    key: K,
    value: ServiceConfig["healthcheck"][K]
  ) => {
    const current = service.healthcheck || {
      test: "",
      interval: "",
      timeout: "",
      retries: null,
      startPeriod: "",
    };
    updateField("healthcheck", { ...current, [key]: value });
  };

  useEffect(() => {
    if (serviceInfo?.springBoot && !service.applicationProperties) {
      onLoadTemplate(serviceInfo.id).then((template) => {
        if (template) updateField("applicationProperties", template);
      });
    }
  }, [serviceInfo, service.applicationProperties, onLoadTemplate, updateField]);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
        splitColumns ? "space-y-4 lg:columns-2 lg:[column-gap:1.5rem]" : "space-y-4"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Instance</p>
          <h3 className="text-lg font-semibold text-slate-900">
            {serviceInfo?.name || service.serviceId}
          </h3>
          <p className="text-sm text-slate-500">Service name: {service.name}</p>
        </div>
        {onRemove ? (
          <button
            onClick={onRemove}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Service name
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="udp-listener-1"
          />
        </label>
        <label className="text-sm text-slate-600">
          Container name
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.containerName || ""}
            onChange={(event) => updateField("containerName", event.target.value)}
            placeholder="udp-listener-1"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Version
          <select
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.version}
            onChange={(event) => updateField("version", event.target.value)}
          >
            {serviceInfo?.versions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Restart policy
          <select
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.restart || ""}
            onChange={(event) => updateField("restart", event.target.value)}
          >
            <option value="">Default</option>
            <option value="no">No</option>
            <option value="always">Always</option>
            <option value="on-failure">On failure</option>
            <option value="unless-stopped">Unless stopped</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Privileged
          <select
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.privileged ? "yes" : "no"}
            onChange={(event) => updateField("privileged", event.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Ports (one per line)
          <textarea
            className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.ports.join("\n")}
            onChange={(event) => updateList("ports", event.target.value)}
            placeholder="8080:8080"
          />
        </label>
        <label className="text-sm text-slate-600">
          Volumes (one per line)
          <textarea
            className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.volumes.join("\n")}
            onChange={(event) => updateList("volumes", event.target.value)}
            placeholder="./data:/var/lib/app"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          env_file (one per line)
          <textarea
            className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.envFile.join("\n")}
            onChange={(event) => updateList("envFile", event.target.value)}
            placeholder="./app.env"
          />
        </label>
        <label className="text-sm text-slate-600">
          network_mode
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.networkMode || ""}
            onChange={(event) => updateField("networkMode", event.target.value)}
            placeholder="host"
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-700">
              Prometheus metrics
            </h4>
            <p className="text-xs text-slate-500">
              Configure scrape job for this service.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(service.prometheusEnabled)}
              onChange={(event) =>
                updateField("prometheusEnabled", event.target.checked)
              }
            />
            Enable
          </label>
        </div>
        {service.prometheusEnabled ? (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Metrics port
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.prometheusPort || ""}
                onChange={(event) => updateField("prometheusPort", event.target.value)}
                placeholder="8080"
              />
            </label>
            <label className="text-sm text-slate-600">
              Metrics path
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.prometheusMetricsPath || ""}
                onChange={(event) =>
                  updateField("prometheusMetricsPath", event.target.value)
                }
                placeholder={serviceInfo?.springBoot ? "/actuator/metrics" : "/metrics"}
              />
            </label>
            <label className="text-sm text-slate-600">
              Scrape interval
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={service.prometheusScrapeInterval || ""}
                onChange={(event) =>
                  updateField("prometheusScrapeInterval", event.target.value)
                }
                placeholder="5s"
              />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Job preview
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-mono text-slate-700"
                value={`- job_name: '${service.name}'\n  metrics_path: '${
                  service.prometheusMetricsPath ||
                  (serviceInfo?.springBoot ? "/actuator/metrics" : "")
                }'\n  scrape_interval: '${
                  service.prometheusScrapeInterval ||
                  (serviceInfo?.springBoot ? "5s" : "")
                }'\n  static_configs:\n    - targets: ['${service.name}:${
                  service.prometheusPort || "PORT"
                }']`}
                readOnly
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          cap_add (one per line)
          <textarea
            className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.capAdd.join("\n")}
            onChange={(event) => updateList("capAdd", event.target.value)}
            placeholder="NET_ADMIN"
          />
        </label>
        <label className="text-sm text-slate-600">
          logging (YAML)
          <textarea
            className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={service.logging || ""}
            onChange={(event) => updateField("logging", event.target.value)}
            placeholder={`driver: local\\noptions:\\n  max-size: \"10m\"`}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          healthcheck test
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.healthcheck?.test || ""}
            onChange={(event) => updateHealthcheck("test", event.target.value)}
            placeholder="CMD-SHELL curl -f http://localhost:8080/health || exit 1"
          />
        </label>
        <label className="text-sm text-slate-600">
          healthcheck interval
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.healthcheck?.interval || ""}
            onChange={(event) => updateHealthcheck("interval", event.target.value)}
            placeholder="30s"
          />
        </label>
        <label className="text-sm text-slate-600">
          healthcheck timeout
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.healthcheck?.timeout || ""}
            onChange={(event) => updateHealthcheck("timeout", event.target.value)}
            placeholder="10s"
          />
        </label>
        <label className="text-sm text-slate-600">
          healthcheck retries
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            type="number"
            value={service.healthcheck?.retries ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              updateHealthcheck("retries", raw === "" ? null : Number(raw));
            }}
            placeholder="3"
          />
        </label>
        <label className="text-sm text-slate-600">
          healthcheck start_period
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.healthcheck?.startPeriod || ""}
            onChange={(event) => updateHealthcheck("startPeriod", event.target.value)}
            placeholder="30s"
          />
        </label>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Environment (service)</h4>
        {service.env.map((entry, index) => (
          <div key={`service-env-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={entry.key}
              onChange={(event) => updateEnv(index, { ...entry, key: event.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="KEY"
            />
            <input
              value={entry.value}
              onChange={(event) => updateEnv(index, { ...entry, value: event.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="value"
            />
            <button
              onClick={() => removeEnv(index)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={addEnv}
          className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          + Add env
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Networks</h4>
        <div className="flex flex-wrap gap-2">
          {networks.map((network) => (
            <button
              key={`${service.id}-${network}`}
              onClick={() => toggleServiceNetwork(network)}
              className={`rounded-full border px-3 py-1 text-sm ${
                service.networks.includes(network)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {network}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Hostname
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.hostname || ""}
            onChange={(event) => updateField("hostname", event.target.value)}
            placeholder="optional"
          />
        </label>
        <label className="text-sm text-slate-600">
          User
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.user || ""}
            onChange={(event) => updateField("user", event.target.value)}
            placeholder="1000:1000"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          PID mode
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.pid || ""}
            onChange={(event) => updateField("pid", event.target.value)}
            placeholder="host"
          />
        </label>
        <label className="text-sm text-slate-600">
          Command
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.command || ""}
            onChange={(event) => updateField("command", event.target.value)}
            placeholder="./start.sh"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Entrypoint
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.entrypoint || ""}
            onChange={(event) => updateField("entrypoint", event.target.value)}
            placeholder="/bin/app"
          />
        </label>
        <label className="text-sm text-slate-600">
          Extra hosts (one per line)
          <textarea
            className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={service.extraHosts.join("\n")}
            onChange={(event) => updateList("extraHosts", event.target.value)}
            placeholder="host.docker.internal:host-gateway"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Depends on</h4>
          <button
            onClick={() =>
              updateField("dependsOn", [
                ...service.dependsOn,
                { name: "", condition: "service_started" },
              ])
            }
            className="rounded-lg border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-600"
          >
            + Add dependency
          </button>
        </div>
        {service.dependsOn.length === 0 ? (
          <p className="text-sm text-slate-500">No dependencies added.</p>
        ) : (
          service.dependsOn.map((entry, index) => (
            <div key={`depends-${index}`} className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={entry.name}
                onChange={(event) => {
                  const next = [...service.dependsOn];
                  next[index] = { ...entry, name: event.target.value };
                  updateField("dependsOn", next);
                }}
              >
                <option value="">Select service</option>
                {availableNames
                  .filter((name) => name !== service.name)
                  .filter(
                    (name) =>
                      name === entry.name ||
                      !service.dependsOn.some(
                        (item, idx) => idx !== index && item.name === name
                      )
                  )
                  .map((name) => (
                    <option key={`dep-${service.id}-${index}-${name}`} value={name}>
                      {name}
                    </option>
                  ))}
              </select>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={entry.condition}
                onChange={(event) => {
                  const next = [...service.dependsOn];
                  next[index] = { ...entry, condition: event.target.value };
                  updateField("dependsOn", next);
                }}
              >
                <option value="">No condition</option>
                <option value="service_started">Service started</option>
                <option value="service_healthy">Service healthy</option>
                <option value="service_completed_successfully">
                  Service completed successfully
                </option>
              </select>
              <button
                onClick={() => {
                  const next = service.dependsOn.filter((_, idx) => idx !== index);
                  updateField("dependsOn", next);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <label className="text-sm text-slate-600">
        Extra YAML (service)
        <textarea
          className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
          value={service.extraYaml}
          onChange={(event) => updateField("extraYaml", event.target.value)}
          placeholder="healthcheck:\n  test: ['CMD', 'curl', '-f', 'http://localhost:8080/actuator/health']"
        />
      </label>

      {serviceInfo?.springBoot ? (
        <label className="text-sm text-slate-600">
          application.properties
          <textarea
            className="mt-2 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={service.applicationProperties || ""}
            onChange={(event) => updateField("applicationProperties", event.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}
