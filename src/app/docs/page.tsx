"use client";

import { useEffect } from "react";
import Link from "next/link";
import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle";

export default function DocsPage() {
  useEffect(() => {
    SwaggerUIBundle({
      url: "/api/openapi",
      dom_id: "#swagger-ui",
      deepLinking: true,
      displayRequestDuration: true,
      docExpansion: "list",
      filter: true,
    });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            ComposeBuilder
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">API Docs</h1>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
        >
          Back to projects
        </Link>
      </header>

      <div className="mx-auto mt-6 w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div id="swagger-ui" />
      </div>
    </main>
  );
}
