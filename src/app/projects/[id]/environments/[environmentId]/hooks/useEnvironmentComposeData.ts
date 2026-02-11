"use client";

import { useEffect, useState } from "react";

import type { ComposeRow } from "../../../components/types";

type EnvironmentComposeResponse = {
  project: { id: string; name: string };
  environment: { id: string; name: string; description: string };
  composes: ComposeRow[];
};

type EnvironmentComposeState = {
  project: EnvironmentComposeResponse["project"] | null;
  environment: EnvironmentComposeResponse["environment"] | null;
  composes: ComposeRow[];
  error: string;
};

export default function useEnvironmentComposeData(
  projectId: string,
  environmentId: string
) {
  const [project, setProject] = useState<EnvironmentComposeState["project"]>(
    null
  );
  const [environment, setEnvironment] =
    useState<EnvironmentComposeState["environment"]>(null);
  const [composes, setComposes] = useState<EnvironmentComposeState["composes"]>(
    []
  );
  const [error, setError] = useState<EnvironmentComposeState["error"]>("");

  useEffect(() => {
    async function load() {
      const response = await fetch(
        `/api/environments/${environmentId}?projectId=${projectId}`
      );
      if (!response.ok) {
        setError("Environment not found");
        return;
      }
      const data = (await response.json()) as EnvironmentComposeResponse;
      setProject(data.project);
      setEnvironment(data.environment);
      setComposes(data.composes || []);
    }

    load().catch(() => setError("Failed to load environment"));
  }, [environmentId, projectId]);

  return {
    project,
    environment,
    composes,
    setComposes,
    error,
    setError,
  };
}
