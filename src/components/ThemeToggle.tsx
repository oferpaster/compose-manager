"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "composebuilder-theme";
const THEMES = ["auto", "light", "dark"] as const;

type ThemeMode = (typeof THEMES)[number];

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "auto") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", mode);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial = stored && THEMES.includes(stored) ? stored : "auto";
    setMode(initial);
    applyTheme(initial);
  }, []);

  const cycleMode = () => {
    const currentIndex = THEMES.indexOf(mode);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  const label =
    mode === "auto"
      ? "Theme: Auto"
      : mode === "light"
      ? "Theme: Light"
      : "Theme: Dark";

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="theme-toggle fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur"
      aria-label={label}
      title={label}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-[10px] text-white">
        {mode === "auto" ? "A" : mode === "light" ? "L" : "D"}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
