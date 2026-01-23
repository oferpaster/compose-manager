"use client";

import { useState } from "react";

import type { ComposeRow, ImageDownloadRow } from "../components/types";

type ExportOptions = {
  includeCompose: boolean;
  includeConfigs: boolean;
  includeScripts: boolean;
  includeUtilities: boolean;
};

type ExportDeps = {
  projectName: string | null;
  onError: (message: string) => void;
};

export default function useExport({ projectName, onError }: ExportDeps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<ComposeRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCompose: true,
    includeConfigs: true,
    includeScripts: true,
    includeUtilities: true,
  });
  const [exportImageDownloads, setExportImageDownloads] = useState<
    ImageDownloadRow[]
  >([]);
  const [exportImageSelections, setExportImageSelections] = useState<
    Record<string, boolean>
  >({});
  const [exportImagesLoading, setExportImagesLoading] = useState(false);
  const [exportImagesError, setExportImagesError] = useState("");
  const [exportImageDetailsOpen, setExportImageDetailsOpen] = useState<
    Record<string, boolean>
  >({});

  const handleExport = async () => {
    if (!exportTarget || exporting) return;
    setExporting(true);
    setExportOpen(false);
    try {
      const imageDownloadIds = Object.entries(exportImageSelections)
        .filter(([, selected]) => selected)
        .map(([id]) => id);
      const response = await fetch(`/api/composes/${exportTarget.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...exportOptions,
          imageDownloadIds,
        }),
      });
      if (!response.ok) {
        onError("Failed to export compose");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeProject = (projectName || "project").replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      );
      const safeCompose = exportTarget.name.replace(/[^a-zA-Z0-9_-]+/g, "-");
      link.download = `${safeProject}__${safeCompose}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch {
      onError("Failed to export compose");
    } finally {
      setExporting(false);
    }
  };

  const openExport = async (compose: ComposeRow) => {
    setExportTarget(compose);
    setExportOptions({
      includeCompose: true,
      includeConfigs: true,
      includeScripts: true,
      includeUtilities: true,
    });
    setExportOpen(true);
    setExportImagesError("");
    setExportImagesLoading(true);
    setExportImageDownloads([]);
    setExportImageSelections({});
    setExportImageDetailsOpen({});
    try {
      const response = await fetch(`/api/composes/${compose.id}/images`);
      if (!response.ok) {
        throw new Error("Failed to load image downloads");
      }
      const data = (await response.json()) as {
        downloads: ImageDownloadRow[];
      };
      const downloads = data.downloads || [];
      setExportImageDownloads(downloads);
      const nextSelections: Record<string, boolean> = {};
      downloads.forEach((download) => {
        nextSelections[download.id] = false;
      });
      setExportImageSelections(nextSelections);
    } catch (loadError) {
      setExportImagesError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load image downloads"
      );
    } finally {
      setExportImagesLoading(false);
    }
  };

  return {
    exportOpen,
    setExportOpen,
    exportTarget,
    exporting,
    exportOptions,
    setExportOptions,
    exportImageDownloads,
    exportImageSelections,
    setExportImageSelections,
    exportImagesLoading,
    exportImagesError,
    exportImageDetailsOpen,
    setExportImageDetailsOpen,
    handleExport,
    openExport,
  };
}
