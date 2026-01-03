"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ComposeEditor from "@/components/ComposeEditor";
import { ComposeConfig } from "@/lib/compose";

export default function ComposeDetailPage() {
  const params = useParams<{ id: string }>();
  const [config, setConfig] = useState<ComposeConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/composes/${params.id}`);
      if (!response.ok) {
        setError("Compose not found");
        return;
      }
      const data = (await response.json()) as { config: ComposeConfig };
      setConfig(data.config);
    }

    load().catch(() => setError("Failed to load compose"));
  }, [params.id]);

  const handleSave = async (nextConfig: ComposeConfig) => {
    const response = await fetch(`/api/composes/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextConfig.name, config: nextConfig }),
    });

    if (!response.ok) {
      throw new Error("Failed to save compose");
    }

    const data = (await response.json()) as { config: ComposeConfig };
    setConfig(data.config);
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

  if (!config) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Loading compose...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="w-full">
        <ComposeEditor initialConfig={config} onSave={handleSave} />
      </div>
    </main>
  );
}
