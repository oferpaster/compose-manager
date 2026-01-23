"use client";

import { useState } from "react";

import type { ComposeRow, SnapshotRow } from "../components/types";

type SnapshotOptions = {
  includeCompose: boolean;
  includeConfigs: boolean;
  includeScripts: boolean;
  includeUtilities: boolean;
};

export default function useSnapshots() {
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotTarget, setSnapshotTarget] = useState<ComposeRow | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [snapshotsError, setSnapshotsError] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotDescription, setSnapshotDescription] = useState("");
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [snapshotOptions, setSnapshotOptions] = useState<SnapshotOptions>({
    includeCompose: true,
    includeConfigs: true,
    includeScripts: true,
    includeUtilities: true,
  });

  const openSnapshots = async (compose: ComposeRow) => {
    setSnapshotTarget(compose);
    setSnapshotsOpen(true);
    setSnapshotsError("");
    setSnapshotName("");
    setSnapshotDescription("");
    setSnapshotOptions({
      includeCompose: true,
      includeConfigs: true,
      includeScripts: true,
      includeUtilities: true,
    });
    try {
      const response = await fetch(`/api/composes/${compose.id}/snapshots`);
      if (!response.ok) {
        throw new Error("Failed to load snapshots");
      }
      const data = (await response.json()) as { snapshots: SnapshotRow[] };
      setSnapshots(data.snapshots || []);
    } catch (loadError) {
      setSnapshotsError(
        loadError instanceof Error ? loadError.message : "Failed to load"
      );
    }
  };

  const handleCreateSnapshot = async () => {
    if (!snapshotTarget) return;
    const name = snapshotName.trim();
    if (!name) {
      setSnapshotsError("Snapshot name is required");
      return;
    }
    setSnapshotSaving(true);
    setSnapshotsError("");
    try {
      const response = await fetch(
        `/api/composes/${snapshotTarget.id}/snapshots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: snapshotDescription.trim(),
            options: snapshotOptions,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to create snapshot");
      }
      const data = (await response.json()) as { snapshot: SnapshotRow };
      setSnapshots((prev) => [data.snapshot, ...prev]);
      setSnapshotName("");
      setSnapshotDescription("");
    } catch (createError) {
      setSnapshotsError(
        createError instanceof Error
          ? createError.message
          : "Failed to create snapshot"
      );
    } finally {
      setSnapshotSaving(false);
    }
  };

  const handleDownloadSnapshot = async (snapshot: SnapshotRow) => {
    if (!snapshotTarget) return;
    const response = await fetch(
      `/api/composes/${snapshotTarget.id}/snapshots/${snapshot.id}`
    );
    if (!response.ok) {
      setSnapshotsError("Failed to download snapshot");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = snapshot.file_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!snapshotTarget) return;
    const confirmed = window.confirm("Delete this snapshot?");
    if (!confirmed) return;
    const response = await fetch(
      `/api/composes/${snapshotTarget.id}/snapshots/${snapshotId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      setSnapshotsError("Failed to delete snapshot");
      return;
    }
    setSnapshots((prev) => prev.filter((item) => item.id !== snapshotId));
  };

  return {
    snapshotsOpen,
    setSnapshotsOpen,
    snapshotTarget,
    snapshots,
    snapshotsError,
    snapshotName,
    snapshotDescription,
    snapshotSaving,
    snapshotOptions,
    setSnapshotOptions,
    setSnapshotName,
    setSnapshotDescription,
    openSnapshots,
    handleCreateSnapshot,
    handleDownloadSnapshot,
    handleDeleteSnapshot,
  };
}
