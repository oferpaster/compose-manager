"use client";

import { ComposeConfig } from "@/lib/compose";

type NginxConfigSectionProps = {
  config: ComposeConfig;
  onFileUpload: (field: "cert" | "key" | "ca" | "config", file: File) => void;
  onUpdate: (field: "cert" | "key" | "ca" | "config", value: string) => void;
};

export default function NginxConfigSection({
  config,
  onFileUpload,
  onUpdate,
}: NginxConfigSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Nginx config</h2>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            optional
          </p>
        </div>
        <span className="text-sm text-slate-500">Toggle</span>
      </summary>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Certificate (.crt)</p>
            <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
              Upload
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileUpload("cert", file);
                }}
              />
            </label>
          </div>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={config.nginx?.cert || ""}
            onChange={(event) => onUpdate("cert", event.target.value)}
            placeholder="-----BEGIN CERTIFICATE-----"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Private key (.key)</p>
            <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
              Upload
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileUpload("key", file);
                }}
              />
            </label>
          </div>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={config.nginx?.key || ""}
            onChange={(event) => onUpdate("key", event.target.value)}
            placeholder="-----BEGIN PRIVATE KEY-----"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">CA bundle (.ca)</p>
            <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
              Upload
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileUpload("ca", file);
                }}
              />
            </label>
          </div>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={config.nginx?.ca || ""}
            onChange={(event) => onUpdate("ca", event.target.value)}
            placeholder="-----BEGIN CERTIFICATE-----"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">nginx.conf</p>
            <label className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
              Upload
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileUpload("config", file);
                }}
              />
            </label>
          </div>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={config.nginx?.config || ""}
            onChange={(event) => onUpdate("config", event.target.value)}
            placeholder="server { ... }"
          />
        </div>
      </div>
    </details>
  );
}
