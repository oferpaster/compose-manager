"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import ProjectHeader from "./components/ProjectHeader";
import ProjectStatusCard from "./components/ProjectStatusCard";
import useProjectData from "./hooks/useProjectData";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { project, error } = useProjectData(params.id);

  const handleOpenEnvironments = () => {
    router.push(`/projects/${params.id}/environments`);
  };

  useEffect(() => {
    if (!project) return;
    router.replace(`/projects/${params.id}/environments`);
  }, [params.id, project, router]);

  if (error) {
    return <ProjectStatusCard message={error} />;
  }

  if (!project) {
    return <ProjectStatusCard message="Loading project..." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <ProjectHeader
          projectName={project.name}
          onCreate={handleOpenEnvironments}
          createLabel="Open environments"
        />
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Redirecting to environments...
        </section>
      </div>
    </main>
  );
}
