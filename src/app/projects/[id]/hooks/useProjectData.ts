"use client";

import { useEffect, useState } from "react";

import type { ProjectResponse } from "../components/types";

type ProjectDataState = {
  project: ProjectResponse["project"] | null;
  capabilities: ProjectResponse["capabilities"] | null;
  error: string;
};

export default function useProjectData(projectId: string) {
  const [project, setProject] = useState<ProjectDataState["project"]>(null);
  const [capabilities, setCapabilities] = useState<
    ProjectDataState["capabilities"]
  >(null);
  const [error, setError] = useState<ProjectDataState["error"]>("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        setError("Project not found");
        return;
      }
      const data = (await response.json()) as ProjectResponse;
      setProject(data.project);
      setCapabilities(data.capabilities || null);
    }

    load().catch(() => setError("Failed to load project"));
  }, [projectId]);

  return {
    project,
    capabilities,
    error,
    setError,
  };
}
