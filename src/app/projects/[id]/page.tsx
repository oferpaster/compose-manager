"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type ComposeRow = {
  id: string;
  name: string;
  updated_at: string;
};

type SnapshotRow = {
  id: string;
  name: string;
  description: string;
  file_name: string;
  created_at: string;
};

type ImageOption = {
  image: string;
  version: string;
  services: string[];
};

type ImageDownloadRow = {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
  errorMessage?: string;
  images: ImageOption[];
};

type ProjectResponse = {
  project: { id: string; name: string };
  composes: ComposeRow[];
  capabilities?: { imageDownloads?: boolean };
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectResponse["project"] | null>(
    null
  );
  const [composes, setComposes] = useState<ComposeRow[]>([]);
  const [capabilities, setCapabilities] = useState<
    ProjectResponse["capabilities"] | null
  >(null);
  const [error, setError] = useState("");
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<ComposeRow | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotTarget, setSnapshotTarget] = useState<ComposeRow | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [snapshotsError, setSnapshotsError] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotDescription, setSnapshotDescription] = useState("");
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<ComposeRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
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
  const [snapshotOptions, setSnapshotOptions] = useState({
    includeCompose: true,
    includeConfigs: true,
    includeScripts: true,
    includeUtilities: true,
  });
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
  const selectedImageCount = Object.values(imageSelections).filter(Boolean).length;
  const allImagesSelected =
    imageOptions.length > 0 && selectedImageCount === imageOptions.length;
  const normalizedImageSearch = imageSearch.trim().toLowerCase();
  const filteredImageOptions = imageOptions.filter((option) => {
    if (!normalizedImageSearch) return true;
    const haystack = `${option.image} ${option.services[0] || ""} ${
      option.version
    }`.toLowerCase();
    return haystack.includes(normalizedImageSearch);
  });
  const sortedImageOptions = [...filteredImageOptions].sort((a, b) => {
    const aLabel = (a.services[0] || a.image).toLowerCase();
    const bLabel = (b.services[0] || b.image).toLowerCase();
    return aLabel.localeCompare(bLabel);
  });

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        setError("Project not found");
        return;
      }
      const data = (await response.json()) as ProjectResponse;
      setProject(data.project);
      setComposes(data.composes || []);
      setCapabilities(data.capabilities || null);
    }

    load().catch(() => setError("Failed to load project"));
  }, [params.id]);

  const handleCreate = async () => {
    const response = await fetch("/api/composes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Compose", projectId: params.id }),
    });

    if (!response.ok) {
      setError("Failed to create compose");
      return;
    }

    const data = (await response.json()) as { id: string };
    router.push(`/compose/${data.id}`);
  };

  const handleDelete = async (composeId: string) => {
    const confirmed = window.confirm("Delete this compose version?");
    if (!confirmed) return;
    await fetch(`/api/composes/${composeId}`, { method: "DELETE" });
    setComposes((prev) => prev.filter((item) => item.id !== composeId));
  };

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
        setError("Failed to export compose");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const projectName = project?.name || "project";
      const safeProject = projectName.replace(/[^a-zA-Z0-9_-]+/g, "-");
      const safeCompose = exportTarget.name.replace(/[^a-zA-Z0-9_-]+/g, "-");
      link.download = `${safeProject}__${safeCompose}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch {
      setError("Failed to export compose");
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

  const imageDownloadsEnabled = Boolean(capabilities?.imageDownloads);

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

  const filteredComposes = composes.filter((compose) =>
    compose.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
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
      setError("Failed to load compose");
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
      setError("Failed to duplicate compose");
      return;
    }
    const created = (await create.json()) as { id: string };
    setIsDuplicateOpen(false);
    setDuplicateTarget(null);
    router.push(`/compose/${created.id}`);
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {error}
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Loading project...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Project
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                ←
              </span>
              Back to projects
            </Link>
            <button
              onClick={handleCreate}
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 inline-block h-4 w-4"
                fill="currentColor"
              >
                <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" />
              </svg>
              Create new version
            </button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Compose versions
            </h2>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
              placeholder="Search versions..."
            />
          </div>
          <div className="grid gap-4">
            {filteredComposes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                {composes.length === 0
                  ? "No compose versions yet. Create your first one."
                  : "No versions match your search."}
              </div>
            ) : (
              filteredComposes.map((compose) => (
                <div
                  key={compose.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {compose.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      Updated {new Date(compose.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDuplicate(compose)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="mr-2 inline-block h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M8 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V8zm-4 8a2 2 0 0 0 2 2h1V8a2 2 0 0 1 2-2h8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11z" />
                      </svg>
                      Duplicate
                    </button>
                    <button
                      onClick={() => openExport(compose)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="mr-2 inline-block h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4.01a1 1 0 0 1-1.4 0L7.28 11.7a1 1 0 1 1 1.42-1.4L11 12.6V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 0 1 1h12a1 1 0 1 0 0-2H6a1 1 0 0 0-1 1z" />
                      </svg>
                      Export
                    </button>
                    <div className="relative group">
                      <button
                        onClick={() => openImageDownloads(compose)}
                        className={`rounded-lg border px-3 py-1 text-sm ${
                          imageDownloadsEnabled
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                        disabled={!imageDownloadsEnabled}
                        title={
                          imageDownloadsEnabled
                            ? "Download images"
                            : "Configure Docker socket and registry credentials to enable"
                        }
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="mr-2 inline-block h-4 w-4"
                          fill="currentColor"
                        >
                          <path d="M19 13a1 1 0 0 0-1 1v3H6v-3a1 1 0 1 0-2 0v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3a1 1 0 0 0-1-1zm-7-9a1 1 0 0 0-1 1v7.59L8.7 10.3a1 1 0 0 0-1.4 1.42l4.01 4.01a1 1 0 0 0 1.4 0l4.01-4.01a1 1 0 1 0-1.4-1.42L13 12.6V5a1 1 0 0 0-1-1z" />
                        </svg>
                        Download Images
                      </button>
                      {!imageDownloadsEnabled ? (
                        <div className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 translate-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg group-hover:block">
                          Configure Docker socket + registry envs to enable
                        </div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => openSnapshots(compose)}
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-700"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="mr-2 inline-block h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M4 6a2 2 0 0 1 2-2h7l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm9 0v4h4" />
                      </svg>
                      Snapshots
                    </button>
                    <Link
                      href={`/compose/${compose.id}`}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-sm text-sky-700"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="inline-block h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75L4 17.25zm15.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.83 1.83 2.75 2.75 1.99-1.66z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(compose.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-sm text-rose-700"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="inline-block h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {isDuplicateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Duplicate compose
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a name for the new compose version.
            </p>
            <input
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
              placeholder="Compose name"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDuplicateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {snapshotsOpen && snapshotTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Snapshots
                </h2>
                <p className="text-sm text-slate-500">
                  {snapshotTarget.name} · {project.name}
                </p>
              </div>
              <button
                onClick={() => setSnapshotsOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                disabled={snapshotSaving}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Snapshot name
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  value={snapshotName}
                  onChange={(event) => setSnapshotName(event.target.value)}
                  placeholder="v1.0 baseline"
                />
              </label>
              <label className="text-sm text-slate-600">
                Description
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  value={snapshotDescription}
                  onChange={(event) =>
                    setSnapshotDescription(event.target.value)
                  }
                  placeholder="What changed?"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapshotOptions.includeCompose}
                  onChange={(event) =>
                    setSnapshotOptions((prev) => ({
                      ...prev,
                      includeCompose: event.target.checked,
                    }))
                  }
                />
                Compose file
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapshotOptions.includeConfigs}
                  onChange={(event) =>
                    setSnapshotOptions((prev) => ({
                      ...prev,
                      includeConfigs: event.target.checked,
                    }))
                  }
                />
                Configurations
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapshotOptions.includeScripts}
                  onChange={(event) =>
                    setSnapshotOptions((prev) => ({
                      ...prev,
                      includeScripts: event.target.checked,
                    }))
                  }
                />
                Scripts
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={snapshotOptions.includeUtilities}
                  onChange={(event) =>
                    setSnapshotOptions((prev) => ({
                      ...prev,
                      includeUtilities: event.target.checked,
                    }))
                  }
                />
                Utilities
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              {snapshotsError ? (
                <p className="text-sm text-rose-600">{snapshotsError}</p>
              ) : (
                <span />
              )}
              <button
                onClick={handleCreateSnapshot}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                disabled={snapshotSaving}
              >
                {snapshotSaving ? "Saving..." : "Create snapshot"}
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700">
                Saved snapshots
              </h3>
              {snapshots.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No snapshots yet.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {snapshot.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {snapshot.description || "No description"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(snapshot.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadSnapshot(snapshot)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {imagesOpen && imageTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Download images
                </h2>
                <p className="text-sm text-slate-500">
                  {imageTarget.name} · {project.name}
                </p>
              </div>
              <button
                onClick={() => setImagesOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                disabled={imagesDownloading}
              >
                Close
              </button>
            </div>

            {imagesLoading ? (
              <p className="mt-6 text-sm text-slate-500">Loading images...</p>
            ) : (
              <div className="mt-6 flex flex-1 flex-col gap-6 overflow-auto">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Requested downloads
                  </h3>
                  {imageDownloads.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No downloads requested yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {imageDownloads.map((download) => (
                        <div
                          key={download.id}
                          className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {download.fileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(download.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                download.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : download.status === "failed"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {download.status}
                            </span>
                          </div>
                          {download.images.length > 0 ? (
                            <div className="mt-2 text-xs text-slate-500">
                              {download.images.map((item) => (
                                <p key={item.image}>
                                  {(item.services[0] || "Service") + " · "}
                                  {item.image} · {item.version}
                                </p>
                              ))}
                            </div>
                          ) : null}
                          {download.errorMessage ? (
                            <p className="mt-2 text-xs text-rose-600">
                              {download.errorMessage}
                            </p>
                          ) : null}
                          {download.status === "completed" ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleDownloadImageTar(download)}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                              >
                                Download tar
                              </button>
                              <button
                                onClick={() => handleDeleteImageDownload(download)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Available images
                    </h3>
                    {imageOptions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const nextSelections: Record<string, boolean> = {};
                          imageOptions.forEach((option) => {
                            nextSelections[option.image] = !allImagesSelected;
                          });
                          setImageSelections(nextSelections);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        {allImagesSelected ? "Deselect all" : "Select all"}
                      </button>
                    ) : null}
                  </div>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="Search images..."
                    value={imageSearch}
                    onChange={(event) => setImageSearch(event.target.value)}
                  />
                  {imageOptions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No images available for this compose.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sortedImageOptions.map((option) => (
                        <label
                          key={option.image}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={Boolean(imageSelections[option.image])}
                            onChange={() =>
                              setImageSelections((prev) => ({
                                ...prev,
                                [option.image]: !prev[option.image],
                              }))
                            }
                          />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {option.services[0] || "Service"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {option.image}
                            </p>
                            <p className="text-xs text-slate-500">
                              Version: {option.version}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {imagesError ? (
              <p className="mt-4 text-sm text-rose-600">{imagesError}</p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setImagesOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                disabled={imagesDownloading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateImageDownload}
                className="rounded-full border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                disabled={
                  imagesDownloading ||
                  imageOptions.length === 0 ||
                  selectedImageCount === 0
                }
              >
                {imagesDownloading ? "Downloading..." : "Download images"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {snapshotSaving ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <p className="text-sm font-semibold text-slate-900">
              Creating snapshot
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please wait while we save the zip.
            </p>
          </div>
        </div>
      ) : null}

      {exportOpen && exportTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Export</h2>
                <p className="text-sm text-slate-500">
                  {exportTarget.name} · {project.name}
                </p>
              </div>
              <button
                onClick={() => setExportOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
                disabled={exporting}
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCompose}
                  onChange={(event) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeCompose: event.target.checked,
                    }))
                  }
                />
                Compose file
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeConfigs}
                  onChange={(event) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeConfigs: event.target.checked,
                    }))
                  }
                />
                Configurations
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeScripts}
                  onChange={(event) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeScripts: event.target.checked,
                    }))
                  }
                />
                Scripts
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeUtilities}
                  onChange={(event) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeUtilities: event.target.checked,
                    }))
                  }
                />
                Utilities
              </label>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  Include downloaded images
                </h3>
                <span className="text-xs text-slate-400">
                  Optional
                </span>
              </div>
              {exportImagesLoading ? (
                <p className="mt-3 text-xs text-slate-500">
                  Loading downloaded images...
                </p>
              ) : exportImageDownloads.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  No downloaded image archives available for this compose.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {exportImageDownloads.map((download) => (
                    <label
                      key={download.id}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(exportImageSelections[download.id])}
                        onChange={() =>
                          setExportImageSelections((prev) => ({
                            ...prev,
                            [download.id]: !prev[download.id],
                          }))
                        }
                      />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {download.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(download.createdAt).toLocaleString()}
                        </p>
                        {download.images.length > 0 ? (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExportImageDetailsOpen((prev) => ({
                                  ...prev,
                                  [download.id]: !prev[download.id],
                                }))
                              }
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                              {exportImageDetailsOpen[download.id]
                                ? "Hide images"
                                : `Show images (${download.images.length})`}
                            </button>
                            {exportImageDetailsOpen[download.id] ? (
                              <div className="mt-2 max-h-24 space-y-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-600">
                                {download.images.map((item) => (
                                  <p key={item.image}>
                                    {item.image} · {item.version}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {exportImagesError ? (
                <p className="mt-3 text-xs text-rose-600">{exportImagesError}</p>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setExportOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                disabled={exporting}
              >
                {exporting ? "Preparing..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exporting ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <p className="text-sm font-semibold text-slate-900">
              Preparing download
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please wait while we build the zip.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
