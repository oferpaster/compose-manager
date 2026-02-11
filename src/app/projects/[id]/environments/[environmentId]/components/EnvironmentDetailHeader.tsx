"use client";

import Link from "next/link";

type EnvironmentDetailHeaderProps = {
  projectId: string;
  projectName: string;
  environmentName: string;
  onCreate: () => void;
};

export default function EnvironmentDetailHeader({
  projectId,
  projectName,
  environmentName,
  onCreate,
}: EnvironmentDetailHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-widest text-slate-500">
          {projectName}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {environmentName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Compose versions</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${projectId}/environments`}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
        >
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            ←
          </span>
          Back to environments
        </Link>
        <button
          onClick={onCreate}
          className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm text-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mr-2 inline-block h-4 w-4"
            fill="currentColor"
          >
            <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" />
          </svg>
          Create new version
        </button>
      </div>
    </header>
  );
}
