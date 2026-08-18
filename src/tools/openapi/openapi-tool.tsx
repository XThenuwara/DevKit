import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileJson,
  FileUp,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/shared/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BodySchemaPanel } from "./body-schema-panel";
import { CodeEditor } from "./code-editor";
import { EndpointSidebar } from "./endpoint-sidebar";
import { ExportDialog } from "./export-dialog";
import { OperationYamlPanel } from "./operation-yaml-panel";
import { ParametersPanel } from "./parameters-panel";
import { SchemaCrumbEditor } from "./schema-crumb-editor";
import { SuggestMenu } from "./suggest-menu";
import {
  SAMPLE_OPENAPI,
  addOperation,
  cloneSpec,
  collectOperationSchemaNames,
  collectPathCatalog,
  collectFieldCatalog,
  collectSchemaNames,
  filterFieldCatalog,
  componentRef,
  getOperation,
  HTTP_METHODS,
  parseSpec,
  serializeSpec,
  listOperations,
  updateOperation,
  updatePathItem,
} from "./openapi-model";
import type {
  HttpMethod,
  OpenAPIDoc,
  OperationObject,
  RequestBodyObject,
  ResponseObject,
  SpecFormat,
} from "./openapi-types";

const METHOD_CHIP: Record<string, string> = {
  get: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  post: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  put: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  patch: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400",
  options: "bg-muted text-muted-foreground",
  head: "bg-muted text-muted-foreground",
  trace: "bg-muted text-muted-foreground",
};

const STATUS_TONE = (code: string) => {
  if (code.startsWith("2")) return "text-emerald-600 dark:text-emerald-400";
  if (code.startsWith("3")) return "text-sky-600 dark:text-sky-400";
  if (code.startsWith("4")) return "text-amber-600 dark:text-amber-400";
  if (code.startsWith("5")) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{children}</Label>
);

const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; fill?: boolean }> = ({
  title,
  action,
  children,
  fill,
}) => (
  <section className={`rounded-lg border border-border bg-background ${fill ? "flex h-full min-h-0 flex-col" : ""}`}>
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
      {action}
    </header>
    <div className={fill ? "min-h-0 flex-1 overflow-hidden p-3" : "p-3 space-y-3"}>{children}</div>
  </section>
);

const RequestEditor: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  format: SpecFormat;
  onSpecChange: (spec: OpenAPIDoc) => void;
  onError: (message: string | null) => void;
}> = ({ spec, path, method, format, onSpecChange, onError }) => {
  const [tab, setTab] = useState("params");
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!operation || !pathItem) return null;

  const patchOp = (next: OperationObject) => onSpecChange(updateOperation(spec, path, method, () => next));
  const related = collectOperationSchemaNames(spec, path, method);

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-bold">Request</p>
        <TabsList className="h-7">
          <TabsTrigger value="params" className="h-6 px-2.5 text-[11px]">Params</TabsTrigger>
          <TabsTrigger value="body" className="h-6 px-2.5 text-[11px]">Body</TabsTrigger>
          <TabsTrigger value="yaml" className="h-6 px-2.5 text-[11px]">Source</TabsTrigger>
          <TabsTrigger value="docs" className="h-6 px-2.5 text-[11px]">Docs</TabsTrigger>
        </TabsList>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "params" ? (
          <ParametersPanel
            spec={spec}
            pathParams={pathItem.parameters ?? []}
            opParams={operation.parameters ?? []}
            onPathChange={(parameters) =>
              onSpecChange(updatePathItem(spec, path, (item) => ({ ...item, parameters })))
            }
            onOpChange={(parameters) => patchOp({ ...operation, parameters })}
          />
        ) : null}
        {tab === "body" ? (
          <BodySchemaPanel
            spec={spec}
            title="Request body"
            content={operation.requestBody?.content}
            emptyLabel="No request body on this method."
            required={Boolean(operation.requestBody?.required)}
            onRequiredChange={(value) =>
              patchOp({
                ...operation,
                requestBody: {
                  ...(operation.requestBody ?? { content: { "application/json": { schema: { type: "object" } } } }),
                  required: value,
                },
              })
            }
            onSpecChange={onSpecChange}
            onChange={(content) =>
              patchOp({
                ...operation,
                requestBody: {
                  ...(operation.requestBody ?? {}),
                  content,
                } as RequestBodyObject,
              })
            }
          />
        ) : null}
        {tab === "yaml" ? (
          <OperationYamlPanel
            spec={spec}
            path={path}
            method={method}
            format={format}
            onSpecChange={onSpecChange}
            onError={onError}
          />
        ) : null}
        {tab === "docs" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Summary</FieldLabel>
                    <Input
                      value={operation.summary ?? ""}
                      onChange={(e) => patchOp({ ...operation, summary: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Operation ID</FieldLabel>
                    <Input
                      value={operation.operationId ?? ""}
                      onChange={(e) => patchOp({ ...operation, operationId: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Tags</FieldLabel>
                  <Input
                    value={(operation.tags ?? []).join(", ")}
                    onChange={(e) =>
                      patchOp({
                        ...operation,
                        tags: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={operation.description ?? ""}
                    onChange={(e) => patchOp({ ...operation, description: e.target.value })}
                    className="min-h-[140px] text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="operation-deprecated"
                    checked={Boolean(operation.deprecated)}
                    onCheckedChange={(value) => patchOp({ ...operation, deprecated: value === true })}
                  />
                  <Label htmlFor="operation-deprecated" className="text-xs font-medium">
                    Deprecated
                  </Label>
                </div>
                {related.length > 0 ? (
                  <div className="flex flex-col gap-3 pt-1">
                    <FieldLabel>Linked schemas</FieldLabel>
                    {related.map((name) => (
                      <div key={name} className="flex h-[320px] min-h-[240px] flex-col overflow-hidden rounded-lg border border-border bg-background">
                        <SchemaCrumbEditor
                          spec={spec}
                          schema={{ $ref: componentRef("schemas", name) }}
                          onChange={() => undefined}
                          onSpecChange={onSpecChange}
                          rootLabel={name}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Tabs>
  );
};

const ResponseEditor: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  onSpecChange: (spec: OpenAPIDoc) => void;
}> = ({ spec, path, method, onSpecChange }) => {
  const operation = getOperation(spec, path, method);
  const codes = Object.keys(operation?.responses ?? {});
  const [active, setActive] = useState(codes[0] || "200");
  const currentCode = codes.includes(active) ? active : codes[0];
  const response = currentCode ? operation?.responses?.[currentCode] : undefined;

  if (!operation) return null;

  const patchOp = (next: OperationObject) => onSpecChange(updateOperation(spec, path, method, () => next));
  const patchResponse = (code: string, next: ResponseObject) => {
    patchOp({ ...operation, responses: { ...operation.responses, [code]: next } });
  };

  const addCode = () => {
    const used = new Set(Object.keys(operation.responses ?? {}));
    const next = ["200", "201", "204", "400", "401", "404", "500"].find((code) => !used.has(code)) ?? "200";
    patchOp({
      ...operation,
      responses: {
        ...operation.responses,
        [next]: {
          description: "OK",
          content: { "application/json": { schema: { type: "object", properties: {} } } },
        },
      },
    });
    setActive(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-card border-l border-border">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <p className="text-xs font-bold">Response</p>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {codes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No statuses</p>
          ) : (
            codes.map((code) => (
              <Button
                key={code}
                variant={currentCode === code ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-2 font-mono text-[11px] ${STATUS_TONE(code)}`}
                type="button"
                onClick={() => setActive(code)}
              >
                {code}
              </Button>
            ))
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCode} type="button">
          <Plus className="h-3 w-3 mr-1" />
          Status
        </Button>
        {currentCode && response ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" type="button">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Status options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  const responses = { ...operation.responses };
                  delete responses[currentCode];
                  patchOp({ ...operation, responses });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove {currentCode}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>
      {currentCode && response ? (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-1.5">
            <FieldLabel>Description</FieldLabel>
            <Input
              value={response.description ?? ""}
              onChange={(e) => patchResponse(currentCode, { ...response, description: e.target.value })}
              className="h-7 text-xs"
              placeholder="OK"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BodySchemaPanel
              spec={spec}
              title="Response body"
              content={response.content}
              emptyLabel="This status has no response body."
              onSpecChange={onSpecChange}
              onChange={(content) => patchResponse(currentCode, { ...response, content })}
            />
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <p className="text-xs text-muted-foreground">Add a status code to describe a response.</p>
        </div>
      )}
    </div>
  );
};

const SpecOverview: React.FC<{
  spec: OpenAPIDoc;
  format: SpecFormat;
  sourceText: string;
  operationsCount: number;
  onSpecChange: (spec: OpenAPIDoc) => void;
  onSourceChange: (text: string) => void;
  onFormatChange: (format: SpecFormat) => void;
  onParseError: (message: string | null) => void;
}> = ({ spec, format, sourceText, operationsCount, onSpecChange, onSourceChange, onFormatChange, onParseError }) => {
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const schemaNames = collectSchemaNames(spec);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-bold">Collection overview</p>
        <Tabs value={mode} onValueChange={(value) => setMode(value as "visual" | "source")}>
          <TabsList className="h-7">
            <TabsTrigger value="visual" className="h-6 px-2 text-[11px]">Info</TabsTrigger>
            <TabsTrigger value="source" className="h-6 px-2 text-[11px]">Source</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {mode === "source" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CodeEditor
            value={sourceText}
            onChange={onSourceChange}
            onBlur={() => {
              try {
                const parsed = parseSpec(sourceText);
                onSpecChange(parsed.spec);
                onFormatChange(parsed.format);
                onParseError(null);
              } catch (err) {
                onParseError(err instanceof Error ? err.message : "Invalid document.");
              }
            }}
            language={format}
            height="100%"
            className="h-full rounded-none border-0"
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          <Section title="API">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={spec.info.title}
                  onChange={(e) => onSpecChange({ ...spec, info: { ...spec.info, title: e.target.value } })}
                  className="h-8 text-xs bg-background"
                />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>Version</FieldLabel>
                <Input
                  value={spec.info.version}
                  onChange={(e) => onSpecChange({ ...spec, info: { ...spec.info, version: e.target.value } })}
                  className="h-8 text-xs bg-background"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={spec.info.description ?? ""}
                onChange={(e) => onSpecChange({ ...spec, info: { ...spec.info, description: e.target.value } })}
                className="min-h-[72px] text-xs bg-background"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ["OpenAPI", spec.openapi],
                ["Format", format.toUpperCase()],
                ["Endpoints", String(operationsCount)],
                ["Schemas", String(schemaNames.length)],
              ].map(([label, value]) => (
                <span key={label} className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-semibold">
                  {label}: {value}
                </span>
              ))}
            </div>
          </Section>
          <Section
            title="Servers"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                type="button"
                onClick={() => onSpecChange({ ...spec, servers: [...(spec.servers ?? []), { url: "https://" }] })}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            }
          >
            {(spec.servers ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No servers defined.</p>
            ) : (
              (spec.servers ?? []).map((server, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Input
                    value={server.url}
                    onChange={(e) => {
                      const servers = [...(spec.servers ?? [])];
                      servers[index] = { ...server, url: e.target.value };
                      onSpecChange({ ...spec, servers });
                    }}
                    className="h-8 flex-1 text-xs font-mono bg-background"
                  />
                  <Input
                    value={server.description ?? ""}
                    onChange={(e) => {
                      const servers = [...(spec.servers ?? [])];
                      servers[index] = { ...server, description: e.target.value };
                      onSpecChange({ ...spec, servers });
                    }}
                    className="h-8 w-[150px] text-xs bg-background"
                    placeholder="name"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    type="button"
                    onClick={() => onSpecChange({ ...spec, servers: (spec.servers ?? []).filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </Section>
          <Section title="Component schemas">
            {schemaNames.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet. Save a body as $ref from an endpoint.</p>
            ) : (
              schemaNames.map((name) => (
                <div key={name} className="flex h-[280px] min-h-[220px] flex-col overflow-hidden rounded-md border border-border bg-background">
                  <SchemaCrumbEditor
                    spec={spec}
                    schema={{ $ref: componentRef("schemas", name) }}
                    onChange={() => undefined}
                    onSpecChange={onSpecChange}
                    rootLabel={name}
                  />
                </div>
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  );
};

export const OpenApiTool: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCount = useRef(0);
  const [sourceText, setSourceText] = useState("");
  const [spec, setSpec] = useState<OpenAPIDoc | null>(null);
  const [baselineSpec, setBaselineSpec] = useState<OpenAPIDoc | null>(null);
  const [format, setFormat] = useState<SpecFormat>("json");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ path: string; method: HttpMethod } | null>(null);
  const [newPath, setNewPath] = useState("/");
  const [newMethod, setNewMethod] = useState<HttpMethod>("get");
  const [pathSuggestOpen, setPathSuggestOpen] = useState(false);
  const [pathAnchor, setPathAnchor] = useState<HTMLElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const operations = useMemo(() => (spec ? listOperations(spec) : []), [spec]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter(
      (op) =>
        op.path.toLowerCase().includes(q) ||
        op.method.includes(q) ||
        op.summary.toLowerCase().includes(q) ||
        (op.operationId ?? "").toLowerCase().includes(q) ||
        op.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [operations, query]);

  const pathCatalog = useMemo(() => (spec ? collectPathCatalog(spec) : []), [spec]);
  const fieldCatalog = useMemo(() => (spec ? collectFieldCatalog(spec) : []), [spec]);
  const pathSuggestions = useMemo(() => {
    const q = newPath.trim();
    const paths = filterFieldCatalog(fieldCatalog, q.startsWith("/") ? q.slice(1) : q, {
      kinds: ["path", "parameter", "property", "schema"],
    });
    const items = paths.map((item) => {
      if (item.kind === "path") return { id: item.key, title: item.name, subtitle: item.usedIn.join(" · "), badge: "path" };
      const asPath = item.name.startsWith("/") ? item.name : `/${item.name}`;
      return {
        id: item.key,
        title: asPath,
        subtitle: `${item.kind}${item.usedIn[0] ? ` · ${item.usedIn[0]}` : ""}`,
        badge: item.kind,
      };
    });
    const extra = pathCatalog
      .filter((path) => !q || path.toLowerCase().includes(q.toLowerCase()))
      .filter((path) => !items.some((item) => item.title === path))
      .map((path) => ({ id: `raw:${path}`, title: path, badge: "path", subtitle: "existing path" }));
    return [...extra, ...items].slice(0, 16);
  }, [fieldCatalog, pathCatalog, newPath]);

  const applySpec = (next: OpenAPIDoc, nextFormat = format, resetBaseline = false) => {
    setSpec(next);
    setFormat(nextFormat);
    setSourceText(serializeSpec(next, nextFormat));
    setError(null);
    if (resetBaseline) setBaselineSpec(cloneSpec(next));
  };

  const loadText = (text: string, keepSelection = false) => {
    try {
      const parsed = parseSpec(text);
      applySpec(parsed.spec, parsed.format, true);
      if (!keepSelection) {
        const ops = listOperations(parsed.spec);
        setSelected(ops[0] ? { path: ops[0].path, method: ops[0].method } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse OpenAPI document.");
    }
  };

  const onUpload = async (file: File) => {
    const text = await file.text();
    setSourceText(text);
    loadText(text);
  };
  const onUploadRef = useRef(onUpload);
  onUploadRef.current = onUpload;

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCount.current += 1;
      setDragOver(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCount.current = Math.max(0, dragCount.current - 1);
      if (dragCount.current === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCount.current = 0;
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void onUploadRef.current(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const current = selected
    ? operations.find((op) => op.path === selected.path && op.method === selected.method)
    : undefined;

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".json,.yaml,.yml,application/json,text/yaml"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void onUpload(file);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="relative flex h-full w-full min-h-0 overflow-hidden rounded-xl border border-border bg-background">
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-card px-10 py-8 shadow-xl">
            <Upload className="h-8 w-8 text-primary" />
            <p className="text-sm font-bold">Drop OpenAPI file to open</p>
            <p className="text-xs text-muted-foreground">JSON or YAML · 3.0 / 3.1</p>
          </div>
        </div>
      ) : null}
      {fileInput}

      <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-card">
        <div className="shrink-0 border-b border-border px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{spec?.info.title || "OpenAPI"}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {spec ? `${operations.length} requests` : "No collection loaded"}
              </p>
            </div>
            <Button variant="ghost" size="icon-xs" type="button" onClick={() => fileRef.current?.click()} title="Import">
              <FileUp className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter requests"
              className="h-7 pl-7 text-xs bg-background"
              disabled={!spec}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!spec ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Drop a spec anywhere, or import a file to start.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-xs ${
                  !selected ? "bg-muted font-semibold" : "hover:bg-muted/50"
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Overview
              </button>
              <EndpointSidebar
                spec={spec}
                operations={operations}
                filtered={filtered}
                selected={selected}
                onSelect={setSelected}
                onSpecChange={(next) => applySpec(next)}
              />
            </>
          )}
        </div>

        {spec ? (
          <div className="shrink-0 border-t border-border p-2 space-y-1.5 bg-muted/30">
            <div className="flex items-center gap-1">
              <Select value={newMethod} onValueChange={(value) => setNewMethod(value as HttpMethod)}>
                <SelectTrigger className="h-7 w-[78px] text-[11px] uppercase bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative min-w-0 flex-1">
                <Input
                  value={newPath}
                  onChange={(e) => {
                    setNewPath(e.target.value);
                    setPathSuggestOpen(true);
                    setPathAnchor(e.currentTarget);
                  }}
                  onFocus={(e) => {
                    setPathSuggestOpen(true);
                    setPathAnchor(e.currentTarget);
                  }}
                  onBlur={() => setTimeout(() => setPathSuggestOpen(false), 150)}
                  className="h-7 w-full font-mono text-[11px] bg-background"
                  placeholder="/path"
                />
                <SuggestMenu
                  open={pathSuggestOpen}
                  anchor={pathSuggestOpen ? pathAnchor : null}
                  items={pathSuggestions}
                  onSelect={(id) => {
                    const item = pathSuggestions.find((entry) => entry.id === id);
                    if (item) setNewPath(item.title);
                    setPathSuggestOpen(false);
                  }}
                />
              </div>
              <Button
                size="sm"
                className="h-7 px-2"
                type="button"
                onClick={() => {
                  const path = newPath.startsWith("/") ? newPath : `/${newPath}`;
                  const next = addOperation(spec, path, newMethod);
                  applySpec(next);
                  setSelected({ path, method: newMethod });
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/20">
        <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
          {spec && selected ? (
            <>
              <span className={`rounded-md px-2 py-1 text-[11px] font-extrabold uppercase ${METHOD_CHIP[selected.method]}`}>
                {selected.method}
              </span>
              <div className="flex min-w-0 flex-1 items-center rounded-md border border-border bg-background px-2.5 py-1.5">
                <span className="truncate font-mono text-xs">{selected.path}</span>
                {current?.summary ? (
                  <span className="ml-2 hidden truncate text-[11px] text-muted-foreground sm:inline">
                    · {current.summary}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileJson className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-xs font-semibold">
                {spec ? spec.info.title : "Drop a file or import an OpenAPI 3 spec"}
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            {spec ? (
              <>
                <Select
                  value={format}
                  onValueChange={(value) => {
                    const next = value as SpecFormat;
                    setFormat(next);
                    setSourceText(serializeSpec(spec, next));
                  }}
                >
                  <SelectTrigger className="h-7 w-[88px] text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="yaml">YAML</SelectItem>
                  </SelectContent>
                </Select>
                <CopyButton value={serializeSpec(spec, format)} className="h-7 w-7" />
                <Button variant="outline" size="sm" className="h-7 text-[11px]" type="button" onClick={() => setExportOpen(true)}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-7 text-[11px]" type="button" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Import
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  type="button"
                  onClick={() => {
                    const sample = cloneSpec(SAMPLE_OPENAPI);
                    applySpec(sample, format, true);
                    const ops = listOperations(sample);
                    setSelected(ops[0] ? { path: ops[0].path, method: ops[0].method } : null);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Sample
                </Button>
              </>
            )}
          </div>
        </header>

        {error ? (
          <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {!spec ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-card">
                <Upload className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">Open a collection</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Drag and drop an OpenAPI 3 JSON or YAML file anywhere in this window. Or paste source below and parse it.
                </p>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={'openapi: "3.1.0"\ninfo:\n  title: My API\n  version: 1.0.0'}
                className="h-40 w-full max-w-xl resize-none rounded-lg border border-border bg-card p-3 font-mono text-xs"
              />
              <Button size="sm" className="h-8 text-xs" type="button" onClick={() => loadText(sourceText)} disabled={!sourceText.trim()}>
                Parse document
              </Button>
            </div>
          ) : selected ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <RequestEditor
                  spec={spec}
                  path={selected.path}
                  method={selected.method}
                  format={format}
                  onSpecChange={(next) => applySpec(next)}
                  onError={setError}
                />
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <ResponseEditor spec={spec} path={selected.path} method={selected.method} onSpecChange={(next) => applySpec(next)} />
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <SpecOverview
                spec={spec}
                format={format}
                sourceText={sourceText}
                operationsCount={operations.length}
                onSpecChange={(next) => applySpec(next)}
                onSourceChange={setSourceText}
                onFormatChange={setFormat}
                onParseError={setError}
              />
            </div>
          )}
        </div>
      </main>

      {spec && baselineSpec ? (
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          spec={spec}
          baselineSpec={baselineSpec}
          format={format}
          onFormatChange={(next) => {
            setFormat(next);
            setSourceText(serializeSpec(spec, next));
          }}
        />
      ) : null}
    </div>
  );
};
