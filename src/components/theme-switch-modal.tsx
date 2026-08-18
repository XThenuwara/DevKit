import React from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { PALETTES, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODES: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

type ThemeSwitchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ThemeSwitchModal: React.FC<ThemeSwitchModalProps> = ({ open, onOpenChange }) => {
  const { palette, mode, resolvedMode, setPalette, setMode } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-5 rounded-2xl border-border/60 p-5 sm:max-w-lg"
      >
        <DialogHeader className="gap-1.5">
          <DialogTitle className="font-heading text-lg tracking-tight">Appearance</DialogTitle>
          <DialogDescription>Pick a theme and light or dark mode. Saved on this device.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Theme</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {PALETTES.map((item) => {
              const selected = palette === item.id;
              const swatch = item.preview[resolvedMode];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPalette(item.id)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-xl border text-left transition-all",
                    selected
                      ? "border-primary/50 ring-2 ring-primary/20"
                      : "border-border/70 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div className="relative h-[72px] p-2.5" style={{ background: swatch.bg }}>
                    <div
                      className="h-full rounded-lg border px-2 py-1.5 shadow-xs"
                      style={{ background: swatch.card, borderColor: `${swatch.ink}18` }}
                    >
                      <div className="mb-1.5 h-1.5 w-10 rounded-full" style={{ background: swatch.ink, opacity: 0.85 }} />
                      <div className="h-1 w-16 rounded-full" style={{ background: swatch.ink, opacity: 0.25 }} />
                      <div
                        className="mt-2 h-4 w-8 rounded-md"
                        style={{ background: swatch.accent }}
                      />
                    </div>
                    {selected ? (
                      <span
                        className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{ background: swatch.accent }}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-0.5 border-t border-border/50 bg-card px-3 py-2.5">
                    <span className="text-xs font-semibold text-foreground">{item.name}</span>
                    <span className="text-[10px] leading-snug text-muted-foreground">{item.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mode</p>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-1">
            {MODES.map((item) => {
              const Icon = item.icon;
              const selected = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all",
                    selected
                      ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ThemeSwitchButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="Appearance"
    className="p-2 hover:bg-muted/40 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
  >
    <Palette className="h-4 w-4" />
    <span className="sr-only">Appearance</span>
  </button>
);
