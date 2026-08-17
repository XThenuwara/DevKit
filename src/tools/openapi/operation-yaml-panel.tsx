import React, { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { mergeOperationView, serializeOperationView } from "./openapi-model";
import { CodeEditor } from "./code-editor";
import type { HttpMethod, OpenAPIDoc, SpecFormat } from "./openapi-types";

const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <section className="rounded-lg border border-border bg-background">
    <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
      {action}
    </header>
    <div className="p-3 space-y-3">{children}</div>
  </section>
);

export const OperationYamlPanel: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  format: SpecFormat;
  onSpecChange: (spec: OpenAPIDoc) => void;
  onError: (message: string | null) => void;
}> = ({ spec, path, method, format, onSpecChange, onError }) => {
  const generated = useMemo(
    () => serializeOperationView(spec, path, method, format),
    [spec, path, method, format],
  );
  const [draft, setDraft] = useState(generated);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(generated);
  }, [generated, dirty]);

  return (
    <Section
      title="Operation source"
      action={
        <div className="flex items-center gap-1">
          <CopyButton value={draft} className="h-7 w-7" />
          {dirty ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                type="button"
                onClick={() => {
                  setDraft(generated);
                  setDirty(false);
                }}
              >
                Reset
              </Button>
              <Button
                size="sm"
                className="h-6 px-2 text-[11px]"
                type="button"
                onClick={() => {
                  try {
                    const next = mergeOperationView(spec, path, method, draft, format);
                    onSpecChange(next);
                    setDirty(false);
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
      }
    >
      <p className="text-[11px] text-muted-foreground">
        Resolved view with linked schemas stitched in. Edits apply back to the full spec.
      </p>
      <CodeEditor
        value={draft}
        onChange={(value) => {
          setDraft(value);
          setDirty(value !== generated);
        }}
        language={format}
        height={420}
      />
    </Section>
  );
};
