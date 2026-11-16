"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const THEME_IDS = [
  "obsidian",
  "mangrove",
  "graphite",
  "phosphor",
  "cobalt",
  "violet",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  obsidian: "Obsidian",
  mangrove: "Mangrove",
  graphite: "Graphite",
  phosphor: "Phosphor",
  cobalt: "Cobalt",
  violet: "Violet",
};

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "overlord-theme";

function isThemeId(v: string | null | undefined): v is ThemeId {
  return !!v && (THEME_IDS as readonly string[]).includes(v);
}

/** Migrate legacy night/day prefs. */
function normalizeTheme(raw: string | null | undefined): ThemeId {
  if (raw === "night") return "obsidian";
  if (raw === "day") return "graphite";
  if (isThemeId(raw)) return raw;
  return "obsidian";
}

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("obsidian");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = normalizeTheme(
      stored ?? document.documentElement.dataset.theme,
    );
    setThemeState(initial);
    applyTheme(initial);
    if (stored === "night" || stored === "day") {
      window.localStorage.setItem(STORAGE_KEY, initial);
    }
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    applyTheme(t);
    window.localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Graphite (and legacy day) are light; all others use dimmed OSM tiles. */
export function isDarkTheme(theme: ThemeId | string): boolean {
  return theme !== "graphite" && theme !== "day";
}
