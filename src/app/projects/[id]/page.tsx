"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type ComposeRow = {
  id: string;
  name: string;
  updated_at: string;
};

type ProjectResponse = {
  project: { id: string; name: string };
  composes: ComposeRow[];
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectResponse["project"] | null>(null);
  const [composes, setComposes] = useState<ComposeRow[]>([]);
  const [error, setError] = useState("");
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<ComposeRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        setError("Project not found");
        return;
      }
      const data = (await response.json()) as ProjectResponse;
      setProject(data.project);
      setComposes(data.composes || []);
    }

    load().catch(() => setError("Failed to load project"));
  }, [params.id]);

  const handleCreate = async () => {
    const response = await fetch("/api/composes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Compose", projectId: params.id }),
    });

    if (!response.ok) {
      setError("Failed to create compose");
      return;
    }

    const data = (await response.json()) as { id: string };
    router.push(`/compose/${data.id}`);
  };

  const handleDelete = async (composeId: string) => {
    const confirmed = window.confirm("Delete this compose version?");
    if (!confirmed) return;
    await fetch(`/api/composes/${composeId}`, { method: "DELETE" });
    setComposes((prev) => prev.filter((item) => item.id !== composeId));
  };

  const handleExport = async (composeId: string, name: string) => {
    const response = await fetch(`/api/composes/${composeId}/export`);
    if (!response.ok) {
      setError("Failed to export compose");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const projectName = project?.name || "project";
    const safeProject = projectName.replace(/[^a-zA-Z0-9_-]+/g, "-");
    const safeCompose = name.replace(/[^a-zA-Z0-9_-]+/g, "-");
    link.download = `${safeProject}__${safeCompose}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filteredComposes = composes.filter((compose) =>
    compose.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const openDuplicate = (compose: ComposeRow) => {
    setDuplicateTarget(compose);
    setDuplicateName(`${compose.name} Copy`);
    setIsDuplicateOpen(true);
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || !project) return;
    const response = await fetch(`/api/composes/${duplicateTarget.id}`);
    if (!response.ok) {
      setError("Failed to load compose");
      return;
    }
    const data = (await response.json()) as { config: { name: string } & Record<string, unknown> };
    const nextName = duplicateName.trim() || `${duplicateTarget.name} Copy`;
    const create = await fetch("/api/composes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextName,
        projectId: project.id,
        config: { ...data.config, name: nextName },
      }),
    });
    if (!create.ok) {
      setError("Failed to duplicate compose");
      return;
    }
    const created = (await create.json()) as { id: string };
    setIsDuplicateOpen(false);
    setDuplicateTarget(null);
    router.push(`/compose/${created.id}`);
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {error}
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Loading project...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Project</p>
            <h1 className="text-3xl font-semibold text-slate-900">{project.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">←</span>
              Back to projects
            </Link>
            <button
              onClick={handleCreate}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
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

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Compose versions</h2>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
                  <p className="text-lg font-semibold text-slate-900">{compose.name}</p>
                  <p className="text-sm text-slate-500">
                    Updated {new Date(compose.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDuplicate(compose)}
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
                  <button
                    onClick={() => handleExport(compose.id, compose.name)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="mr-2 inline-block h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4.01a1 1 0 0 1-1.4 0L7.28 11.7a1 1 0 1 1 1.42-1.4L11 12.6V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 0 1 1h12a1 1 0 1 0 0-2H6a1 1 0 0 0-1 1z" />
                    </svg>
                    Export
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
                    onClick={() => handleDelete(compose.id)}
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
      </div>

      {isDuplicateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Duplicate compose</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a name for the new compose version.
            </p>
            <input
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
              placeholder="Compose name"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDuplicateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
