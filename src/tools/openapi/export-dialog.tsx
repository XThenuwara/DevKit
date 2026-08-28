import React, { useMemo, useState } from "react";
import { Download, RotateCcw, X, Check, AlertCircle } from "lucide-react";
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
  onFormatChange: (format: SpecFormat) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  spec,
  baselineSpec,
  format,
  onFormatChange,
  onSpecChange,
}) => {
  const [view, setView] = useState<"line-diff" | "side-diff" | "export">("line-diff");
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const exported = useMemo(() => serializeSpec(spec, format), [spec, format]);
  const original = useMemo(() => serializeSpec(baselineSpec, format), [baselineSpec, format]);
  const hunks = useMemo(() => computeDiffHunks(original, exported), [original, exported]);

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
    a.download = `${spec.info.title.replace(/\s+/g, "-").toLowerCase() || "openapi"}.${format === "yaml" ? "yaml" : "json"}`;
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
              <DialogTitle className="text-sm font-semibold">Export & Line-by-Line Diff</DialogTitle>
              <DialogDescription className="text-xs">
                Compare your original import against current modifications, rollback specific line changes, and export.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon-xs" type="button" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2">
          <Tabs value={view} onValueChange={(value) => setView(value as "line-diff" | "side-diff" | "export")}>
            <TabsList className="h-7">
              <TabsTrigger value="line-diff" className="h-6 px-2.5 text-[11px]">
                Interactive Line Rollback ({hunks.length})
              </TabsTrigger>
              <TabsTrigger value="side-diff" className="h-6 px-2.5 text-[11px]">
                Side-by-side
              </TabsTrigger>
              <TabsTrigger value="export" className="h-6 px-2.5 text-[11px]">
                Export preview
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
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
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> In sync with import
              </span>
            )}
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

        <div className="flex-1 min-h-0 bg-background p-4 overflow-hidden">
          {view === "line-diff" ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              {hunks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <Check className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-bold">No differences</p>
                  <p className="text-xs text-muted-foreground">Your current export matches your original baseline import.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
                  {hunks.map((hunk, idx) => (
                    <div
                      key={hunk.id}
                      className="rounded-lg border border-border/50 bg-card overflow-hidden shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/50 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-muted-foreground">
                            Hunk #{idx + 1} · Line {hunk.modStart + 1}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              hunk.type === "added"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : hunk.type === "removed"
                                ? "bg-red-500/15 text-red-700 dark:text-red-400"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {hunk.type}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 px-2 text-[11px] font-semibold"
                          type="button"
                          onClick={() => handleRollbackHunk(hunk)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Revert line change
                        </Button>
                      </div>

                      <div className="font-mono text-[11px] leading-relaxed overflow-x-auto p-2 space-y-0.5">
                        {hunk.origLines.map((line, lIdx) => (
                          <div key={`orig-${lIdx}`} className="flex items-start bg-red-500/10 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-xs">
                            <span className="w-8 shrink-0 select-none text-[10px] opacity-60 font-mono">- {hunk.origStart + lIdx + 1}</span>
                            <pre className="font-mono whitespace-pre-wrap break-all">{line || " "}</pre>
                          </div>
                        ))}
                        {hunk.modLines.map((line, lIdx) => (
                          <div key={`mod-${lIdx}`} className="flex items-start bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-xs">
                            <span className="w-8 shrink-0 select-none text-[10px] opacity-60 font-mono">+ {hunk.modStart + lIdx + 1}</span>
                            <pre className="font-mono whitespace-pre-wrap break-all">{line || " "}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
