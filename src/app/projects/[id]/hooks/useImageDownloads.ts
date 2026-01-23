"use client";

import { useMemo, useState } from "react";

import type { ComposeRow, ImageDownloadRow, ImageOption } from "../components/types";

export default function useImageDownloads() {
  const [imagesOpen, setImagesOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState<ComposeRow | null>(null);
  const [imageOptions, setImageOptions] = useState<ImageOption[]>([]);
  const [imageDownloads, setImageDownloads] = useState<ImageDownloadRow[]>([]);
  const [imageSelections, setImageSelections] = useState<Record<string, boolean>>(
    {}
  );
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState("");
  const [imagesDownloading, setImagesDownloading] = useState(false);
  const [imageSearch, setImageSearch] = useState("");

  const selectedImageCount = useMemo(
    () => Object.values(imageSelections).filter(Boolean).length,
    [imageSelections]
  );
  const allImagesSelected =
    imageOptions.length > 0 && selectedImageCount === imageOptions.length;

  const sortedImageOptions = useMemo(() => {
    const normalized = imageSearch.trim().toLowerCase();
    const filtered = imageOptions.filter((option) => {
      if (!normalized) return true;
      const haystack = `${option.image} ${option.services[0] || ""} ${
        option.version
      }`.toLowerCase();
      return haystack.includes(normalized);
    });
    return [...filtered].sort((a, b) => {
      const aLabel = (a.services[0] || a.image).toLowerCase();
      const bLabel = (b.services[0] || b.image).toLowerCase();
      return aLabel.localeCompare(bLabel);
    });
  }, [imageOptions, imageSearch]);

  const openImageDownloads = async (compose: ComposeRow) => {
    setImageTarget(compose);
    setImagesOpen(true);
    setImagesError("");
    setImagesLoading(true);
    try {
      const response = await fetch(`/api/composes/${compose.id}/images`);
      if (!response.ok) {
        throw new Error("Failed to load images");
      }
      const data = (await response.json()) as {
        images: ImageOption[];
        downloads: ImageDownloadRow[];
      };
      setImageOptions(data.images || []);
      setImageDownloads(data.downloads || []);
      const nextSelections: Record<string, boolean> = {};
      (data.images || []).forEach((item) => {
        nextSelections[item.image] = true;
      });
      setImageSelections(nextSelections);
    } catch (loadError) {
      setImagesError(
        loadError instanceof Error ? loadError.message : "Failed to load images"
      );
    } finally {
      setImagesLoading(false);
    }
  };

  const handleCreateImageDownload = async () => {
    if (!imageTarget || imagesDownloading) return;
    const selected = Object.entries(imageSelections)
      .filter(([, value]) => value)
      .map(([image]) => image);
    if (selected.length === 0) {
      setImagesError("Select at least one image");
      return;
    }
    setImagesDownloading(true);
    setImagesError("");
    try {
      const response = await fetch(`/api/composes/${imageTarget.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: selected }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to download images");
      }
      const data = (await response.json()) as { download: ImageDownloadRow };
      setImageDownloads((prev) => [data.download, ...prev]);
    } catch (downloadError) {
      setImagesError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download images"
      );
    } finally {
      setImagesDownloading(false);
    }
  };

  const handleDownloadImageTar = async (download: ImageDownloadRow) => {
    if (!imageTarget) return;
    const response = await fetch(
      `/api/composes/${imageTarget.id}/images/${download.id}`
    );
    if (!response.ok) {
      setImagesError("Failed to download tar");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = download.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteImageDownload = async (download: ImageDownloadRow) => {
    if (!imageTarget) return;
    const confirmed = window.confirm("Delete this downloaded file?");
    if (!confirmed) return;
    const response = await fetch(
      `/api/composes/${imageTarget.id}/images/${download.id}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      setImagesError("Failed to delete download");
      return;
    }
    setImageDownloads((prev) => prev.filter((item) => item.id !== download.id));
  };

  return {
    imagesOpen,
    setImagesOpen,
    imageTarget,
    imageOptions,
    imageDownloads,
    imageSelections,
    setImageSelections,
    imagesLoading,
    imagesError,
    imagesDownloading,
    imageSearch,
    setImageSearch,
    selectedImageCount,
    allImagesSelected,
    sortedImageOptions,
    openImageDownloads,
    handleCreateImageDownload,
    handleDownloadImageTar,
    handleDeleteImageDownload,
  };
}
