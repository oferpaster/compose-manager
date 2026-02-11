"use client";

import Link from "next/link";

import type { ComposeRow } from "../../../components/types";

type EnvironmentComposeListProps = {
  composes: ComposeRow[];
  filteredComposes: ComposeRow[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDelete: (composeId: string) => void;
  onDuplicate: (compose: ComposeRow) => void;
};

export default function EnvironmentComposeList({
  composes,
  filteredComposes,
  searchTerm,
  onSearchChange,
  onDelete,
  onDuplicate,
}: EnvironmentComposeListProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Compose versions
        </h2>
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
          placeholder="Search versions..."
        />
      </div>
      <div className="grid gap-4">
        {filteredComposes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            {composes.length === 0
              ? "No compose versions yet. Create your first one."
              : "No versions match your search."}
          </div>
        ) : (
          filteredComposes.map((compose) => (
            <div
              key={compose.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {compose.name}
                </p>
                <p className="text-sm text-slate-500">
                  Updated {new Date(compose.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDuplicate(compose)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mr-2 inline-block h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M8 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V8zm-4 8a2 2 0 0 0 2 2h1V8a2 2 0 0 1 2-2h8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11z" />
                  </svg>
                  Duplicate
                </button>
                <Link
                  href={`/compose/${compose.id}`}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-sm text-sky-700"
                  title="Edit"
                  aria-label="Edit"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="inline-block h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.83 1.83 2.75 2.75 1.99-1.66z" />
                  </svg>
                </Link>
                <button
                  onClick={() => onDelete(compose.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-sm text-rose-700"
                  title="Delete"
                  aria-label="Delete"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="inline-block h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
