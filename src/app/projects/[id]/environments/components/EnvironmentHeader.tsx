"use client";

import Link from "next/link";

type EnvironmentHeaderProps = {
  projectName: string;
};

export default function EnvironmentHeader({ projectName }: EnvironmentHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-widest text-slate-500">
          Project
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {projectName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Environments</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
        >
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            ←
          </span>
          Back to projects
        </Link>
      </div>
    </header>
  );
}
