import React, { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
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
import { serializeSpec } from "./openapi-model";
import type { OpenAPIDoc, SpecFormat } from "./openapi-types";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: OpenAPIDoc;
  baselineSpec: OpenAPIDoc;
  format: SpecFormat;
  onFormatChange: (format: SpecFormat) => void;
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  spec,
  baselineSpec,
  format,
  onFormatChange,
}) => {
  const [view, setView] = useState<"diff" | "export">("diff");

  const exported = useMemo(() => serializeSpec(spec, format), [spec, format]);
  const original = useMemo(() => serializeSpec(baselineSpec, format), [baselineSpec, format]);

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
        className="fixed inset-3 top-3 left-3 flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none sm:max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-2xl ring-1 ring-foreground/10"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-sm font-semibold">Export OpenAPI</DialogTitle>
              <DialogDescription className="text-xs">
                Compare your original import against the current export, then download.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon-xs" type="button" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="shrink-0 flex items-center gap-2 border-b border-border px-4 py-2">
          <Tabs value={view} onValueChange={(value) => setView(value as "diff" | "export")}>
            <TabsList className="h-7">
              <TabsTrigger value="diff" className="h-6 px-2.5 text-[11px]">
                Diff
              </TabsTrigger>
              <TabsTrigger value="export" className="h-6 px-2.5 text-[11px]">
                Export preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={format} onValueChange={(value) => onFormatChange(value as SpecFormat)}>
            <SelectTrigger className="h-7 w-[88px] text-[11px] ml-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yaml">YAML</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <CopyButton value={exported} className="h-7 w-7" />
        </div>

        <div className="flex-1 min-h-0 bg-muted/40 p-4">
          {view === "diff" ? (
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

        <DialogFooter className="shrink-0 border-t border-border px-4 py-3">
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
