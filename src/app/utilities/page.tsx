"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UtilityRow = {
  id: string;
  name: string;
  file_name: string;
  updated_at: string;
};

export default function UtilitiesPage() {
  const [utilities, setUtilities] = useState<UtilityRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/utilities");
      const data = (await response.json()) as { utilities: UtilityRow[] };
      setUtilities(data.utilities || []);
    }

    load().catch(() => setError("Failed to load utilities"));
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/utilities/${id}`, { method: "DELETE" });
    setUtilities((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDownload = async (utility: UtilityRow) => {
    const response = await fetch(`/api/utilities/${utility.id}/download`);
    if (!response.ok) {
      setError("Failed to download utility");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = utility.file_name || "utility.bin";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Utilities</p>
            <h1 className="text-3xl font-semibold text-slate-900">Tools library</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to settings
            </Link>
            <Link
              href="/utilities/new"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Add utility
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {utilities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No utilities yet. Add one to get started.
            </div>
          ) : (
            utilities.map((utility) => (
              <div
                key={utility.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {utility.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {utility.file_name || "utility.bin"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(utility)}
                    className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4.01a1 1 0 0 1-1.4 0L7.28 11.7a1 1 0 1 1 1.42-1.4L11 12.6V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 0 1 1h12a1 1 0 1 0 0-2H6a1 1 0 0 0-1 1z" />
                    </svg>
                    Download
                  </button>
                  <Link
                    href={`/utilities/${utility.id}`}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-sky-200 text-sky-600 hover:bg-sky-50"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42L18.2 3.29a1.003 1.003 0 0 0-1.42 0L15 5.08l3.75 3.75 1.96-1.62z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleDelete(utility.id)}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Remove"
                    aria-label="Remove"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
