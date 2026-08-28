import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Download,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import type { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeDiffEditor, CodeEditor } from "./code-editor";
import { parseSpec, serializeSpec } from "./openapi-model";
import type { OpenAPIDoc, SpecFormat } from "./openapi-types";

export interface DiffHunk {
  id: string;
  type: "added" | "removed" | "modified";
  origStart: number;
  origCount: number;
  origLines: string[];
  modStart: number;
  modCount: number;
  modLines: string[];
}

export function computeDiffHunks(originalText: string, modifiedText: string): DiffHunk[] {
  const orig = originalText.split("\n");
  const mod = modifiedText.split("\n");
  const N = orig.length;
  const M = mod.length;

  const dp: number[][] = Array.from({ length: N + 1 }, () => new Array(M + 1).fill(0));
  for (let i = N - 1; i >= 0; i--) {
    for (let j = M - 1; j >= 0; j--) {
      if (orig[i] === mod[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = 0;
  let j = 0;
  const hunks: DiffHunk[] = [];
  let currentHunk: { origStart: number; origLines: string[]; modStart: number; modLines: string[] } | null = null;

  const flushHunk = () => {
    if (!currentHunk) return;
    const type: "added" | "removed" | "modified" =
      currentHunk.origLines.length === 0
        ? "added"
        : currentHunk.modLines.length === 0
        ? "removed"
        : "modified";

    hunks.push({
      id: `hunk-${hunks.length}-${currentHunk.origStart}-${currentHunk.modStart}`,
      type,
      origStart: currentHunk.origStart,
      origCount: currentHunk.origLines.length,
      origLines: currentHunk.origLines,
      modStart: currentHunk.modStart,
      modCount: currentHunk.modLines.length,
      modLines: currentHunk.modLines,
    });
    currentHunk = null;
  };

  while (i < N || j < M) {
    if (i < N && j < M && orig[i] === mod[j]) {
      flushHunk();
      i++;
      j++;
    } else {
      if (!currentHunk) {
        currentHunk = { origStart: i, origLines: [], modStart: j, modLines: [] };
      }
      if (i < N && j < M) {
        if (dp[i + 1][j] >= dp[i][j + 1]) {
          currentHunk.origLines.push(orig[i]);
          i++;
        } else {
          currentHunk.modLines.push(mod[j]);
          j++;
        }
      } else if (i < N) {
        currentHunk.origLines.push(orig[i]);
        i++;
      } else {
        currentHunk.modLines.push(mod[j]);
        j++;
      }
    }
  }
  flushHunk();

  return hunks;
}

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: OpenAPIDoc;
  baselineSpec: OpenAPIDoc;
  format: SpecFormat;
  fileName: string;
  onFormatChange: (format: SpecFormat) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  spec,
  baselineSpec,
  format,
  fileName,
  onFormatChange,
  onSpecChange,
}) => {
  const [view, setView] = useState<"intellij" | "side-diff" | "export">("intellij");
  const [activeHunkIndex, setActiveHunkIndex] = useState<number>(0);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const leftEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const rightEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const hunkRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const exported = useMemo(() => serializeSpec(spec, format), [spec, format]);
  const original = useMemo(() => serializeSpec(baselineSpec, format), [baselineSpec, format]);
  const hunks = useMemo(() => computeDiffHunks(original, exported), [original, exported]);

  useEffect(() => {
    if (activeHunkIndex >= hunks.length && hunks.length > 0) {
      setActiveHunkIndex(hunks.length - 1);
    }
  }, [hunks.length, activeHunkIndex]);

  const scrollToHunk = (idx: number) => {
    if (hunks.length === 0) return;
    const targetIdx = Math.max(0, Math.min(hunks.length - 1, idx));
    setActiveHunkIndex(targetIdx);

    const hunk = hunks[targetIdx];
    if (view === "side-diff") {
      if (idx > activeHunkIndex) {
        diffEditorRef.current?.goToDiff("next");
      } else {
        diffEditorRef.current?.goToDiff("previous");
      }
    } else if (view === "intellij" && hunk) {
      leftEditorRef.current?.revealLineInCenter(hunk.origStart + 1);
      rightEditorRef.current?.revealLineInCenter(hunk.modStart + 1);
      const el = hunkRefs.current[targetIdx];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleRollbackHunk = (hunk: DiffHunk) => {
    setRollbackError(null);
    const modLines = exported.split("\n");
    modLines.splice(hunk.modStart, hunk.modCount, ...hunk.origLines);
    const nextText = modLines.join("\n");

    try {
      const parsed = parseSpec(nextText);
      onSpecChange(parsed.spec);
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : "Could not rollback selected line change.");
    }
  };

  const handleRollbackAll = () => {
    setRollbackError(null);
    onSpecChange(baselineSpec);
  };

  const download = () => {
    const blob = new Blob([exported], {
      type: format === "yaml" ? "text/yaml" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.trim() || `${spec.info.title.replace(/\s+/g, "-").toLowerCase() || "openapi"}.${format === "yaml" ? "yaml" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-3 top-3 left-3 flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none sm:max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-background p-0 shadow-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-border/50 bg-background/50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <span>Export & IntelliJ Diff Viewer</span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {fileName}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Use top navigation arrows to step through changes. Click middle ribbon arrows to rollback line changes.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon-xs" type="button" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Top Control Ribbon */}
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2 bg-background/50">
          {/* Change Navigation Arrows */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background p-0.5 shadow-2xs">
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6"
                type="button"
                disabled={hunks.length === 0 || activeHunkIndex <= 0}
                onClick={() => scrollToHunk(activeHunkIndex - 1)}
                title="Go to Previous Change"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6"
                type="button"
                disabled={hunks.length === 0 || activeHunkIndex >= hunks.length - 1}
                onClick={() => scrollToHunk(activeHunkIndex + 1)}
                title="Go to Next Change"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {hunks.length > 0 ? (
              <span className="text-[11px] font-mono font-bold text-muted-foreground px-1">
                Change {activeHunkIndex + 1} of {hunks.length}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-1">
                <Check className="h-3.5 w-3.5" /> In sync with import
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "intellij" | "side-diff" | "export")}>
              <TabsList className="h-7">
                <TabsTrigger value="intellij" className="h-6 px-2.5 text-[11px]">
                  IntelliJ Ribbon Diff ({hunks.length})
                </TabsTrigger>
                <TabsTrigger value="side-diff" className="h-6 px-2.5 text-[11px]">
                  Monaco Diff
                </TabsTrigger>
                <TabsTrigger value="export" className="h-6 px-2.5 text-[11px]">
                  Export preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {hunks.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400"
                type="button"
                onClick={handleRollbackAll}
                title="Rollback all document changes to original import baseline"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Revert All ({hunks.length})
              </Button>
            ) : null}

            <Select value={format} onValueChange={(value) => onFormatChange(value as SpecFormat)}>
              <SelectTrigger className="h-7 w-[88px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>

            <CopyButton value={exported} className="h-7 w-7" />
          </div>
        </div>

        {rollbackError ? (
          <div className="shrink-0 flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{rollbackError}</span>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 bg-background p-3 overflow-hidden">
          {view === "intellij" ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {hunks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center p-8">
                  <Check className="h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-bold">No differences found</p>
                  <p className="text-xs text-muted-foreground">
                    Current spec matches the original baseline import cleanly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_64px_1fr] h-full min-h-0 items-stretch rounded-xl border border-border/50 bg-card overflow-hidden">
                  {/* Left VS Code / Monaco Instance (Baseline) */}
                  <div className="flex min-h-0 flex-col border-r border-border/40 overflow-hidden">
                    <div className="shrink-0 bg-muted/50 border-b border-border/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Original Import (Baseline)</span>
                      <span className="text-[9px] text-muted-foreground/70 font-mono font-normal">Read-only</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <CodeEditor
                        value={original}
                        language={format}
                        readOnly
                        height="100%"
                        className="h-full border-0 rounded-none"
                        onMount={(instance) => {
                          leftEditorRef.current = instance;
                        }}
                      />
                    </div>
                  </div>

                  {/* Middle Ribbon Gutter with IntelliJ Rollback Arrows */}
                  <div className="flex flex-col items-center border-r border-border/40 bg-muted/60 p-1.5 overflow-y-auto space-y-3 shrink-0">
                    <div className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/70 select-none py-1 text-center border-b border-border/30 w-full">
                      Rollback
                    </div>
                    {hunks.map((hunk, idx) => {
                      const isActive = idx === activeHunkIndex;
                      return (
                        <div
                          key={hunk.id}
                          ref={(el) => {
                            hunkRefs.current[idx] = el;
                          }}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                            isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                          }`}
                        >
                          <Button
                            variant={isActive ? "default" : "outline"}
                            size="icon-xs"
                            className={`h-7 w-7 rounded-full transition-all shadow-2xs hover:scale-110 active:scale-95 ${
                              isActive
                                ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                                : "border-primary/40 bg-background hover:bg-primary hover:text-primary-foreground"
                            }`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToHunk(idx);
                              handleRollbackHunk(hunk);
                            }}
                            title={`Rollback change #${idx + 1} at line ${hunk.modStart + 1} (Baseline → Export)`}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-[9px] font-mono font-bold text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase ${
                              hunk.type === "added"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : hunk.type === "removed"
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            L{hunk.modStart + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right VS Code / Monaco Instance (Modified) */}
                  <div className="flex min-h-0 flex-col overflow-hidden">
                    <div className="shrink-0 bg-muted/50 border-b border-border/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Current Export (Modified)</span>
                      <span className="text-[9px] text-muted-foreground/70 font-mono font-normal">Active Spec</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <CodeEditor
                        value={exported}
                        language={format}
                        readOnly
                        height="100%"
                        className="h-full border-0 rounded-none"
                        onMount={(instance) => {
                          rightEditorRef.current = instance;
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : view === "side-diff" ? (
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Original import</span>
                <span>Current export</span>
              </div>
              <CodeDiffEditor
                original={original}
                modified={exported}
                language={format}
                className="flex-1 min-h-0"
                height="100%"
                onMount={(diffInstance) => {
                  diffEditorRef.current = diffInstance;
                }}
              />
            </div>
          ) : (
            <CodeEditor value={exported} language={format} readOnly height="100%" className="h-full" />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/50 px-4 py-3">
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" type="button" onClick={download}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Download ({fileName})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
