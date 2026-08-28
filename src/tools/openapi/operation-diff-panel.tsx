import React, { useMemo, useState } from "react";
import { Check, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { CodeDiffEditor, CodeEditor } from "./code-editor";
import { mergeOperationView, serializeOperationView } from "./openapi-model";
import type { HttpMethod, OpenAPIDoc, SpecFormat } from "./openapi-types";

/**
 * OperationDiffPanel
 *
 * Side-by-side Monaco DiffEditor for a single operation.
 * Left pane = current operation YAML/JSON (read-only).
 * Right pane = user's pasted alternative snippet (editable).
 * Below = Monaco CodeDiffEditor showing the live diff between them.
 * "Apply Pasted" merges the right-pane snippet into the full spec.
 */
export const OperationDiffPanel: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  format: SpecFormat;
  onSpecChange: (spec: OpenAPIDoc) => void;
  onError: (message: string | null) => void;
}> = ({ spec, path, method, format, onSpecChange, onError }) => {
  const current = useMemo(
    () => serializeOperationView(spec, path, method, format),
    [spec, path, method, format],
  );
  const [pasted, setPasted] = useState("");
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  const hasDiff = pasted.trim() !== "" && pasted.trim() !== current.trim();

  const handleApply = () => {
    if (!pasted.trim()) return;
    try {
      const next = mergeOperationView(spec, path, method, pasted, format);
      onSpecChange(next);
      onError(null);
      setApplyFeedback("Applied!");
      setTimeout(() => setApplyFeedback(null), 2500);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not apply snippet.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <GitCompare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] font-bold uppercase tracking-wider">Request Diff</p>
          {applyFeedback ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> {applyFeedback}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton value={current} className="h-7 w-7" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            type="button"
            disabled={!pasted.trim()}
            onClick={() => setPasted("")}
          >
            Clear
          </Button>
          <Button
            size="sm"
            className="h-7 px-2 text-[11px]"
            type="button"
            disabled={!hasDiff}
            onClick={handleApply}
          >
            Apply Pasted
          </Button>
        </div>
      </div>

      {/* Two-pane diff area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Input pane: side-by-side source labels */}
        <div className="shrink-0 grid grid-cols-2 border-b border-border/50">
          <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 bg-muted/30">
            Current ({method.toUpperCase()} {path})
          </div>
          <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center justify-between">
            <span>Paste to compare</span>
            {!pasted.trim() && (
              <span className="font-normal normal-case text-muted-foreground/60">← paste an operation snippet here</span>
            )}
          </div>
        </div>

        {/* Monaco CodeDiffEditor — left = current, right = pasted */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 grid grid-cols-2">
            {/* Left: current (read-only Monaco) */}
            <div className="min-h-0 border-r border-border/50 overflow-hidden">
              <CodeEditor
                value={current}
                language={format}
                readOnly
                height="100%"
                showFoldControls={false}
                className="h-full border-0 rounded-none"
              />
            </div>
            {/* Right: editable paste area (Monaco) */}
            <div className="min-h-0 overflow-hidden">
              <CodeEditor
                value={pasted}
                onChange={setPasted}
                language={format}
                height="100%"
                showFoldControls={false}
                className="h-full border-0 rounded-none"
              />
            </div>
          </div>
        </div>

        {/* Monaco Diff viewer below */}
        {hasDiff ? (
          <>
            <div className="shrink-0 border-t border-border/50 border-b border-border/50 bg-muted/30 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <GitCompare className="h-3 w-3" />
              Monaco Diff — Current vs Pasted
            </div>
            <div className="flex-1 min-h-0" style={{ minHeight: 180, maxHeight: "40%" }}>
              <CodeDiffEditor
                original={current}
                modified={pasted}
                language={format}
                height="100%"
                className="h-full border-0 rounded-none"
              />
            </div>
          </>
        ) : !pasted.trim() ? (
          <div className="shrink-0 border-t border-border/50 px-4 py-3 text-center text-xs text-muted-foreground">
            Paste an operation snippet in the right pane to see the Monaco diff below.
          </div>
        ) : (
          <div className="shrink-0 border-t border-border/50 px-4 py-3 text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
            <Check className="h-3.5 w-3.5" /> No differences — pasted matches current operation.
          </div>
        )}
      </div>
    </div>
  );
};
