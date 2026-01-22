"use client";

import { ComposeConfig } from "@/lib/compose";

type PrometheusSectionProps = {
  config: ComposeConfig;
  prometheusAuto: boolean;
  prometheusDraft: string;
  prometheusDraftDirty: boolean;
  prometheusYaml: string;
  onToggleAuto: (next: boolean) => void;
  onDraftChange: (value: string) => void;
  onDraftDirtyChange: (next: boolean) => void;
  onRegenerate: () => void;
  onUpdate: (field: "enabled" | "configYaml", value: boolean | string) => void;
};

export default function PrometheusSection({
  config,
  prometheusAuto,
  prometheusDraft,
  prometheusDraftDirty,
  prometheusYaml,
  onToggleAuto,
  onDraftChange,
  onDraftDirtyChange,
  onRegenerate,
  onUpdate,
}: PrometheusSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Prometheus</h2>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            optional
          </p>
        </div>
        <span className="text-sm text-slate-500">Toggle</span>
      </summary>
      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(config.prometheus?.enabled)}
            onChange={(event) => onUpdate("enabled", event.target.checked)}
          />
          Enable Prometheus export
        </label>
        {config.prometheus?.enabled ? (
          <label className="text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <span>prometheus.yml</span>
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
                <input
                  type="checkbox"
                  checked={prometheusAuto}
                  onChange={(event) => {
                    const next = event.target.checked;
                    onToggleAuto(next);
                    if (next) {
                      onDraftDirtyChange(false);
                      onDraftChange(prometheusYaml);
                      onUpdate("configYaml", "");
                    }
                  }}
                />
                Auto-generate
              </label>
              {prometheusAuto ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                  Auto
                </span>
              ) : null}
              <button
                type="button"
                onClick={onRegenerate}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
              >
                Regenerate
              </button>
            </div>
            <textarea
              className="prometheus-textarea mt-2 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              value={prometheusDraft || prometheusYaml}
              onChange={(event) => {
                onDraftChange(event.target.value);
                onDraftDirtyChange(true);
                onUpdate("configYaml", event.target.value);
              }}
              onFocus={() => {
                if (
                  !prometheusDraftDirty &&
                  !config.prometheus?.configYaml?.trim()
                ) {
                  onDraftChange(prometheusYaml);
                }
              }}
              disabled={prometheusAuto}
            />
            {prometheusAuto ? (
              <p className="mt-2 text-xs text-slate-500">
                Auto-generated from services marked for Prometheus. Disable auto
                to edit.
              </p>
            ) : null}
          </label>
        ) : null}
      </div>
    </details>
  );
}
