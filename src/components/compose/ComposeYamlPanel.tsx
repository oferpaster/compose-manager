"use client";

import { MutableRefObject } from "react";

type ComposeYamlPanelProps = {
  composeYaml: string;
  highlightLines: Set<number>;
  onSortByGroup: () => void;
  onOpenEditor: () => void;
  onCopy: () => void;
  copied: boolean;
  scrollRef: MutableRefObject<HTMLPreElement | null>;
};

export default function ComposeYamlPanel({
  composeYaml,
  highlightLines,
  onSortByGroup,
  onOpenEditor,
  onCopy,
  copied,
  scrollRef,
}: ComposeYamlPanelProps) {
  return (
    <aside className="min-w-0 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">docker-compose.yml</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onSortByGroup}
            className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Sort by Group
          </button>
          <button
            onClick={onOpenEditor}
            className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Edit YAML
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
      <pre
        className="mt-4 h-[78vh] overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed"
        ref={scrollRef}
      >
        <code className="block whitespace-pre">
          {composeYaml.split("\n").map((line, index) => (
            <span
              key={`compose-line-${index}`}
              data-line-index={index}
              className={`block ${
                highlightLines.has(index) ? "bg-amber-400/20 text-amber-100" : ""
              }`}
            >
              {line.length ? line : " "}
            </span>
          ))}
        </code>
      </pre>
    </aside>
  );
}
