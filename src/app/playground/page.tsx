"use client";

import { useMemo } from "react";
import ComposeEditor from "@/components/ComposeEditor";
import { ComposeConfig, normalizeComposeConfig } from "@/lib/compose";

export default function ComposePlaygroundPage() {
  const initialConfig = useMemo<ComposeConfig>(
    () =>
      normalizeComposeConfig({
        id: "playground",
        projectId: "",
        name: "Compose Playground",
        globalEnv: [],
        networks: [],
        services: [],
        scriptIds: [],
        utilityIds: [],
      }),
    []
  );

  return (
    <main className="h-screen overflow-hidden bg-slate-50 px-6 py-12">
      <div className="h-full w-full">
        <ComposeEditor
          initialConfig={initialConfig}
          onSave={async () => {}}
          mode="playground"
        />
      </div>
    </main>
  );
}
