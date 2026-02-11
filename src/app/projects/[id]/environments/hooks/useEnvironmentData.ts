"use client";

import { useEffect, useState } from "react";

import type { EnvironmentResponse, EnvironmentRow } from "../components/types";

type EnvironmentDataState = {
  project: EnvironmentResponse["project"] | null;
  environments: EnvironmentRow[];
  error: string;
};

export default function useEnvironmentData(projectId: string) {
  const [project, setProject] = useState<EnvironmentDataState["project"]>(null);
  const [environments, setEnvironments] = useState<
    EnvironmentDataState["environments"]
  >([]);
  const [error, setError] = useState<EnvironmentDataState["error"]>("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/environments?projectId=${projectId}`);
      if (!response.ok) {
        setError("Failed to load environments");
        return;
      }
      const data = (await response.json()) as EnvironmentResponse;
      setProject(data.project);
      setEnvironments(data.environments || []);
    }

    load().catch(() => setError("Failed to load environments"));
  }, [projectId]);

  return {
    project,
    environments,
    setEnvironments,
    error,
  };
}
