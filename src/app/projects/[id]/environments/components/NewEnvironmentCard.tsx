"use client";

type NewEnvironmentCardProps = {
  name: string;
  description: string;
  error: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreate: () => void;
};

export default function NewEnvironmentCard({
  name,
  description,
  error,
  onNameChange,
  onDescriptionChange,
  onCreate,
}: NewEnvironmentCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          placeholder="New environment name"
        />
        <input
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          placeholder="Description (optional)"
        />
        <button
          type="button"
          onClick={onCreate}
          className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Create environment
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
