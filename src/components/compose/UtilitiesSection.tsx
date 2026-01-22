"use client";

type UtilitySummary = {
  id: string;
  name: string;
  file_name: string;
};

type UtilitiesSectionProps = {
  utilities: UtilitySummary[];
  selectedIds: string[];
  onToggle: (utilityId: string) => void;
};

export default function UtilitiesSection({
  utilities,
  selectedIds,
  onToggle,
}: UtilitiesSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Utilities</h2>
          <span className="text-xs uppercase tracking-widest text-slate-400">
            optional
          </span>
        </div>
        <span className="text-sm text-slate-500">Toggle</span>
      </summary>
      <div className="mt-4 space-y-4">
        {utilities.length === 0 ? (
          <p className="text-sm text-slate-500">
            No utilities yet. Add them in Settings → Utilities.
          </p>
        ) : (
          <div className="space-y-2">
            {utilities.map((utility) => {
              const selected = selectedIds.includes(utility.id);
              const label = utility.name || utility.file_name;
              return (
                <button
                  key={utility.id}
                  onClick={() => onToggle(utility.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className={selected ? "text-slate-200" : "text-slate-500"}>
                      {utility.file_name || "utility.bin"}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-widest">
                    {selected ? "Selected" : "Select"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}
