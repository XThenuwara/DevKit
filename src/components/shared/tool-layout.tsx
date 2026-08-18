import React from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { ArrowLeftRight, Trash2, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolLayoutProps {
  title?: string;
  description?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputValue?: string;
  outputPlaceholder?: string;
  outputLabel?: string;
  onSwap?: () => void;
  swapLabel?: string;
  controls?: React.ReactNode;
  children?: React.ReactNode;
  customInputActions?: React.ReactNode;
  customOutputActions?: React.ReactNode;
  allowPaste?: boolean;
  allowClear?: boolean;
  inputType?: "textarea" | "none";
  outputType?: "textarea" | "none";
  error?: string | null;
  outputChildren?: React.ReactNode;
}

export const ToolShell: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, actions, children, className }) => (
  <div className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden animate-in fade-in duration-300", className)}>
    <header className="flex shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="text-base font-extrabold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="line-clamp-1 text-[11px] leading-normal text-muted-foreground/80" title={description}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
    <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  </div>
);

export const ToolPanel: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-background", className)}>
    {children}
  </div>
);

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  title,
  description,
  inputValue = "",
  onInputChange,
  inputPlaceholder = "Enter input here...",
  inputLabel = "Input",
  outputValue = "",
  outputPlaceholder = "Output will appear here...",
  outputLabel = "Output",
  onSwap,
  swapLabel = "Swap",
  controls,
  children,
  customInputActions,
  customOutputActions,
  allowPaste = true,
  allowClear = true,
  inputType = "textarea",
  outputType = "textarea",
  error = null,
  outputChildren,
}) => {
  const handlePaste = async () => {
    if (!onInputChange) return;
    try {
      const text = await navigator.clipboard.readText();
      onInputChange(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  const handleClear = () => {
    if (onInputChange) {
      onInputChange("");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden animate-in fade-in duration-300">
      {/* Header & Configuration Controls Row */}
      {(title || controls) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Header */}
          {title && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <h1 className="font-heading text-base font-extrabold tracking-tight text-foreground">{title}</h1>
              <p className="text-[11px] text-muted-foreground/80 leading-normal line-clamp-1" title={description}>
                {description}
              </p>
            </div>
          )}

          {/* Configuration / Controls */}
          {controls && (
            <div className="px-3 py-1.5 rounded-lg border border-border/50 bg-background/50 text-xs shrink-0 flex items-center">
              {controls}
            </div>
          )}
        </div>
      )}

      {/* Main Workspace (Input & Output Columns) */}
      {(inputType !== "none" || outputType !== "none") && (
        <div className={`flex-1 min-h-0 grid gap-4 items-stretch overflow-hidden ${
          inputType !== "none" && outputType !== "none" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        }`}>
          {/* Input Panel */}
          {inputType !== "none" && (
            <div className="flex flex-col gap-1.5 h-full overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-foreground/85">{inputLabel}</span>
                <div className="flex items-center gap-1.5">
                  {customInputActions}
                  {allowPaste && onInputChange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePaste}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      title="Paste from clipboard"
                      type="button"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                      Paste
                    </Button>
                  )}
                  {allowClear && onInputChange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      title="Clear input"
                      type="button"
                      disabled={!inputValue}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <textarea
                value={inputValue}
                onChange={(e) => onInputChange?.(e.target.value)}
                placeholder={inputPlaceholder}
                className="flex-1 w-full min-h-0 p-3 rounded-xl border border-border/50 bg-background hover:bg-background/80 focus:bg-background focus:border-ring/50 focus:ring-1 focus:ring-ring/30 focus:outline-none transition-all resize-none font-mono text-xs leading-relaxed overflow-y-auto"
              />
            </div>
          )}

          {/* Output Panel */}
          {outputType !== "none" && (
            <div className="flex flex-col gap-1.5 h-full overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-foreground/85">{outputLabel}</span>
                <div className="flex items-center gap-1.5">
                  {customOutputActions}
                  {onSwap && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSwap}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      title={swapLabel}
                      type="button"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                      {swapLabel}
                    </Button>
                  )}
                  <CopyButton value={outputValue} label="Copy" />
                </div>
              </div>

              <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                {outputChildren ? (
                  outputChildren
                ) : (
                  <>
                    <textarea
                      readOnly
                      value={outputValue}
                      placeholder={outputPlaceholder}
                      className={`flex-1 w-full min-h-0 p-3 rounded-xl border bg-background/50 focus:outline-none transition-all resize-none font-mono text-xs leading-relaxed overflow-y-auto ${
                        error ? "border-destructive text-destructive/90" : "border-border/50 text-foreground"
                      }`}
                    />
                    {error && (
                      <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs text-destructive flex flex-col gap-0.5 animate-in fade-in duration-200">
                        <span className="font-semibold">Format Error</span>
                        <span>{error}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Custom Child Components */}
      {children && (
        <div className={inputType === "none" && outputType === "none" ? "flex-1 min-h-0 flex flex-col" : "shrink-0"}>
          {children}
        </div>
      )}
    </div>
  );
};
