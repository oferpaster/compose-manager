"use client";

import { useEffect } from "react";
import { KeyValue, ServiceConfig } from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

const emptyKeyValue = (): KeyValue => ({ key: "", value: "" });

type Props = {
  service: ServiceConfig;
  catalog: ServiceCatalogItem[];
  networks: string[];
  onChange: (service: ServiceConfig) => void;
  onRemove?: () => void;
  onLoadTemplate: (serviceId: string) => Promise<string>;
};

export default function ServiceInstanceEditor({
  service,
  catalog,
  networks,
  onChange,
  onRemove,
  onLoadTemplate,
}: Props) {
  const serviceInfo = catalog.find((item) => item.id === service.serviceId);

  const updateField = <Key extends keyof ServiceConfig>(key: Key, value: ServiceConfig[Key]) => {
    onChange({ ...service, [key]: value });
  };

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

  const updateList = (key: "ports" | "volumes" | "extraHosts" | "dependsOn", value: string) => {
    updateField(key, value.split("\n").map((item) => item.trim()).filter(Boolean));
  };

  const toggleServiceNetwork = (network: string) => {
    const exists = service.networks.includes(network);
    const next = exists
      ? service.networks.filter((item) => item !== network)
      : [...service.networks, network];
    updateField("networks", next);
  };

  useEffect(() => {
    if (serviceInfo?.springBoot && !service.applicationProperties) {
      onLoadTemplate(serviceInfo.id).then((template) => {
        if (template) updateField("applicationProperties", template);
      });
    }
  }, [serviceInfo, service.applicationProperties, onLoadTemplate]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <label className="text-sm text-slate-600">
        Depends on (one per line)
        <textarea
          className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          value={service.dependsOn.join("\n")}
          onChange={(event) => updateList("dependsOn", event.target.value)}
          placeholder="postgres"
        />
      </label>

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
