export type ThemePalette = "stone" | "claude" | "claude-twilight" | "claude-midnight" | "claude-dusk";
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
  {
    id: "claude-twilight",
    name: "Claude Twilight",
    description: "Between ink and dusk — warm charcoal with clearer separation.",
    preview: {
      light: { bg: "#f5f4ed", card: "#faf9f5", accent: "#c96442", ink: "#141413" },
      dark: { bg: "#272522", card: "#312e2a", accent: "#d97757", ink: "#f5f2eb" },
    },
  },
  {
    id: "claude-midnight",
    name: "Claude Midnight",
    description: "Deeper charcoal — layered surfaces use background tints like Swagger.",
    preview: {
      light: { bg: "#f5f4ed", card: "#faf9f5", accent: "#c96442", ink: "#141413" },
      dark: { bg: "#1a1816", card: "#1a1816", accent: "#d97757", ink: "#f0ebe3" },
    },
  },
  {
    id: "claude-dusk",
    name: "Claude Dusk",
    description: "Lifted charcoal dark with stronger borders and contrast.",
    preview: {
      light: { bg: "#f5f4ed", card: "#faf9f5", accent: "#c96442", ink: "#141413" },
      dark: { bg: "#2e2b27", card: "#38342f", accent: "#d97757", ink: "#faf6f0" },
    },
  },
];

export const isPalette = (value: string | null): value is ThemePalette =>
  value === "stone" || value === "claude" || value === "claude-twilight" || value === "claude-midnight" || value === "claude-dusk";

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
