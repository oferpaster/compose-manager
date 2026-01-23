"use client";

import type { SnapshotRow } from "./types";

type SnapshotOptions = {
  includeCompose: boolean;
  includeConfigs: boolean;
  includeScripts: boolean;
  includeUtilities: boolean;
};

type SnapshotsModalProps = {
  open: boolean;
  targetName: string;
  projectName: string;
  snapshotName: string;
  snapshotDescription: string;
  snapshotOptions: SnapshotOptions;
  snapshots: SnapshotRow[];
  snapshotsError: string;
  snapshotSaving: boolean;
  onClose: () => void;
  onSnapshotNameChange: (value: string) => void;
  onSnapshotDescriptionChange: (value: string) => void;
  onOptionChange: (key: keyof SnapshotOptions, value: boolean) => void;
  onCreateSnapshot: () => void;
  onDownloadSnapshot: (snapshot: SnapshotRow) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
};

export default function SnapshotsModal({
  open,
  targetName,
  projectName,
  snapshotName,
  snapshotDescription,
  snapshotOptions,
  snapshots,
  snapshotsError,
  snapshotSaving,
  onClose,
  onSnapshotNameChange,
  onSnapshotDescriptionChange,
  onOptionChange,
  onCreateSnapshot,
  onDownloadSnapshot,
  onDeleteSnapshot,
}: SnapshotsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Snapshots</h2>
            <p className="text-sm text-slate-500">
              {targetName} · {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
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
              onChange={(event) => onSnapshotNameChange(event.target.value)}
              placeholder="v1.0 baseline"
            />
          </label>
          <label className="text-sm text-slate-600">
            Description
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={snapshotDescription}
              onChange={(event) =>
                onSnapshotDescriptionChange(event.target.value)
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
                onOptionChange("includeCompose", event.target.checked)
              }
            />
            Compose file
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapshotOptions.includeConfigs}
              onChange={(event) =>
                onOptionChange("includeConfigs", event.target.checked)
              }
            />
            Configurations
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapshotOptions.includeScripts}
              onChange={(event) =>
                onOptionChange("includeScripts", event.target.checked)
              }
            />
            Scripts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapshotOptions.includeUtilities}
              onChange={(event) =>
                onOptionChange("includeUtilities", event.target.checked)
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
            onClick={onCreateSnapshot}
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
                      onClick={() => onDownloadSnapshot(snapshot)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => onDeleteSnapshot(snapshot.id)}
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
  );
}
