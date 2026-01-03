"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const emptyScript = {
  name: "",
  fileName: "script.sh",
  description: "",
  usage: "",
  content: "",
};

type ScriptPayload = typeof emptyScript & { id?: string; file_name?: string };

export default function ScriptEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [script, setScript] = useState<ScriptPayload>(emptyScript);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");

  useEffect(() => {
    async function load() {
      if (params.id === "new") {
        setScript(emptyScript);
        return;
      }
      const response = await fetch(`/api/scripts/${params.id}`);
      if (!response.ok) {
        setSaveMessage("Script not found");
        setSaveStatus("error");
        return;
      }
      const data = (await response.json()) as { script: ScriptPayload };
      setScript({
        ...emptyScript,
        ...data.script,
        fileName: data.script.fileName || data.script.file_name || "script.sh",
      });
    }

    load().catch(() => {
      setSaveMessage("Failed to load script");
      setSaveStatus("error");
    });
  }, [params.id]);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setScript((prev) => ({ ...prev, content: text }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      if (params.id === "new") {
        const response = await fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(script),
        });
        if (!response.ok) {
          throw new Error("Failed to create script");
        }
        const data = (await response.json()) as { id: string };
        router.replace(`/scripts/${data.id}`);
        setSaveMessage("Saved");
        setSaveStatus("success");
        return;
      }

      const response = await fetch(`/api/scripts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(script),
      });
      if (!response.ok) {
        throw new Error("Failed to save script");
      }
      setSaveMessage("Saved");
      setSaveStatus("success");
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
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Script
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {params.id === "new"
                ? "New script"
                : script.name || "Edit script"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/scripts")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to scripts
            </button>
            <button
              onClick={handleSave}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save script"}
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
              Name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={script.name}
                onChange={(event) =>
                  setScript({ ...script, name: event.target.value })
                }
                placeholder="Script name"
              />
            </label>
            <label className="text-sm text-slate-600">
              Script file name
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={script.fileName || ""}
                onChange={(event) =>
                  setScript({ ...script, fileName: event.target.value })
                }
                placeholder="script.sh"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Usage
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={script.usage}
                onChange={(event) =>
                  setScript({ ...script, usage: event.target.value })
                }
                placeholder="bash scripts/configure-db.sh"
              />
            </label>
            <label className="text-sm text-slate-600">
              Description
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={script.description}
                onChange={(event) =>
                  setScript({ ...script, description: event.target.value })
                }
                placeholder="Sets up database schema"
              />
            </label>
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-600">
              Script content
              <textarea
                className="mt-2 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900"
                value={script.content}
                onChange={(event) =>
                  setScript({ ...script, content: event.target.value })
                }
                placeholder="#!/usr/bin/env bash"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              Upload file
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
            <p className="text-xs text-slate-500">
              Upload a script file to populate the editor.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
