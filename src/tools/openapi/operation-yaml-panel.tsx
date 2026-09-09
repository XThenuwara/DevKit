import React, { useMemo } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { mergeOperationView, serializeOperationView } from "./openapi-model";
import { CodeEditor } from "./code-editor";
import type { HttpMethod, OpenAPIDoc, SpecFormat } from "./openapi-types";

export const OperationYamlPanel: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  format: SpecFormat;
  draftText?: string;
  onDraftChange: (text: string) => void;
  onApply: (spec: OpenAPIDoc, nextPath: string, nextMethod: HttpMethod) => void;
  onError: (message: string | null) => void;
}> = ({ spec, path, method, format, draftText, onDraftChange, onApply, onError }) => {
  const generated = useMemo(
    () => serializeOperationView(spec, path, method, format),
    [spec, path, method, format],
  );

  const [localText, setLocalText] = React.useState(draftText ?? generated);

  React.useEffect(() => {
    setLocalText(draftText ?? generated);
  }, [path, method, format, draftText, generated]);

  const currentText = localText;
  const dirty = localText !== generated;

  const handleChange = (val: string) => {
    setLocalText(val);
    onDraftChange(val);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider">Source</p>
          <p className="truncate text-[10px] text-muted-foreground">
            Linked $refs stay linked. Only schemas used by this operation are shown.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton value={currentText} className="h-7 w-7" />
          {dirty ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                type="button"
                onClick={() => {
                  onDraftChange(generated);
                }}
              >
                Reset
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                type="button"
                onClick={() => {
                  try {
                    const { nextSpec, nextPath, nextMethod } = mergeOperationView(spec, path, method, currentText, format);
                    onApply(nextSpec, nextPath, nextMethod);
                    onError(null);
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Could not apply snippet.");
                  }
                }}
              >
                Apply
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <CodeEditor
          value={currentText}
          onChange={handleChange}
          language={format}
          height="100%"
          className="h-full rounded-none border-0"
        />
      </div>
    </div>
  );
};
