import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Braces,
  Download,
  Eye,
  FileJson,
  FileUp,
  FolderOpen,
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
  OperationRef,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SpecFormat,
} from "./openapi-types";

const METHOD_COLOR: Record<string, string> = {
  get: "text-[#f59e0b]",
  post: "text-[#22c55e]",
  put: "text-[#3b82f6]",
  patch: "text-[#a855f7]",
  delete: "text-[#ef4444]",
  options: "text-muted-foreground",
  head: "text-muted-foreground",
  trace: "text-muted-foreground",
};

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

const MethodLabel: React.FC<{ method: string; className?: string }> = ({ method, className = "" }) => (
  <span className={`inline-flex min-w-[3.1rem] justify-center text-[11px] font-extrabold uppercase tracking-wide ${METHOD_COLOR[method] || METHOD_COLOR.options} ${className}`}>
    {method}
  </span>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{children}</span>
);

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

const ParameterTable: React.FC<{
  spec: OpenAPIDoc;
  title: string;
  parameters: ParameterObject[];
  onChange: (parameters: ParameterObject[]) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
}> = ({ spec, title, parameters, onChange, onSpecChange }) => {
  const add = () => {
    onChange([...parameters, { name: "param", in: "query", required: false, schema: { type: "string" } }]);
  };

  const patch = (index: number, next: ParameterObject) => {
    onChange(parameters.map((item, i) => (i === index ? next : item)));
  };

  return (
    <Section
      title={title}
      action={
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={add} type="button">
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      }
    >
      {parameters.length === 0 ? (
        <p className="text-xs text-muted-foreground">None defined.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[88px_1fr_72px_32px] gap-0 bg-muted/70 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>In</span>
            <span>Name</span>
            <span>Req</span>
            <span />
          </div>
          {parameters.map((param, index) => (
            <div key={`${param.name}-${index}`} className="border-t border-border bg-card">
              <div className="grid grid-cols-[88px_1fr_72px_32px] items-center gap-1 px-2 py-1.5">
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
                  <SelectTrigger className="h-7 text-[11px]">
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
                  className="h-7 text-xs font-mono"
                  placeholder="name"
                />
                <label className="flex items-center justify-center">
                  <Checkbox
                    checked={Boolean(param.required) || param.in === "path"}
                    onCheckedChange={(value) => patch(index, { ...param, required: value === true })}
                    disabled={param.in === "path"}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(parameters.filter((_, i) => i !== index))}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="px-2 pb-2 space-y-2">
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
            </div>
          ))}
        </div>
      )}
    </Section>
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
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={contentType}
          onChange={(e) => {
            const nextType = e.target.value || "application/json";
            onChange({ [nextType]: content[contentType] });
          }}
          className="h-7 w-[190px] text-xs font-mono bg-background"
        />
        <Tabs value={mode} onValueChange={(value) => setMode(value as "visual" | "json")}>
          <TabsList className="h-7">
            <TabsTrigger value="visual" className="h-6 px-2 text-[11px]">
              <Eye className="h-3 w-3 mr-1" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="json" className="h-6 px-2 text-[11px]">
              <Braces className="h-3 w-3 mr-1" />
              Schema JSON
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-1.5">
          <Input
            value={extractName}
            onChange={(e) => setExtractName(e.target.value)}
            placeholder="Pet"
            className="h-7 w-[120px] text-xs bg-background"
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
            Save as $ref
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
          className="min-h-[240px] font-mono text-xs bg-background"
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
  const [tab, setTab] = useState("params");
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!operation || !pathItem) return null;

  const patchOp = (next: OperationObject) => onSpecChange(updateOperation(spec, path, method, () => next));
  const related = collectOperationSchemaNames(spec, path, method);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-bold">Request</p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-7">
            <TabsTrigger value="params" className="h-6 px-2.5 text-[11px]">Params</TabsTrigger>
            <TabsTrigger value="body" className="h-6 px-2.5 text-[11px]">Body</TabsTrigger>
            <TabsTrigger value="docs" className="h-6 px-2.5 text-[11px]">Docs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {tab === "params" && (
          <>
            <ParameterTable
              spec={spec}
              title="Path params"
              parameters={pathItem.parameters ?? []}
              onChange={(parameters) =>
                onSpecChange(updatePathItem(spec, path, (item) => ({ ...item, parameters })))
              }
              onSpecChange={onSpecChange}
            />
            <ParameterTable
              spec={spec}
              title="Query / header / cookie"
              parameters={operation.parameters ?? []}
              onChange={(parameters) => patchOp({ ...operation, parameters })}
              onSpecChange={onSpecChange}
            />
          </>
        )}

        {tab === "body" && (
          <Section
            title="Request body"
            action={
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
            }
          >
            <BodySchemaBlock
              spec={spec}
              content={operation.requestBody?.content}
              emptyLabel="No request body on this method."
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
          </Section>
        )}

        {tab === "docs" && (
          <>
            <Section title="Operation">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <FieldLabel>Summary</FieldLabel>
                  <Input
                    value={operation.summary ?? ""}
                    onChange={(e) => patchOp({ ...operation, summary: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <FieldLabel>Operation ID</FieldLabel>
                  <Input
                    value={operation.operationId ?? ""}
                    onChange={(e) => patchOp({ ...operation, operationId: e.target.value })}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <FieldLabel>Tags</FieldLabel>
                <Input
                  value={(operation.tags ?? []).join(", ")}
                  onChange={(e) =>
                    patchOp({
                      ...operation,
                      tags: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                    })
                  }
                  className="h-8 text-xs bg-background"
                />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={operation.description ?? ""}
                  onChange={(e) => patchOp({ ...operation, description: e.target.value })}
                  className="min-h-[88px] text-xs bg-background"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={Boolean(operation.deprecated)}
                  onCheckedChange={(value) => patchOp({ ...operation, deprecated: value === true })}
                />
                Deprecated
              </label>
            </Section>
            {related.length > 0 ? (
              <Section title="Linked schemas">
                {related.map((name) => (
                  <div key={name} className="space-y-1.5">
                    <p className="text-xs font-mono font-bold">{name}</p>
                    <SchemaVisualEditor
                      spec={spec}
                      schema={{ $ref: componentRef("schemas", name) }}
                      onChange={() => undefined}
                      onSpecChange={onSpecChange}
                    />
                  </div>
                ))}
              </Section>
            ) : null}
          </>
        )}
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card border-l border-border">
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-bold">Response</p>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={addCode} type="button">
          <Plus className="h-3 w-3 mr-1" />
          Status
        </Button>
      </div>
      <div className="shrink-0 flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/40 px-2 py-1.5">
        {codes.length === 0 ? (
          <p className="px-1 text-[11px] text-muted-foreground">No statuses</p>
        ) : (
          codes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setActive(code)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                currentCode === code
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={STATUS_TONE(code)}>{code}</span>
            </button>
          ))
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {currentCode && response ? (
          <>
            <Section
              title="Status"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                  type="button"
                  onClick={() => {
                    const responses = { ...operation.responses };
                    delete responses[currentCode];
                    patchOp({ ...operation, responses });
                  }}
                >
                  Remove
                </Button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <FieldLabel>Code</FieldLabel>
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
                    className="h-8 text-xs font-mono bg-background"
                  />
                </label>
                <label className="sm:col-span-2 flex flex-col gap-1">
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    value={response.description ?? ""}
                    onChange={(e) => patchResponse(currentCode, { ...response, description: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </label>
              </div>
            </Section>
            <Section title="Body schema">
              <BodySchemaBlock
                spec={spec}
                content={response.content}
                emptyLabel="This status has no response body."
                onSpecChange={onSpecChange}
                onChange={(content) => patchResponse(currentCode, { ...response, content })}
              />
            </Section>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Add a status code to describe a response.</p>
        )}
      </div>
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
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
        <textarea
          value={sourceText}
          onChange={(e) => onSourceChange(e.target.value)}
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
          className="flex-1 min-h-0 resize-none bg-background p-4 font-mono text-xs leading-relaxed"
        />
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
                <details key={name} className="rounded-md border border-border bg-muted/30">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-mono font-bold">{name}</summary>
                  <div className="border-t border-border p-2">
                    <SchemaVisualEditor
                      spec={spec}
                      schema={{ $ref: componentRef("schemas", name) }}
                      onChange={() => undefined}
                      onSpecChange={onSpecChange}
                    />
                  </div>
                </details>
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
  const [format, setFormat] = useState<SpecFormat>("json");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ path: string; method: HttpMethod } | null>(null);
  const [newPath, setNewPath] = useState("/");
  const [newMethod, setNewMethod] = useState<HttpMethod>("get");
  const [dragOver, setDragOver] = useState(false);

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
    const map = new Map<string, OperationRef[]>();
    for (const op of filtered) {
      const tag = op.tags[0] || "default";
      const list = map.get(tag) ?? [];
      list.push(op);
      map.set(tag, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const applySpec = (next: OpenAPIDoc, nextFormat = format) => {
    setSpec(next);
    setFormat(nextFormat);
    setSourceText(serializeSpec(next, nextFormat));
    setError(null);
  };

  const loadText = (text: string, keepSelection = false) => {
    try {
      const parsed = parseSpec(text);
      applySpec(parsed.spec, parsed.format);
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
              {grouped.map(([tag, ops]) => (
                <div key={tag} className="py-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tag}</p>
                  {ops.map((op) => {
                    const active = selected?.path === op.path && selected?.method === op.method;
                    return (
                      <div
                        key={op.id}
                        className={`group flex items-center gap-1.5 px-2 py-1 ${
                          active ? "bg-muted" : "hover:bg-muted/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected({ path: op.path, method: op.method })}
                          className="flex min-w-0 flex-1 items-center gap-2 px-1 py-0.5 text-left"
                        >
                          <MethodLabel method={op.method} />
                          <span className={`truncate font-mono text-[11px] ${active ? "font-semibold" : "text-foreground/80"}`}>
                            {op.path}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          type="button"
                          onClick={() => {
                            const next = removeOperation(spec, op.path, op.method);
                            applySpec(next);
                            if (active) setSelected(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ))}
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
              <Input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="h-7 flex-1 font-mono text-[11px] bg-background"
                placeholder="/path"
              />
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

      <main className="flex min-w-0 flex-1 flex-col bg-muted/20">
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
                <Button variant="outline" size="sm" className="h-7 text-[11px]" type="button" onClick={download}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Save
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
                    applySpec(sample);
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
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2 overflow-hidden">
              <RequestEditor spec={spec} path={selected.path} method={selected.method} onSpecChange={(next) => applySpec(next)} />
              <ResponseEditor spec={spec} path={selected.path} method={selected.method} onSpecChange={(next) => applySpec(next)} />
            </div>
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
};
