import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { collectOperationSchemaNames, upsertComponentSchema } from "./openapi-model";
import type { HttpMethod, OpenAPIDoc, SchemaObject, SpecFormat } from "./openapi-types";
import { dump as yamlDump, load as yamlLoad } from "js-yaml";
import { CopyButton } from "@/components/shared/copy-button";

export const OperationRefsPanel: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  format: SpecFormat;
  onSpecChange: (spec: OpenAPIDoc) => void;
  onError: (message: string | null) => void;
}> = ({ spec, path, method, format, onSpecChange, onError }) => {
  const linkedSchemaNames = useMemo(
    () => collectOperationSchemaNames(spec, path, method),
    [spec, path, method]
  );

  const [activeSchema, setActiveSchema] = useState<string | null>(null);

  // If active schema is deleted or we switch endpoints, pick the first one
  useEffect(() => {
    if (linkedSchemaNames.length > 0 && (!activeSchema || !linkedSchemaNames.includes(activeSchema))) {
      setActiveSchema(linkedSchemaNames[0]);
    }
  }, [linkedSchemaNames, activeSchema]);

  const rawSchema = activeSchema ? spec.components?.schemas?.[activeSchema] : undefined;

  const generated = useMemo(() => {
    if (!rawSchema) return "";
    return format === "yaml" 
      ? yamlDump(rawSchema, { lineWidth: 100, noRefs: true })
      : JSON.stringify(rawSchema, null, 2);
  }, [rawSchema, format]);

  const [localText, setLocalText] = useState(generated);

  useEffect(() => {
    setLocalText(generated);
  }, [generated, activeSchema]);

  const dirty = localText !== generated;

  const handleApply = () => {
    if (!activeSchema) return;
    try {
      const parsed = format === "yaml" 
        ? yamlLoad(localText) as SchemaObject 
        : JSON.parse(localText) as SchemaObject;
      onSpecChange(upsertComponentSchema(spec, activeSchema, parsed));
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Invalid schema.");
    }
  };

  if (linkedSchemaNames.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground text-xs">
        No referenced schemas found for this operation.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider">Referenced Schemas</p>
        </div>
        <div className="flex items-center gap-1">
          {activeSchema ? <CopyButton value={localText} className="h-7 w-7" /> : null}
          {dirty ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                type="button"
                onClick={() => setLocalText(generated)}
              >
                Reset
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                type="button"
                onClick={handleApply}
              >
                Apply
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 flex-1">
          <CodeEditor
            value={localText}
            onChange={setLocalText}
            language={format}
            height="100%"
            className="h-full rounded-none border-0"
          />
        </div>
        <aside className="flex min-h-0 w-[240px] shrink-0 flex-col border-l border-border/50 bg-background/50">
          <div className="shrink-0 border-b border-border/40 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Linked schemas
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
            {linkedSchemaNames.map((name) => {
              const active = activeSchema === name;
              return (
                <button
                  key={name}
                  type="button"
                  className={`w-full rounded-md border px-2 py-1 text-left text-xs font-mono ${
                    active
                      ? "border-border bg-background text-foreground shadow-sm"
                      : "border-transparent bg-transparent hover:border-border/50 hover:bg-background/80"
                  }`}
                  onClick={() => setActiveSchema(name)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
