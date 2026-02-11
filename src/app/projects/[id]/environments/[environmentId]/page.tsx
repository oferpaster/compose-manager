"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import EnvironmentComposeList from "./components/EnvironmentComposeList";
import EnvironmentDetailHeader from "./components/EnvironmentDetailHeader";
import ProjectStatusCard from "../../components/ProjectStatusCard";
import useEnvironmentComposeData from "./hooks/useEnvironmentComposeData";
import useDuplicateCompose from "../../hooks/useDuplicateCompose";

export default function EnvironmentDetailPage() {
  const params = useParams<{ id: string; environmentId: string }>();
  const router = useRouter();
  const { project, environment, composes, setComposes, error, setError } =
    useEnvironmentComposeData(params.id, params.environmentId);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredComposes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return composes;
    return composes.filter((compose) =>
      compose.name.toLowerCase().includes(query)
    );
  }, [composes, searchTerm]);

  const {
    isDuplicateOpen,
    duplicateName,
    setDuplicateName,
    openDuplicate,
    setIsDuplicateOpen,
    handleDuplicate,
  } = useDuplicateCompose({
    project,
    onError: setError,
    onNavigate: (composeId) => router.push(`/compose/${composeId}`),
  });

  const handleCreateCompose = async () => {
    if (!project || !environment) return;
    const response = await fetch("/api/composes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Untitled Compose",
        projectId: project.id,
        environmentId: environment.id,
      }),
    });

    if (!response.ok) {
      setError("Failed to create compose");
      return;
    }

    const data = (await response.json()) as { id: string };
    router.push(`/compose/${data.id}`);
  };

  const handleDeleteCompose = async (composeId: string) => {
    const confirmed = window.confirm("Delete this compose version?");
    if (!confirmed) return;
    await fetch(`/api/composes/${composeId}`, { method: "DELETE" });
    setComposes((prev) => prev.filter((item) => item.id !== composeId));
  };

  if (error) {
    return <ProjectStatusCard message={error} />;
  }

  if (!project || !environment) {
    return <ProjectStatusCard message="Loading environment..." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <EnvironmentDetailHeader
          projectId={project.id}
          projectName={project.name}
          environmentName={environment.name}
          onCreate={handleCreateCompose}
        />
        <EnvironmentComposeList
          composes={composes}
          filteredComposes={filteredComposes}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onDelete={handleDeleteCompose}
          onDuplicate={openDuplicate}
        />
      </div>

      {isDuplicateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Duplicate compose
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create a new compose version in this environment.
            </p>
            <input
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="Compose name"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsDuplicateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm text-white"
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
