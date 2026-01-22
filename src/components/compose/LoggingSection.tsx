"use client";

type LoggingSectionProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function LoggingSection({ value, onChange }: LoggingSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Logging</h2>
          <span className="text-xs uppercase tracking-widest text-slate-400">
            x-logging
          </span>
        </div>
        <span className="text-sm text-slate-500">Toggle</span>
      </summary>
      <div className="mt-4">
        <label className="text-sm text-slate-600">
          Default logging template (YAML)
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`driver: local\\noptions:\\n  max-size: \"10m\"\\n  max-file: \"5\"`}
          />
        </label>
      </div>
    </details>
  );
}
