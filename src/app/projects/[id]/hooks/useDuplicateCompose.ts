"use client";

import { useState } from "react";

import type { ComposeRow, ProjectResponse } from "../components/types";

type DuplicateDeps = {
  project: ProjectResponse["project"] | null;
  onError: (message: string) => void;
  onNavigate: (composeId: string) => void;
};

export default function useDuplicateCompose({
  project,
  onError,
  onNavigate,
}: DuplicateDeps) {
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<ComposeRow | null>(
    null
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
      onError("Failed to load compose");
      return;
    }
    const data = (await response.json()) as {
      config: { name: string } & Record<string, unknown>;
    };
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
      onError("Failed to duplicate compose");
      return;
    }
    const created = (await create.json()) as { id: string };
    setIsDuplicateOpen(false);
    setDuplicateTarget(null);
    onNavigate(created.id);
  };

  return {
    isDuplicateOpen,
    duplicateName,
    setDuplicateName,
    duplicateTarget,
    openDuplicate,
    setIsDuplicateOpen,
    handleDuplicate,
  };
}
