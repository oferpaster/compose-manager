"use client";

type DuplicateComposeModalProps = {
  open: boolean;
  duplicateName: string;
  onDuplicateNameChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DuplicateComposeModal({
  open,
  duplicateName,
  onDuplicateNameChange,
  onClose,
  onConfirm,
}: DuplicateComposeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Duplicate compose
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a name for the new compose version.
        </p>
        <input
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          value={duplicateName}
          onChange={(event) => onDuplicateNameChange(event.target.value)}
          placeholder="Compose name"
        />
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}
