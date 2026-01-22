"use client";

type ValidationSummary = {
  missing: string[];
  unused: string[];
};

type EnvValidationModalProps = {
  open: boolean;
  onClose: () => void;
  validation: ValidationSummary;
  missingEnvSearch: string;
  unusedEnvSearch: string;
  missingEnvValues: Record<string, string>;
  setMissingEnvSearch: (value: string) => void;
  setUnusedEnvSearch: (value: string) => void;
  setMissingEnvValues: (
    updater: (prev: Record<string, string>) => Record<string, string>
  ) => void;
  addMissingEnv: (key: string) => void;
  removeUnusedEnv: (key: string) => void;
};

export default function EnvValidationModal({
  open,
  onClose,
  validation,
  missingEnvSearch,
  unusedEnvSearch,
  missingEnvValues,
  setMissingEnvSearch,
  setUnusedEnvSearch,
  setMissingEnvValues,
  addMissingEnv,
  removeUnusedEnv,
}: EnvValidationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Environment Check
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex-1 space-y-6 overflow-auto">
          <div>
            <p className="text-sm font-semibold text-slate-700">Missing envs</p>
            {validation.missing.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">None</p>
            ) : (
              <div className="mt-2 space-y-3 text-sm text-rose-600">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  placeholder="Search missing envs..."
                  value={missingEnvSearch}
                  onChange={(event) => setMissingEnvSearch(event.target.value)}
                />
                <div className="space-y-2">
                  {validation.missing
                    .filter((key) =>
                      key
                        .toLowerCase()
                        .includes(missingEnvSearch.trim().toLowerCase())
                    )
                    .map((key) => (
                      <div
                        key={`missing-${key}`}
                        className="grid items-center gap-2 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <span className="font-semibold text-rose-600">
                          {key}
                        </span>
                        <input
                          value={missingEnvValues[key] ?? ""}
                          onChange={(event) =>
                            setMissingEnvValues((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          placeholder="value"
                        />
                        <button
                          onClick={() => addMissingEnv(key)}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Unused envs</p>
            {validation.unused.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">None</p>
            ) : (
              <div className="mt-2 space-y-3 text-sm text-slate-600">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  placeholder="Search unused envs..."
                  value={unusedEnvSearch}
                  onChange={(event) => setUnusedEnvSearch(event.target.value)}
                />
                <div className="space-y-2">
                  {validation.unused
                    .filter((key) =>
                      key
                        .toLowerCase()
                        .includes(unusedEnvSearch.trim().toLowerCase())
                    )
                    .map((key) => (
                      <div
                        key={`unused-${key}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold">{key}</span>
                        <button
                          onClick={() => removeUnusedEnv(key)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Checks ${"{VAR}"} and ${"{VAR:default}"} in compose, .env, and
          application.properties.
        </p>
      </div>
    </div>
  );
}
