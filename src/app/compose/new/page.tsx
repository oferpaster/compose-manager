"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewComposePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function loadProjects() {
      const response = await fetch("/api/projects");
      const data = (await response.json()) as { projects: { id: string; name: string }[] };
      setProjects(data.projects || []);
    }

    loadProjects().catch(() => setError("Failed to load projects"));
  }, [router]);

  const handleCreate = async (projectId: string) => {
    const response = await fetch("/api/composes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Compose", projectId }),
    });

    if (!response.ok) {
      setError("Failed to create compose");
      return;
    }

    const data = (await response.json()) as { id: string };
    router.replace(`/compose/${data.id}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          <p className="text-sm uppercase tracking-widest text-slate-500">New compose</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Choose a project
          </h1>
        </div>
        {error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleCreate(project.id)}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm"
            >
              <span className="text-lg font-semibold text-slate-900">
                {project.name}
              </span>
              <span className="text-sm text-slate-500">Create version</span>
            </button>
          ))}
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
              No projects yet. Create one on the home page.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
