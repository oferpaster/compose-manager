"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProjectRow = { id: string; name: string; updated_at: string };

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/projects");
      const data = (await response.json()) as { projects: ProjectRow[] };
      setProjects(data.projects || []);
    }

    load().catch(() => setError("Failed to load projects"));
  }, []);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
  }, [projects, searchTerm]);

  const handleCreateProject = async () => {
    const name = newProjectName.trim() || "Untitled Project";
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      setError("Failed to create project");
      return;
    }
    const data = (await response.json()) as { id: string; name: string };
    setProjects((prev) => [
      { id: data.id, name: data.name, updated_at: new Date().toISOString() },
      ...prev,
    ]);
    setNewProjectName("");
  };

  const handleDeleteProject = async (projectId: string) => {
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Compose Builder
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-600"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4"
                fill="currentColor"
              >
                <path d="M6 2h9a2 2 0 0 1 1.41.59l4 4A2 2 0 0 1 21 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5l-5-5zM8 12a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H9z" />
              </svg>
              Swagger Docs
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-600"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4"
                fill="currentColor"
              >
                <path d="M12 8.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7zm9 3.5a7.9 7.9 0 0 0-.08-1l2.02-1.57a1 1 0 0 0 .24-1.28l-1.92-3.32a1 1 0 0 0-1.2-.46l-2.38.96a8.1 8.1 0 0 0-1.74-1l-.36-2.54a1 1 0 0 0-.99-.85h-3.84a1 1 0 0 0-.99.85l-.36 2.54a8.1 8.1 0 0 0-1.74 1l-2.38-.96a1 1 0 0 0-1.2.46L1.98 8.15a1 1 0 0 0 .24 1.28l2.02 1.57a7.9 7.9 0 0 0 0 2l-2.02 1.57a1 1 0 0 0-.24 1.28l1.92 3.32a1 1 0 0 0 1.2.46l2.38-.96a8.1 8.1 0 0 0 1.74 1l.36 2.54a1 1 0 0 0 .99.85h3.84a1 1 0 0 0 .99-.85l.36-2.54a8.1 8.1 0 0 0 1.74-1l2.38.96a1 1 0 0 0 1.2-.46l1.92-3.32a1 1 0 0 0-.24-1.28l-2.02-1.57c.05-.33.08-.66.08-1z" />
              </svg>
              Settings
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="New project name"
            />
            <button
              type="button"
              onClick={handleCreateProject}
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Create project
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              All projects
            </h2>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
              placeholder="Search projects..."
            />
          </div>
          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              {projects.length === 0
                ? "No projects yet. Create your first one."
                : "No projects match your search."}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="min-w-[220px] flex-1"
                >
                  <p className="text-lg font-semibold text-slate-900">
                    {project.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Updated {new Date(project.updated_at).toLocaleString()}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(project.id)}
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
        </section>
      </div>
    </main>
  );
}
