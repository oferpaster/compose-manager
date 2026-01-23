"use client";

import type { ImageDownloadRow } from "./types";

type ExportOptions = {
  includeCompose: boolean;
  includeConfigs: boolean;
  includeScripts: boolean;
  includeUtilities: boolean;
};

type ExportModalProps = {
  open: boolean;
  targetName: string;
  projectName: string;
  exportOptions: ExportOptions;
  exportImageDownloads: ImageDownloadRow[];
  exportImageSelections: Record<string, boolean>;
  exportImageDetailsOpen: Record<string, boolean>;
  exportImagesLoading: boolean;
  exportImagesError: string;
  exporting: boolean;
  onClose: () => void;
  onOptionChange: (key: keyof ExportOptions, value: boolean) => void;
  onToggleDownload: (downloadId: string) => void;
  onToggleDetails: (downloadId: string) => void;
  onConfirm: () => void;
};

export default function ExportModal({
  open,
  targetName,
  projectName,
  exportOptions,
  exportImageDownloads,
  exportImageSelections,
  exportImageDetailsOpen,
  exportImagesLoading,
  exportImagesError,
  exporting,
  onClose,
  onOptionChange,
  onToggleDownload,
  onToggleDetails,
  onConfirm,
}: ExportModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Export</h2>
            <p className="text-sm text-slate-500">
              {targetName} · {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
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
                onOptionChange("includeCompose", event.target.checked)
              }
            />
            Compose file
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportOptions.includeConfigs}
              onChange={(event) =>
                onOptionChange("includeConfigs", event.target.checked)
              }
            />
            Configurations
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportOptions.includeScripts}
              onChange={(event) =>
                onOptionChange("includeScripts", event.target.checked)
              }
            />
            Scripts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportOptions.includeUtilities}
              onChange={(event) =>
                onOptionChange("includeUtilities", event.target.checked)
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
            <span className="text-xs text-slate-400">Optional</span>
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
                    onChange={() => onToggleDownload(download.id)}
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
                          onClick={() => onToggleDetails(download.id)}
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
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            disabled={exporting}
          >
            {exporting ? "Preparing..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
