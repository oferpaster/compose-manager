"use client";

import { KeyValue } from "@/lib/compose";

type GlobalEnvSectionProps = {
  values: KeyValue[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, next: KeyValue) => void;
  onBlur: () => void;
};

export default function GlobalEnvSection({
  values,
  onAdd,
  onRemove,
  onUpdate,
  onBlur,
}: GlobalEnvSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Global environment
        </h2>
        <span className="text-sm text-slate-500">Toggle</span>
      </summary>
      <div className="mt-4 space-y-3">
        {values.map((entry, index) => (
          <div
            key={`env-${index}`}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              value={entry.key}
              onChange={(event) =>
                onUpdate(index, { ...entry, key: event.target.value })
              }
              onBlur={onBlur}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="KEY"
            />
            <input
              value={entry.value}
              onChange={(event) =>
                onUpdate(index, { ...entry, value: event.target.value })
              }
              onBlur={onBlur}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="value"
            />
            <button
              onClick={() => onRemove(index)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-4 cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"
      >
        + Add global env
      </button>
    </details>
  );
}
