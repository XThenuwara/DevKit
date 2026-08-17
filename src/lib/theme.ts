export type ThemePalette = "stone" | "claude";
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedMode = "light" | "dark";

export const PALETTE_STORAGE_KEY = "devkit-theme-palette";
export const MODE_STORAGE_KEY = "theme";

export type PalettePreview = {
  bg: string;
  card: string;
  accent: string;
  ink: string;
};

export type PaletteOption = {
  id: ThemePalette;
  name: string;
  description: string;
  preview: { light: PalettePreview; dark: PalettePreview };
};

export const PALETTES: PaletteOption[] = [
  {
    id: "stone",
    name: "Stone",
    description: "Warm gray surfaces with quiet contrast.",
    preview: {
      light: { bg: "#f2efe9", card: "#fbfaf7", accent: "#4a453e", ink: "#3a362f" },
      dark: { bg: "#2a2622", card: "#3a3530", accent: "#c9bba8", ink: "#f3eee6" },
    },
  },
  {
    id: "claude",
    name: "Claude",
    description: "Cream canvas, terracotta accent, editorial type.",
    preview: {
      light: { bg: "#f5f4ed", card: "#faf9f5", accent: "#c96442", ink: "#141413" },
      dark: { bg: "#141413", card: "#1f1e1b", accent: "#d97757", ink: "#faf9f5" },
    },
  },
];

export const isPalette = (value: string | null): value is ThemePalette =>
  value === "stone" || value === "claude";

export const isMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

export const getSystemDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export const resolveMode = (mode: ThemeMode): ResolvedMode => {
  if (mode === "system") return getSystemDark() ? "dark" : "light";
  return mode;
};

export const readStoredTheme = (): { palette: ThemePalette; mode: ThemeMode } => {
  const palette = localStorage.getItem(PALETTE_STORAGE_KEY);
  const mode = localStorage.getItem(MODE_STORAGE_KEY);
  return {
    palette: isPalette(palette) ? palette : "stone",
    mode: isMode(mode) ? mode : "system",
  };
};

export const applyTheme = (palette: ThemePalette, mode: ThemeMode) => {
  const root = document.documentElement;
  const dark = resolveMode(mode) === "dark";
  root.dataset.theme = palette;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
};

export const persistTheme = (palette: ThemePalette, mode: ThemeMode) => {
  localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  localStorage.setItem(MODE_STORAGE_KEY, mode);
};
