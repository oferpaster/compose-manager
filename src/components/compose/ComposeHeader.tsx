"use client";

import { ComposeConfig } from "@/lib/compose";

type ValidationSummary = {
  missing: string[];
  unused: string[];
};

type ComposeHeaderProps = {
  config: ComposeConfig;
  isPlayground: boolean;
  isSaving: boolean;
  validation: ValidationSummary;
  onReset: () => void;
  onOpenValidation: () => void;
  onOpenDependencies: () => void;
  onSave: () => void;
  onChangeName: (name: string) => void;
};

export default function ComposeHeader({
  config,
  isPlayground,
  isSaving,
  validation,
  onReset,
  onOpenValidation,
  onOpenDependencies,
  onSave,
  onChangeName,
}: ComposeHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-500">
            Compose
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Edit compose</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={
              config.projectId && config.environmentId
                ? `/projects/${config.projectId}/environments/${config.environmentId}`
                : config.projectId
                  ? `/projects/${config.projectId}/environments`
                  : "/"
            }
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
          >
            ← Back
          </a>
          {isPlayground ? (
            <button
              onClick={onReset}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
            >
              Reset
            </button>
          ) : null}
          <button
            onClick={onOpenValidation}
            className="cursor-pointer rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700"
          >
            Env Check
          </button>
          <button
            onClick={onOpenDependencies}
            className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
          >
            Dependencies
          </button>
          {!isPlayground ? (
            <button
              onClick={onSave}
              className="compose-save-button border border-slate-200 cursor-pointer rounded-full border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow"
              disabled={isSaving}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 inline-block h-4 w-4"
                fill="currentColor"
              >
                <path d="M5 3h12l4 4v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 2v6h10V5H7zm0 10v6h10v-6H7z" />
              </svg>
              {isSaving ? "Saving..." : "Save"}
            </button>
          ) : null}
        </div>
      </div>

      {(validation.missing.length > 0 || validation.unused.length > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {validation.missing.length > 0 ? (
            <p>
              Missing envs: {validation.missing.slice(0, 5).join(", ")}
              {validation.missing.length > 5 ? "…" : ""}
            </p>
          ) : null}
          {validation.unused.length > 0 ? (
            <p className={validation.missing.length > 0 ? "mt-1" : ""}>
              Unused envs: {validation.unused.slice(0, 5).join(", ")}
              {validation.unused.length > 5 ? "…" : ""}
            </p>
          ) : null}
        </section>
      )}

      <label className="block text-sm font-medium text-slate-700">
        Compose name
        <input
          value={config.name}
          onChange={(event) => onChangeName(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          placeholder="e.g. core-services"
        />
      </label>
    </div>
  );
}
