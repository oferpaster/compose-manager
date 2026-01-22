"use client";

type ScriptSummary = {
  id: string;
  name: string;
  file_name: string;
  description: string;
  usage: string;
};

type ScriptsSectionProps = {
  scripts: ScriptSummary[];
  selectedIds: string[];
  onToggle: (scriptId: string) => void;
};

export default function ScriptsSection({
  scripts,
  selectedIds,
  onToggle,
}: ScriptsSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Scripts</h2>
          <span className="text-xs uppercase tracking-widest text-slate-400">
            optional
          </span>
        </div>
        <span className="text-sm text-slate-500">Toggle</span>
      </summary>
      <div className="mt-4 space-y-4">
        {scripts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No scripts yet. Add them in Settings → Scripts.
          </p>
        ) : (
          <div className="space-y-2">
            {scripts.map((script) => {
              const selected = selectedIds.includes(script.id);
              return (
                <button
                  key={script.id}
                  onClick={() => onToggle(script.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{script.name}</p>
                    <p className={selected ? "text-slate-200" : "text-slate-500"}>
                      {script.description || "No description"}
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
