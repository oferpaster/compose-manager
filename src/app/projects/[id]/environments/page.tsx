"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import EnvironmentHeader from "./components/EnvironmentHeader";
import EnvironmentList from "./components/EnvironmentList";
import NewEnvironmentCard from "./components/NewEnvironmentCard";
import ProjectStatusCard from "../components/ProjectStatusCard";
import useEnvironmentData from "./hooks/useEnvironmentData";

export default function EnvironmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { project, environments, setEnvironments, error } =
    useEnvironmentData(params.id);
  const [searchTerm, setSearchTerm] = useState("");
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [newEnvironmentDescription, setNewEnvironmentDescription] =
    useState("");
  const [formError, setFormError] = useState("");

  const filteredEnvironments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return environments;
    return environments.filter((environment) =>
      environment.name.toLowerCase().includes(query)
    );
  }, [environments, searchTerm]);

  const handleCreateEnvironment = async () => {
    if (!project) return;
    const name = newEnvironmentName.trim() || "Untitled Environment";
    const response = await fetch("/api/environments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: newEnvironmentDescription.trim(),
        projectId: project.id,
      }),
    });

    if (!response.ok) {
      setFormError("Failed to create environment");
      return;
    }

    const data = (await response.json()) as { id: string; name: string };
    setEnvironments((prev) => [
      {
        id: data.id,
        name: data.name,
        description: newEnvironmentDescription.trim(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewEnvironmentName("");
    setNewEnvironmentDescription("");
    setFormError("");
    router.push(`/projects/${params.id}/environments/${data.id}`);
  };

  const handleDeleteEnvironment = async (environmentId: string) => {
    const confirmed = window.confirm("Delete this environment?");
    if (!confirmed) return;
    await fetch(`/api/environments/${environmentId}`, { method: "DELETE" });
    setEnvironments((prev) =>
      prev.filter((environment) => environment.id !== environmentId)
    );
  };

  if (error) {
    return <ProjectStatusCard message={error} />;
  }

  if (!project) {
    return <ProjectStatusCard message="Loading project..." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <EnvironmentHeader
          projectName={project.name}
        />
        <NewEnvironmentCard
          name={newEnvironmentName}
          description={newEnvironmentDescription}
          error={formError}
          onNameChange={setNewEnvironmentName}
          onDescriptionChange={setNewEnvironmentDescription}
          onCreate={handleCreateEnvironment}
        />
        <EnvironmentList
          projectId={project.id}
          environments={environments}
          filteredEnvironments={filteredEnvironments}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onDelete={handleDeleteEnvironment}
        />
      </div>
    </main>
  );
}
