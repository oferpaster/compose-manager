"use client";

import { DragEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const emptyUtility = {
  name: "",
  fileName: "",
  file: null as File | null,
};

type UtilityPayload = typeof emptyUtility & { id?: string; file_name?: string };

export default function UtilityEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [utility, setUtility] = useState<UtilityPayload>(emptyUtility);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");
  const [isDragging, setIsDragging] = useState(false);
  const hasFile = Boolean(utility.fileName);

  useEffect(() => {
    async function load() {
      if (params.id === "new") {
        setUtility(emptyUtility);
        return;
      }
      const response = await fetch(`/api/utilities/${params.id}`);
      if (!response.ok) {
        setSaveMessage("Utility not found");
        setSaveStatus("error");
        return;
      }
      const data = (await response.json()) as { utility: UtilityPayload };
      setUtility({
        ...emptyUtility,
        ...data.utility,
        fileName: data.utility.fileName || data.utility.file_name || "",
      });
    }

    load().catch(() => {
      setSaveMessage("Failed to load utility");
      setSaveStatus("error");
    });
  }, [params.id]);

  const handleFileUpload = (file: File) => {
    setUtility((prev) => ({
      ...prev,
      file,
      fileName: file.name,
    }));
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const form = new FormData();
      form.append("name", utility.name || "");
      if (utility.file) {
        form.append("file", utility.file, utility.fileName || "utility.bin");
      } else if (params.id === "new") {
        throw new Error("Please upload a file");
      }

      if (params.id === "new") {
        const response = await fetch("/api/utilities", {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          throw new Error("Failed to create utility");
        }
        router.push("/utilities");
        setSaveMessage("Saved");
        setSaveStatus("success");
        return;
      }

      const response = await fetch(`/api/utilities/${params.id}`, {
        method: "PUT",
        body: form,
      });
      if (!response.ok) {
        throw new Error("Failed to save utility");
      }
      router.push("/utilities");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Utility</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {params.id === "new"
                ? "New utility"
                : utility.name || utility.fileName || "Edit utility"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/utilities")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to utilities
            </button>
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save utility"}
            </button>
          </div>
        </header>

        {saveMessage ? (
          <div
            className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              saveStatus === "success"
                ? "border-emerald-200 bg-emerald-500 text-white"
                : "border-rose-200 bg-rose-500 text-white"
            }`}
          >
            {saveMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Name (optional)
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={utility.name}
                onChange={(event) =>
                  setUtility({ ...utility, name: event.target.value })
                }
                placeholder="pgAdmin"
              />
            </label>
            <label className="text-sm text-slate-600">
              File name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={utility.fileName || ""}
                readOnly
                placeholder="Upload a file to set the name"
              />
            </label>
          </div>

          <div
            className={`mt-4 rounded-2xl border border-dashed px-4 py-6 text-sm transition ${
              isDragging
                ? "border-slate-900 bg-slate-100 text-slate-700"
                : "border-slate-200 bg-white text-slate-500"
            } ${hasFile ? "cursor-not-allowed opacity-70" : ""}`}
            onDragOver={(event) => {
              if (hasFile) return;
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={hasFile ? undefined : handleDrop}
          >
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 ${
                  hasFile ? "pointer-events-none opacity-60" : ""
                }`}
              >
                Upload file
                <input
                  type="file"
                  className="hidden"
                  disabled={hasFile}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
              <span>{hasFile ? "File attached" : "or drag & drop a file here"}</span>
              {hasFile ? (
                <button
                  type="button"
                  onClick={() =>
                    setUtility((prev) => ({
                      ...prev,
                      file: null,
                      fileName: "",
                    }))
                  }
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
                >
                  Remove file
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Any file type is supported. If no name is provided, the file name
              will be used.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
