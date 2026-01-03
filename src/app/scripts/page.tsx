"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ScriptRow = {
  id: string;
  name: string;
  file_name: string;
  description: string;
  usage: string;
  updated_at: string;
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/scripts");
      const data = (await response.json()) as { scripts: ScriptRow[] };
      setScripts(data.scripts || []);
    }

    load().catch(() => setError("Failed to load scripts"));
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    setScripts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Scripts</p>
            <h1 className="text-3xl font-semibold text-slate-900">Utilities</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to settings
            </Link>
            <Link
              href="/scripts/new"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Add script
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {scripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No scripts yet. Add one to get started.
            </div>
          ) : (
            scripts.map((script) => (
              <div
                key={script.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{script.name}</p>
                  <p className="text-xs text-slate-500">
                    {script.file_name || "script.sh"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/scripts/${script.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(script.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                  >
                    Remove
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
