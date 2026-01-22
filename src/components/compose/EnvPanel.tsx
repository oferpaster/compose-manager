"use client";

type EnvPanelProps = {
  envFile: string;
  onOpenEditor: () => void;
  onCopy: () => void;
  copied: boolean;
};

export default function EnvPanel({
  envFile,
  onOpenEditor,
  onCopy,
  copied,
}: EnvPanelProps) {
  return (
    <aside className="min-w-0 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">.env</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenEditor}
            className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Edit .env
          </button>
          <button
            onClick={onCopy}
            className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
            live
          </span>
        </div>
      </div>
      <pre className="mt-4 h-[78vh] overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed">
        {envFile || "# No global environment variables yet."}
      </pre>
    </aside>
  );
}
