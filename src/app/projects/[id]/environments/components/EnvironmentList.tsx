"use client";

import Link from "next/link";

import type { EnvironmentRow } from "./types";

type EnvironmentListProps = {
  projectId: string;
  environments: EnvironmentRow[];
  filteredEnvironments: EnvironmentRow[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDelete: (environmentId: string) => void;
};

export default function EnvironmentList({
  projectId,
  environments,
  filteredEnvironments,
  searchTerm,
  onSearchChange,
  onDelete,
}: EnvironmentListProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Environments
        </h2>
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
          placeholder="Search environments..."
        />
      </div>
      <div className="grid gap-4">
        {filteredEnvironments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            {environments.length === 0
              ? "No environments yet. Create your first one."
              : "No environments match your search."}
          </div>
        ) : (
          filteredEnvironments.map((environment) => (
            <div
              key={environment.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <Link
                href={`/projects/${projectId}/environments/${environment.id}`}
                className="min-w-[220px] flex-1"
              >
                <p className="text-lg font-semibold text-slate-900">
                  {environment.name}
                </p>
                <p className="text-sm text-slate-500">
                  {environment.description || "No description"}
                </p>
                <p className="text-xs text-slate-400">
                  Updated {new Date(environment.updated_at).toLocaleString()}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${projectId}/environments/${environment.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(environment.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700"
                  title="Delete"
                  aria-label="Delete"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="block h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M9 3h6a1 1 0 0 1 1 1v2h4a1 1 0 1 1 0 2h-1l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8H4a1 1 0 1 1 0-2h4V4a1 1 0 0 1 1-1zm1 3h4V5h-4v1zM9 10a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1z" />
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
