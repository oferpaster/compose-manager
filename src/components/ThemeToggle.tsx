"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "composebuilder-theme";
const THEME_EVENT = "composebuilder-theme-change";
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

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  return stored && THEMES.includes(stored) ? stored : "auto";
}

export default function ThemeToggle() {
  const mode = useSyncExternalStore<ThemeMode>(
    (listener) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => listener();
      window.addEventListener("storage", handler);
      window.addEventListener(THEME_EVENT, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(THEME_EVENT, handler);
      };
    },
    () => getStoredTheme(),
    () => "auto"
  );

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const cycleMode = () => {
    const currentIndex = THEMES.indexOf(mode);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
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
