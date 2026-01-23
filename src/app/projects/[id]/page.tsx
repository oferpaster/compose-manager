"use client";

import { useParams, useRouter } from "next/navigation";

import ComposeVersionsSection from "./components/ComposeVersionsSection";
import DuplicateComposeModal from "./components/DuplicateComposeModal";
import ExportModal from "./components/ExportModal";
import ImageDownloadsModal from "./components/ImageDownloadsModal";
import LoadingOverlay from "./components/LoadingOverlay";
import ProjectHeader from "./components/ProjectHeader";
import ProjectStatusCard from "./components/ProjectStatusCard";
import SnapshotsModal from "./components/SnapshotsModal";
import useComposeSearch from "./hooks/useComposeSearch";
import useDuplicateCompose from "./hooks/useDuplicateCompose";
import useExport from "./hooks/useExport";
import useImageDownloads from "./hooks/useImageDownloads";
import useProjectData from "./hooks/useProjectData";
import useSnapshots from "./hooks/useSnapshots";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    project,
    composes,
    setComposes,
    capabilities,
    error,
    setError,
  } = useProjectData(params.id);

  const { searchTerm, setSearchTerm, filteredComposes } =
    useComposeSearch(composes);

  const {
    isDuplicateOpen,
    duplicateName,
    setDuplicateName,
    openDuplicate,
    setIsDuplicateOpen,
    handleDuplicate,
  } = useDuplicateCompose({
    project,
    onError: setError,
    onNavigate: (composeId) => router.push(`/compose/${composeId}`),
  });

  const {
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
  } = useSnapshots();

  const {
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
  } = useImageDownloads();

  const {
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
  } = useExport({ projectName: project?.name ?? null, onError: setError });

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

  const imageDownloadsEnabled = Boolean(capabilities?.imageDownloads);

  if (error) {
    return <ProjectStatusCard message={error} />;
  }

  if (!project) {
    return <ProjectStatusCard message="Loading project..." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <ProjectHeader projectName={project.name} onCreate={handleCreate} />
        <ComposeVersionsSection
          composes={composes}
          filteredComposes={filteredComposes}
          searchTerm={searchTerm}
          imageDownloadsEnabled={imageDownloadsEnabled}
          onSearchChange={setSearchTerm}
          onDuplicate={openDuplicate}
          onExport={openExport}
          onOpenImages={openImageDownloads}
          onOpenSnapshots={openSnapshots}
          onDelete={handleDelete}
        />
      </div>

      <DuplicateComposeModal
        open={isDuplicateOpen}
        duplicateName={duplicateName}
        onDuplicateNameChange={setDuplicateName}
        onClose={() => setIsDuplicateOpen(false)}
        onConfirm={handleDuplicate}
      />

      <SnapshotsModal
        open={Boolean(snapshotsOpen && snapshotTarget)}
        targetName={snapshotTarget?.name ?? ""}
        projectName={project.name}
        snapshotName={snapshotName}
        snapshotDescription={snapshotDescription}
        snapshotOptions={snapshotOptions}
        snapshots={snapshots}
        snapshotsError={snapshotsError}
        snapshotSaving={snapshotSaving}
        onClose={() => setSnapshotsOpen(false)}
        onSnapshotNameChange={setSnapshotName}
        onSnapshotDescriptionChange={setSnapshotDescription}
        onOptionChange={(key, value) =>
          setSnapshotOptions((prev) => ({ ...prev, [key]: value }))
        }
        onCreateSnapshot={handleCreateSnapshot}
        onDownloadSnapshot={handleDownloadSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      <ImageDownloadsModal
        open={Boolean(imagesOpen && imageTarget)}
        targetName={imageTarget?.name ?? ""}
        projectName={project.name}
        imageOptions={imageOptions}
        sortedImageOptions={sortedImageOptions}
        imageDownloads={imageDownloads}
        imageSelections={imageSelections}
        imagesLoading={imagesLoading}
        imagesError={imagesError}
        imagesDownloading={imagesDownloading}
        imageSearch={imageSearch}
        selectedImageCount={selectedImageCount}
        allImagesSelected={allImagesSelected}
        onClose={() => setImagesOpen(false)}
        onSearchChange={setImageSearch}
        onToggleAll={() => {
          const nextSelections: Record<string, boolean> = {};
          imageOptions.forEach((option) => {
            nextSelections[option.image] = !allImagesSelected;
          });
          setImageSelections(nextSelections);
        }}
        onToggleImage={(image) =>
          setImageSelections((prev) => ({
            ...prev,
            [image]: !prev[image],
          }))
        }
        onCreateDownload={handleCreateImageDownload}
        onDownloadTar={handleDownloadImageTar}
        onDeleteDownload={handleDeleteImageDownload}
      />

      <LoadingOverlay
        open={snapshotSaving}
        title="Creating snapshot"
        description="Please wait while we save the zip."
      />

      <ExportModal
        open={Boolean(exportOpen && exportTarget)}
        targetName={exportTarget?.name ?? ""}
        projectName={project.name}
        exportOptions={exportOptions}
        exportImageDownloads={exportImageDownloads}
        exportImageSelections={exportImageSelections}
        exportImageDetailsOpen={exportImageDetailsOpen}
        exportImagesLoading={exportImagesLoading}
        exportImagesError={exportImagesError}
        exporting={exporting}
        onClose={() => setExportOpen(false)}
        onOptionChange={(key, value) =>
          setExportOptions((prev) => ({ ...prev, [key]: value }))
        }
        onToggleDownload={(downloadId) =>
          setExportImageSelections((prev) => ({
            ...prev,
            [downloadId]: !prev[downloadId],
          }))
        }
        onToggleDetails={(downloadId) =>
          setExportImageDetailsOpen((prev) => ({
            ...prev,
            [downloadId]: !prev[downloadId],
          }))
        }
        onConfirm={handleExport}
      />

      <LoadingOverlay
        open={exporting}
        title="Preparing download"
        description="Please wait while we build the zip."
      />
    </main>
  );
}
