"use client";

type YamlEditorModalProps = {
  open: boolean;
  draft: string;
  error: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
};

export default function YamlEditorModal({
  open,
  draft,
  error,
  onChange,
  onApply,
  onClose,
}: YamlEditorModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Edit docker-compose.yml
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
          >
            Close
          </button>
        </div>
        <textarea
          className="mt-4 min-h-[360px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
          value={draft}
          onChange={(event) => onChange(event.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
