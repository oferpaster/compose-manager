"use client";

import type { ImageDownloadRow, ImageOption } from "./types";

type ImageDownloadsModalProps = {
  open: boolean;
  targetName: string;
  projectName: string;
  imageOptions: ImageOption[];
  sortedImageOptions: ImageOption[];
  imageDownloads: ImageDownloadRow[];
  imageSelections: Record<string, boolean>;
  imagesLoading: boolean;
  imagesError: string;
  imagesDownloading: boolean;
  imageSearch: string;
  selectedImageCount: number;
  allImagesSelected: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onToggleAll: () => void;
  onToggleImage: (image: string) => void;
  onCreateDownload: () => void;
  onDownloadTar: (download: ImageDownloadRow) => void;
  onDeleteDownload: (download: ImageDownloadRow) => void;
};

export default function ImageDownloadsModal({
  open,
  targetName,
  projectName,
  imageOptions,
  sortedImageOptions,
  imageDownloads,
  imageSelections,
  imagesLoading,
  imagesError,
  imagesDownloading,
  imageSearch,
  selectedImageCount,
  allImagesSelected,
  onClose,
  onSearchChange,
  onToggleAll,
  onToggleImage,
  onCreateDownload,
  onDownloadTar,
  onDeleteDownload,
}: ImageDownloadsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Download images
            </h2>
            <p className="text-sm text-slate-500">
              {targetName} · {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
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
                            onClick={() => onDownloadTar(download)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                          >
                            Download tar
                          </button>
                          <button
                            onClick={() => onDeleteDownload(download)}
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
                    onClick={onToggleAll}
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
                onChange={(event) => onSearchChange(event.target.value)}
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
                        onChange={() => onToggleImage(option.image)}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {option.services[0] || "Service"}
                        </p>
                        <p className="text-xs text-slate-500">{option.image}</p>
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
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
            disabled={imagesDownloading}
          >
            Cancel
          </button>
          <button
            onClick={onCreateDownload}
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
  );
}
