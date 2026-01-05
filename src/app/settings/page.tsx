import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">Settings</p>
            <h1 className="text-3xl font-semibold text-slate-900">Project settings</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
          >
            ← Back to projects
          </Link>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage service templates and defaults.
          </p>
          <div className="mt-4">
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Open templates
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Scripts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Store utility scripts to ship with compose exports.
          </p>
          <div className="mt-4">
            <Link
              href="/scripts"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Open scripts
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Utilities</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload tools and installers to include in exports.
          </p>
          <div className="mt-4">
            <Link
              href="/utilities"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Open utilities
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Networks</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure the default networks for compose services.
          </p>
          <div className="mt-4">
            <Link
              href="/networks"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Open networks
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
