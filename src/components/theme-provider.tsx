import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  resolveMode,
  type ResolvedMode,
  type ThemeMode,
  type ThemePalette,
} from "@/lib/theme";

type ThemeContextValue = {
  palette: ThemePalette;
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  setPalette: (palette: ThemePalette) => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [palette, setPaletteState] = useState<ThemePalette>("stone");
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedMode, setResolvedMode] = useState<ResolvedMode>("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    setPaletteState(stored.palette);
    setModeState(stored.mode);
    applyTheme(stored.palette, stored.mode);
    setResolvedMode(resolveMode(stored.mode));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme(palette, mode);
      setResolvedMode(resolveMode(mode));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [palette, mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette,
      mode,
      resolvedMode,
      setPalette: (next) => {
        setPaletteState(next);
        persistTheme(next, mode);
        applyTheme(next, mode);
        setResolvedMode(resolveMode(mode));
      },
      setMode: (next) => {
        setModeState(next);
        persistTheme(palette, next);
        applyTheme(palette, next);
        setResolvedMode(resolveMode(next));
      },
    }),
    [palette, mode, resolvedMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
