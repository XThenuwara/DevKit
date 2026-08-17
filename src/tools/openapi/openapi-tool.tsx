import React, { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Braces,
  Download,
  Eye,
  FileUp,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/shared/copy-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SchemaVisualEditor } from "./schema-visual-editor";
import {
  SAMPLE_OPENAPI,
  addOperation,
  cloneSpec,
  collectOperationSchemaNames,
  collectSchemaNames,
  componentRef,
  getOperation,
  HTTP_METHODS,
  parseSpec,
  removeOperation,
  serializeSpec,
  listOperations,
  updateOperation,
  updatePathItem,
  upsertComponentSchema,
} from "./openapi-model";
import type {
  HttpMethod,
  OpenAPIDoc,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SpecFormat,
} from "./openapi-types";

const METHOD_STYLES: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  post: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  put: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  patch: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  options: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
  head: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
  trace: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30",
};

const MethodBadge: React.FC<{ method: string; className?: string }> = ({ method, className = "" }) => (
  <span
    className={`inline-flex items-center justify-center min-w-[3.25rem] px-1.5 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide ${METHOD_STYLES[method] || METHOD_STYLES.options} ${className}`}
  >
    {method}
  </span>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
);

const ParameterTable: React.FC<{
  spec: OpenAPIDoc;
  title: string;
  parameters: ParameterObject[];
  onChange: (parameters: ParameterObject[]) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
}> = ({ spec, title, parameters, onChange, onSpecChange }) => {
  const add = () => {
    onChange([
      ...parameters,
      { name: "param", in: "query", required: false, schema: { type: "string" } },
    ]);
  };

  const patch = (index: number, next: ParameterObject) => {
    onChange(parameters.map((item, i) => (i === index ? next : item)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel>{title}</FieldLabel>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={add} type="button">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
      {parameters.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No parameters on this operation.</p>
      ) : (
        <div className="space-y-2">
          {parameters.map((param, index) => (
            <div key={`${param.name}-${index}`} className="rounded-lg border border-border/50 bg-background/50 p-2 space-y-2">
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <Select
                  value={param.in}
                  onValueChange={(value) =>
                    patch(index, {
                      ...param,
                      in: value as ParameterObject["in"],
                      required: value === "path" ? true : param.required,
                    })
                  }
                >
                  <SelectTrigger className="col-span-3 h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["path", "query", "header", "cookie"] as const).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={param.name}
                  onChange={(e) => patch(index, { ...param, name: e.target.value })}
                  className="col-span-5 h-7 text-xs font-mono"
                  placeholder="name"
                />
                <label className="col-span-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Checkbox
                    checked={Boolean(param.required) || param.in === "path"}
                    onCheckedChange={(value) => patch(index, { ...param, required: value === true })}
                    disabled={param.in === "path"}
                  />
                  Required
                </label>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="col-span-1 justify-self-end text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(parameters.filter((_, i) => i !== index))}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={param.description ?? ""}
                onChange={(e) => patch(index, { ...param, description: e.target.value })}
                className="h-7 text-xs"
                placeholder="Description"
              />
              <SchemaVisualEditor
                spec={spec}
                schema={param.schema ?? { type: "string" }}
                onChange={(schema) => patch(index, { ...param, schema })}
                onSpecChange={onSpecChange}
                depth={1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BodySchemaBlock: React.FC<{
  spec: OpenAPIDoc;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
  onChange: (content: Record<string, { schema?: SchemaObject; example?: unknown }>) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
  emptyLabel: string;
}> = ({ spec, content, onChange, onSpecChange, emptyLabel }) => {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [extractName, setExtractName] = useState("");
  const types = Object.keys(content ?? {});
  const contentType = types[0] || "application/json";
  const schema = content?.[contentType]?.schema;
  const jsonText = JSON.stringify(schema ?? {}, null, 2);

  if (!content || types.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-4 text-center space-y-2">
        <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          type="button"
          onClick={() => onChange({ "application/json": { schema: { type: "object", properties: {} } } })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add JSON body
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={contentType}
          onChange={(e) => {
            const nextType = e.target.value || "application/json";
            const media = content[contentType];
            onChange({ [nextType]: media });
          }}
          className="h-7 text-xs font-mono w-[200px]"
        />
        <Tabs value={mode} onValueChange={(value) => setMode(value as "visual" | "json")}>
          <TabsList className="h-7">
            <TabsTrigger value="visual" className="text-[10px] h-6 px-2">
              <Eye className="h-3 w-3 mr-1" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="json" className="text-[10px] h-6 px-2">
              <Braces className="h-3 w-3 mr-1" />
              JSON
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-1.5">
          <Input
            value={extractName}
            onChange={(e) => setExtractName(e.target.value)}
            placeholder="Schema name"
            className="h-7 w-[130px] text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            type="button"
            disabled={!extractName.trim() || !schema}
            onClick={() => {
              const name = extractName.trim();
              onSpecChange(upsertComponentSchema(spec, name, schema ?? { type: "object" }));
              onChange({
                ...content,
                [contentType]: { ...content[contentType], schema: { $ref: componentRef("schemas", name) } },
              });
              setExtractName("");
            }}
          >
            Save as schema
          </Button>
        </div>
      </div>
      {mode === "visual" ? (
        <SchemaVisualEditor
          spec={spec}
          schema={schema ?? { type: "object", properties: {} }}
          onChange={(next) =>
            onChange({
              ...content,
              [contentType]: { ...content[contentType], schema: next },
            })
          }
          onSpecChange={onSpecChange}
        />
      ) : (
        <Textarea
          value={jsonText}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as SchemaObject;
              onChange({
                ...content,
                [contentType]: { ...content[contentType], schema: parsed },
              });
            } catch {
              /* keep typing */
            }
          }}
          className="min-h-[220px] font-mono text-xs"
        />
      )}
    </div>
  );
};

const RequestEditor: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  onSpecChange: (spec: OpenAPIDoc) => void;
}> = ({ spec, path, method, onSpecChange }) => {
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!operation || !pathItem) return null;

  const patchOp = (next: OperationObject) => onSpecChange(updateOperation(spec, path, method, () => next));
  const related = collectOperationSchemaNames(spec, path, method);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="shrink-0 px-3 py-2 border-b border-border/50 flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-tight">Request</p>
          <p className="text-[10px] text-muted-foreground">Parameters, body, and related schemas</p>
        </div>
        <MethodBadge method={method} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>Summary</FieldLabel>
            <Input
              value={operation.summary ?? ""}
              onChange={(e) => patchOp({ ...operation, summary: e.target.value })}
              className="h-8 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Operation ID</FieldLabel>
            <Input
              value={operation.operationId ?? ""}
              onChange={(e) => patchOp({ ...operation, operationId: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <FieldLabel>Description</FieldLabel>
          <Textarea
            value={operation.description ?? ""}
            onChange={(e) => patchOp({ ...operation, description: e.target.value })}
            className="min-h-[72px] text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Tags (comma separated)</FieldLabel>
          <Input
            value={(operation.tags ?? []).join(", ")}
            onChange={(e) =>
              patchOp({
                ...operation,
                tags: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            className="h-8 text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={Boolean(operation.deprecated)}
            onCheckedChange={(value) => patchOp({ ...operation, deprecated: value === true })}
          />
          Deprecated
        </label>

        <ParameterTable
          spec={spec}
          title="Path parameters (shared)"
          parameters={pathItem.parameters ?? []}
          onChange={(parameters) =>
            onSpecChange(updatePathItem(spec, path, (item) => ({ ...item, parameters })))
          }
          onSpecChange={onSpecChange}
        />

        <ParameterTable
          spec={spec}
          title="Operation parameters"
          parameters={operation.parameters ?? []}
          onChange={(parameters) => patchOp({ ...operation, parameters })}
          onSpecChange={onSpecChange}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FieldLabel>Request body</FieldLabel>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Checkbox
                checked={Boolean(operation.requestBody?.required)}
                onCheckedChange={(value) =>
                  patchOp({
                    ...operation,
                    requestBody: {
                      ...(operation.requestBody ?? { content: { "application/json": { schema: { type: "object" } } } }),
                      required: value === true,
                    },
                  })
                }
              />
              Required
            </label>
          </div>
          <BodySchemaBlock
            spec={spec}
            content={operation.requestBody?.content}
            emptyLabel="This endpoint has no request body."
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
        </div>

        {related.length > 0 ? (
          <div className="space-y-2">
            <FieldLabel>Schemas used by this endpoint</FieldLabel>
            {related.map((name) => (
              <div key={name} className="space-y-1.5">
                <p className="text-xs font-bold font-mono">{name}</p>
                <SchemaVisualEditor
                  spec={spec}
                  schema={{ $ref: componentRef("schemas", name) }}
                  onChange={() => undefined}
                  onSpecChange={onSpecChange}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
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
    patchOp({
      ...operation,
      responses: { ...operation.responses, [code]: next },
    });
  };

  const addCode = () => {
    let code = "200";
    if (operation.responses?.["200"]) code = "201";
    if (operation.responses?.[code]) code = "400";
    if (operation.responses?.[code]) code = String(Object.keys(operation.responses).length + 200);
    patchOp({
      ...operation,
      responses: {
        ...operation.responses,
        [code]: {
          description: "OK",
          content: { "application/json": { schema: { type: "object", properties: {} } } },
        },
      },
    });
    setActive(code);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="shrink-0 px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold tracking-tight">Response</p>
          <p className="text-[10px] text-muted-foreground">Status codes, descriptions, and response schemas</p>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCode} type="button">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Status
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {codes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No responses yet.</p>
          ) : (
            codes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setActive(code)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold font-mono ${
                  currentCode === code
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {code}
              </button>
            ))
          )}
        </div>

        {currentCode && response ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <FieldLabel>Status</FieldLabel>
                <Input
                  value={currentCode}
                  onChange={(e) => {
                    const nextCode = e.target.value.trim();
                    if (!nextCode || nextCode === currentCode || operation.responses?.[nextCode]) return;
                    const responses = { ...operation.responses };
                    responses[nextCode] = response;
                    delete responses[currentCode];
                    patchOp({ ...operation, responses });
                    setActive(nextCode);
                  }}
                  className="h-8 text-xs font-mono"
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1">
                <FieldLabel>Description</FieldLabel>
                <Input
                  value={response.description ?? ""}
                  onChange={(e) => patchResponse(currentCode, { ...response, description: e.target.value })}
                  className="h-8 text-xs"
                />
              </label>
            </div>
            <BodySchemaBlock
              spec={spec}
              content={response.content}
              emptyLabel="This status has no response body."
              onSpecChange={onSpecChange}
              onChange={(content) => patchResponse(currentCode, { ...response, content })}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              type="button"
              onClick={() => {
                const responses = { ...operation.responses };
                delete responses[currentCode];
                patchOp({ ...operation, responses });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove {currentCode}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export const OpenApiTool: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceText, setSourceText] = useState("");
  const [spec, setSpec] = useState<OpenAPIDoc | null>(null);
  const [format, setFormat] = useState<SpecFormat>("json");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ path: string; method: HttpMethod } | null>(null);
  const [newPath, setNewPath] = useState("/resource");
  const [newMethod, setNewMethod] = useState<HttpMethod>("get");
  const [docMode, setDocMode] = useState<"visual" | "source">("visual");

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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const op of filtered) {
      const tag = op.tags[0] || "untagged";
      const list = map.get(tag) ?? [];
      list.push(op);
      map.set(tag, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const loadText = (text: string) => {
    try {
      const parsed = parseSpec(text);
      setSpec(parsed.spec);
      setFormat(parsed.format);
      setError(null);
      setSelected(null);
      setSourceText(serializeSpec(parsed.spec, parsed.format));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse OpenAPI document.");
      setSpec(null);
    }
  };

  const applySpec = (next: OpenAPIDoc) => {
    setSpec(next);
    setSourceText(serializeSpec(next, format));
    setError(null);
  };

  const download = () => {
    if (!spec) return;
    const blob = new Blob([serializeSpec(spec, format)], {
      type: format === "yaml" ? "text/yaml" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.info.title.replace(/\s+/g, "-").toLowerCase() || "openapi"}.${format === "yaml" ? "yaml" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onUpload = async (file: File) => {
    const text = await file.text();
    setSourceText(text);
    loadText(text);
  };

  if (!spec) {
    return (
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold tracking-tight">OpenAPI 3 Editor</h1>
            <p className="text-[11px] text-muted-foreground">
              Paste or upload an OpenAPI 3.0/3.1 document, then click an endpoint to visually edit request and response schemas.
            </p>
          </div>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
          <div className="flex flex-col min-h-0 gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Document</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                type="button"
                onClick={async () => {
                  const text = await navigator.clipboard.readText();
                  setSourceText(text);
                }}
              >
                Paste
              </Button>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={'openapi: "3.1.0"\ninfo:\n  title: My API\n  version: 1.0.0\npaths: {}'}
              className="flex-1 min-h-0 w-full p-3 rounded-xl border border-border bg-background font-mono text-xs leading-relaxed resize-none"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex flex-col min-h-0 rounded-xl border border-border bg-card/40 p-4 gap-4 overflow-y-auto">
            <div className="space-y-1">
              <p className="text-sm font-bold">Open a spec</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                JSON or YAML. After it loads, the left column lists every endpoint. Click one to open a two-column visual editor for that operation’s request and responses, including shared component schemas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-8 text-xs" type="button" onClick={() => loadText(sourceText)}>
                <Braces className="h-3.5 w-3.5 mr-1" />
                Parse document
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                type="button"
                onClick={() => {
                  const sample = cloneSpec(SAMPLE_OPENAPI);
                  applySpec(sample);
                }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Load sample
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" type="button" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload file
              </Button>
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
            </div>
            <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-[11px] space-y-1.5">
              <p className="font-bold text-foreground">What you can edit per endpoint</p>
              <p className="text-muted-foreground">Summary, operationId, tags, path and operation parameters, request body schema, response statuses, and any `$ref` schemas that body uses.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selected) {
    const current = operations.find((op) => op.path === selected.path && op.method === selected.method);
    return (
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" type="button" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            All endpoints
          </Button>
          <MethodBadge method={selected.method} />
          <span className="font-mono text-xs font-bold truncate">{selected.path}</span>
          <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
            {current?.summary}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={`${selected.method}:${selected.path}`}
              onValueChange={(value) => {
                const [method, ...rest] = value.split(":");
                setSelected({ method: method as HttpMethod, path: rest.join(":") });
              }}
            >
              <SelectTrigger className="h-8 w-[240px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operations.map((op) => (
                  <SelectItem key={op.id} value={`${op.method}:${op.path}`}>
                    {op.method.toUpperCase()} {op.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CopyButton value={serializeSpec(spec, format)} label="Copy spec" className="h-8 text-xs" />
          </div>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
          <RequestEditor spec={spec} path={selected.path} method={selected.method} onSpecChange={applySpec} />
          <ResponseEditor spec={spec} path={selected.path} method={selected.method} onSpecChange={applySpec} />
        </div>
      </div>
    );
  }

  const schemaNames = collectSchemaNames(spec);

  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-extrabold tracking-tight">{spec.info.title}</h1>
          <p className="text-[11px] text-muted-foreground">
            OpenAPI {spec.openapi} · v{spec.info.version} · {operations.length} endpoints
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={format} onValueChange={(value) => {
            const next = value as SpecFormat;
            setFormat(next);
            setSourceText(serializeSpec(spec, next));
          }}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="yaml">YAML</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs" type="button" onClick={download}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" type="button" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-3.5 w-3.5 mr-1" />
            Replace
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" type="button" onClick={() => { setSpec(null); setSelected(null); }}>
            Close
          </Button>
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
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
        <div className="flex flex-col min-h-0 rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="shrink-0 p-3 border-b border-border/50 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Go to endpoint…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                placeholder="/path/{id}"
              />
              <Select value={newMethod} onValueChange={(value) => setNewMethod(value as HttpMethod)}>
                <SelectTrigger className="h-7 w-[96px] text-xs uppercase">
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
              <Button
                size="sm"
                className="h-7 text-xs"
                type="button"
                onClick={() => {
                  const path = newPath.startsWith("/") ? newPath : `/${newPath}`;
                  applySpec(addOperation(spec, path, newMethod));
                  setSelected({ path, method: newMethod });
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
            {grouped.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No endpoints match that search.</p>
            ) : (
              grouped.map(([tag, ops]) => (
                <div key={tag} className="space-y-1">
                  <p className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{tag}</p>
                  {ops.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelected({ path: op.path, method: op.method })}
                      className="w-full flex items-start gap-2 rounded-lg border border-transparent hover:border-border hover:bg-background/70 px-2 py-2 text-left transition-colors"
                    >
                      <MethodBadge method={op.method} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold truncate">{op.path}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{op.summary}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          applySpec(removeOperation(spec, op.path, op.method));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0 rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <p className="text-xs font-extrabold">Specification</p>
            <Tabs value={docMode} onValueChange={(value) => setDocMode(value as "visual" | "source")}>
              <TabsList className="h-7">
                <TabsTrigger value="visual" className="text-[10px] h-6 px-2">
                  Visual
                </TabsTrigger>
                <TabsTrigger value="source" className="text-[10px] h-6 px-2">
                  Source
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {docMode === "source" ? (
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onBlur={() => {
                try {
                  const parsed = parseSpec(sourceText);
                  setSpec(parsed.spec);
                  setFormat(parsed.format);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Invalid document.");
                }
              }}
              className="flex-1 min-h-0 p-3 font-mono text-xs bg-background/40 resize-none"
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={spec.info.title}
                    onChange={(e) => applySpec({ ...spec, info: { ...spec.info, title: e.target.value } })}
                    className="h-8 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <FieldLabel>Version</FieldLabel>
                  <Input
                    value={spec.info.version}
                    onChange={(e) => applySpec({ ...spec, info: { ...spec.info, version: e.target.value } })}
                    className="h-8 text-xs"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={spec.info.description ?? ""}
                  onChange={(e) => applySpec({ ...spec, info: { ...spec.info, description: e.target.value } })}
                  className="min-h-[72px] text-xs"
                />
              </label>

              <div className="flex flex-wrap gap-1.5">
                {[
                  ["Paths", Object.keys(spec.paths ?? {}).length],
                  ["Operations", operations.length],
                  ["Schemas", schemaNames.length],
                  ["Servers", spec.servers?.length ?? 0],
                ].map(([label, count]) => (
                  <span key={label} className="px-2 py-1 rounded-lg border border-border/60 text-[10px] font-bold">
                    {count} {label}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>Servers</FieldLabel>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    type="button"
                    onClick={() => applySpec({ ...spec, servers: [...(spec.servers ?? []), { url: "https://" }] })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {(spec.servers ?? []).map((server, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Input
                      value={server.url}
                      onChange={(e) => {
                        const servers = [...(spec.servers ?? [])];
                        servers[index] = { ...server, url: e.target.value };
                        applySpec({ ...spec, servers });
                      }}
                      className="h-7 text-xs font-mono flex-1"
                    />
                    <Input
                      value={server.description ?? ""}
                      onChange={(e) => {
                        const servers = [...(spec.servers ?? [])];
                        servers[index] = { ...server, description: e.target.value };
                        applySpec({ ...spec, servers });
                      }}
                      className="h-7 text-xs w-[140px]"
                      placeholder="description"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      onClick={() => applySpec({ ...spec, servers: (spec.servers ?? []).filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <FieldLabel>Component schemas</FieldLabel>
                {schemaNames.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No component schemas yet. Save a body as a schema from an endpoint.</p>
                ) : (
                  schemaNames.map((name) => (
                    <details key={name} className="rounded-lg border border-border/50 bg-background/40">
                      <summary className="cursor-pointer px-2.5 py-1.5 text-xs font-mono font-bold">{name}</summary>
                      <div className="p-2 pt-0">
                        <SchemaVisualEditor
                          spec={spec}
                          schema={{ $ref: componentRef("schemas", name) }}
                          onChange={() => undefined}
                          onSpecChange={applySpec}
                        />
                      </div>
                    </details>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
