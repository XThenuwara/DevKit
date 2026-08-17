import React, { useEffect, useMemo, useState } from "react";
import { Braces, Columns2, Eye, FileJson, FormInput, Maximize2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/shared/copy-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "./code-editor";
import { FullscreenModal } from "./fullscreen-modal";
import { SchemaVisualEditor } from "./schema-visual-editor";
import {
  componentRef,
  contentTypes,
  generateExampleFromSchema,
  isRef,
  resolveRef,
  schemaType,
  upsertComponentSchema,
} from "./openapi-model";
import type { OpenAPIDoc, SchemaObject } from "./openapi-types";

const PRIMITIVE_TYPES = ["string", "integer", "number", "boolean", "array", "object", "$ref"] as const;
const FORMATS: Record<string, string[]> = {
  string: ["", "date", "date-time", "email", "uuid", "uri"],
  integer: ["", "int32", "int64"],
  number: ["", "float", "double"],
};

type BodySchemaPanelProps = {
  spec: OpenAPIDoc;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
  onChange: (content: Record<string, { schema?: SchemaObject; example?: unknown }>) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
  emptyLabel: string;
  title?: string;
};

const PropertyTree: React.FC<{
  name: string;
  schema: SchemaObject;
  depth?: number;
  required?: boolean;
}> = ({ name, schema, depth = 0, required = false }) => {
  const type = schemaType(schema);
  const props = schema.properties ?? {};
  const reqSet = new Set(schema.required ?? []);
  const [open, setOpen] = useState(depth < 2);

  if (type === "object" && Object.keys(props).length > 0) {
    return (
      <div className={depth > 0 ? "ml-3 border-l border-border pl-2" : ""}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-muted/50"
        >
          <span className="font-mono font-semibold">{name}</span>
          <span className="text-[10px] text-muted-foreground">object</span>
          {required ? <span className="text-[10px] text-amber-600">required</span> : null}
        </button>
        {open ? (
          <div className="mt-0.5 space-y-0.5">
            {Object.entries(props).map(([key, child]) => (
              <PropertyTree key={key} name={key} schema={child} depth={depth + 1} required={reqSet.has(key)} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs ${depth > 0 ? "ml-3" : ""}`}>
      <span className="font-mono font-medium">{name}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {type}{schema.format ? ` · ${schema.format}` : ""}
      </span>
      {required ? <span className="text-[10px] text-amber-600">required</span> : null}
      {schema.description ? <span className="truncate text-[10px] text-muted-foreground">{schema.description}</span> : null}
    </div>
  );
};

const BodyEditor: React.FC<BodySchemaPanelProps & { fullscreen?: boolean }> = ({
  spec,
  content,
  onChange,
  onSpecChange,
  emptyLabel,
  fullscreen = false,
}) => {
  const [mode, setMode] = useState<"split" | "visual" | "form" | "tree" | "json">("split");
  const [extractName, setExtractName] = useState("");
  const [exampleDraft, setExampleDraft] = useState("");
  const [exampleDirty, setExampleDirty] = useState(false);
  const types = contentTypes(content);
  const [contentType, setContentType] = useState(types[0] || "application/json");
  const activeType = types.includes(contentType) ? contentType : types[0] || "application/json";
  const schema = content?.[activeType]?.schema;
  const resolved = useMemo(() => {
    if (!schema) return undefined;
    return isRef(schema) ? resolveRef<SchemaObject>(spec, schema) : schema;
  }, [schema, spec]);

  const example = useMemo(() => {
    const explicit = content?.[activeType]?.example;
    if (explicit !== undefined) return explicit;
    return generateExampleFromSchema(spec, schema);
  }, [activeType, content, schema, spec]);

  const exampleText = JSON.stringify(example ?? {}, null, 2);
  const schemaJson = JSON.stringify(schema ?? {}, null, 2);

  useEffect(() => {
    if (!exampleDirty) setExampleDraft(exampleText);
  }, [exampleText, exampleDirty]);

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

  const patchSchema = (next: SchemaObject) => {
    onChange({
      ...content,
      [activeType]: { ...content[activeType], schema: next },
    });
  };

  const patchResolved = (next: SchemaObject) => {
    if (schema && isRef(schema)) {
      const match = schema.$ref?.match(/\/schemas\/(.+)$/);
      const name = match ? decodeURIComponent(match[1]) : "";
      if (name) {
        onSpecChange(upsertComponentSchema(spec, name, next));
        return;
      }
    }
    patchSchema(next);
  };

  const applyExample = () => {
    try {
      const parsed = JSON.parse(exampleDraft) as unknown;
      onChange({
        ...content,
        [activeType]: { ...content[activeType], example: parsed },
      });
      setExampleDirty(false);
    } catch {
      /* invalid json */
    }
  };

  const properties = resolved?.properties ?? {};
  const required = new Set(resolved?.required ?? []);
  const editorHeight = fullscreen ? "calc(92vh - 180px)" : 320;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {types.length > 1 ? (
          <Tabs value={activeType} onValueChange={setContentType}>
            <TabsList className="h-7">
              {types.map((type) => (
                <TabsTrigger key={type} value={type} className="h-6 px-2 text-[10px] font-mono">
                  {type.replace("application/", "")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <Input
            value={activeType}
            onChange={(e) => {
              const nextType = e.target.value || "application/json";
              onChange({ [nextType]: content[activeType] });
              setContentType(nextType);
            }}
            className="h-7 w-[190px] text-xs font-mono bg-background"
          />
        )}
        <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
          <TabsList className="h-7">
            <TabsTrigger value="split" className="h-6 px-2 text-[11px]">
              <Columns2 className="h-3 w-3 mr-1" />
              Split
            </TabsTrigger>
            <TabsTrigger value="visual" className="h-6 px-2 text-[11px]">
              <Eye className="h-3 w-3 mr-1" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="form" className="h-6 px-2 text-[11px]">
              <FormInput className="h-3 w-3 mr-1" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="tree" className="h-6 px-2 text-[11px]">
              <FileJson className="h-3 w-3 mr-1" />
              Tree
            </TabsTrigger>
            <TabsTrigger value="json" className="h-6 px-2 text-[11px]">
              <Braces className="h-3 w-3 mr-1" />
              Schema
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-1.5">
          <Input
            value={extractName}
            onChange={(e) => setExtractName(e.target.value)}
            placeholder="Schema name"
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
              const resolvedSchema = resolved ?? { type: "object" };
              onSpecChange(upsertComponentSchema(spec, name, resolvedSchema));
              onChange({
                ...content,
                [activeType]: { ...content[activeType], schema: { $ref: componentRef("schemas", name) } },
              });
              setExtractName("");
            }}
          >
            Save as $ref
          </Button>
        </div>
      </div>

      {mode === "split" ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-1.5 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Schema</p>
              <CopyButton value={schemaJson} className="h-6 w-6" />
            </div>
            <SchemaVisualEditor
              spec={spec}
              schema={schema ?? { type: "object", properties: {} }}
              onChange={patchSchema}
              onSpecChange={onSpecChange}
            />
          </div>
          <div className="space-y-1.5 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Example JSON</p>
              <div className="flex items-center gap-1">
                {exampleDirty ? (
                  <Button size="sm" className="h-6 px-2 text-[10px]" type="button" onClick={applyExample}>
                    Apply example
                  </Button>
                ) : null}
                <CopyButton value={exampleDraft} className="h-6 w-6" />
              </div>
            </div>
            <CodeEditor
              value={exampleDraft}
              onChange={(value) => {
                setExampleDraft(value);
                setExampleDirty(value !== exampleText);
              }}
              language="json"
              height={editorHeight}
              className="flex-1 min-h-[240px]"
            />
          </div>
        </div>
      ) : null}

      {mode === "visual" ? (
        <SchemaVisualEditor
          spec={spec}
          schema={schema ?? { type: "object", properties: {} }}
          onChange={patchSchema}
          onSpecChange={onSpecChange}
        />
      ) : null}

      {mode === "tree" ? (
        <div className="rounded-md border border-border bg-muted/20 p-3 max-h-[400px] overflow-y-auto">
          {resolved ? (
            <PropertyTree name="root" schema={resolved} required />
          ) : (
            <p className="text-xs text-muted-foreground">No schema to display.</p>
          )}
        </div>
      ) : null}

      {mode === "form" ? (
        <div className="overflow-hidden rounded-md border border-border">
          {schemaType(resolved) !== "object" || !resolved ? (
            <p className="p-3 text-xs text-muted-foreground">
              Fields view works best with object schemas. Switch to Visual or Split.
            </p>
          ) : Object.keys(properties).length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <p className="text-xs text-muted-foreground">No properties yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                type="button"
                onClick={() =>
                  patchResolved({
                    ...resolved,
                    type: "object",
                    properties: { field: { type: "string" } },
                  })
                }
              >
                <Plus className="h-3 w-3 mr-1" />
                Add field
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_88px_88px_52px_1fr_32px] gap-0 bg-muted/70 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Name</span>
                <span>Type</span>
                <span>Format</span>
                <span>Req</span>
                <span>Description</span>
                <span />
              </div>
              {Object.entries(properties).map(([name, prop]) => {
                const type = schemaType(prop);
                const formats = FORMATS[type] ?? [""];
                return (
                  <div
                    key={name}
                    className="grid grid-cols-[1fr_88px_88px_52px_1fr_32px] items-center gap-1 border-t border-border px-2 py-1.5 bg-card"
                  >
                    <Input
                      value={name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        if (!nextName || nextName === name || properties[nextName]) return;
                        const nextProps: Record<string, SchemaObject> = {};
                        for (const [key, value] of Object.entries(properties)) {
                          nextProps[key === name ? nextName : key] = value;
                        }
                        const nextRequired = (resolved.required ?? []).map((item) => (item === name ? nextName : item));
                        patchResolved({ ...resolved, properties: nextProps, required: nextRequired });
                      }}
                      className="h-7 text-xs font-mono"
                    />
                    <Select
                      value={type === "$ref" ? "$ref" : type}
                      onValueChange={(value) => {
                        const next =
                          value === "$ref"
                            ? { $ref: componentRef("schemas", Object.keys(spec.components?.schemas ?? {})[0] ?? "Schema") }
                            : { type: value, ...(value === "array" ? { items: { type: "string" } } : {}) };
                        patchResolved({
                          ...resolved,
                          properties: { ...properties, [name]: next },
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIMITIVE_TYPES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={prop.format ?? ""}
                      onValueChange={(value) =>
                        patchResolved({
                          ...resolved,
                          properties: {
                            ...properties,
                            [name]: { ...prop, format: value || undefined },
                          },
                        })
                      }
                      disabled={!FORMATS[type]}
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {formats.map((fmt) => (
                          <SelectItem key={fmt || "none"} value={fmt}>
                            {fmt || "—"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center justify-center">
                      <Checkbox
                        checked={required.has(name)}
                        onCheckedChange={(value) => {
                          const set = new Set(resolved.required ?? []);
                          if (value) set.add(name);
                          else set.delete(name);
                          patchResolved({ ...resolved, required: [...set] });
                        }}
                      />
                    </label>
                    <Input
                      value={prop.description ?? ""}
                      onChange={(e) =>
                        patchResolved({
                          ...resolved,
                          properties: {
                            ...properties,
                            [name]: { ...prop, description: e.target.value },
                          },
                        })
                      }
                      className="h-7 text-xs"
                      placeholder="Description"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      type="button"
                      onClick={() => {
                        const nextProps = { ...properties };
                        delete nextProps[name];
                        patchResolved({
                          ...resolved,
                          properties: nextProps,
                          required: (resolved.required ?? []).filter((item) => item !== name),
                        });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                );
              })}
              <div className="border-t border-border px-2 py-1.5 bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  type="button"
                  onClick={() => {
                    let field = "field";
                    let i = 1;
                    while (properties[field]) field = `field${i++}`;
                    patchResolved({
                      ...resolved,
                      properties: { ...properties, [field]: { type: "string" } },
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add field
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {mode === "json" ? (
        <CodeEditor
          value={schemaJson}
          onChange={(value) => {
            try {
              patchSchema(JSON.parse(value) as SchemaObject);
            } catch {
              /* keep typing */
            }
          }}
          language="json"
          height={editorHeight}
        />
      ) : null}
    </div>
  );
};

export const BodySchemaPanel: React.FC<BodySchemaPanelProps> = (props) => {
  const [fullscreen, setFullscreen] = useState(false);
  const title = props.title ?? "Body";

  return (
    <>
      <BodyEditor {...props} />
      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px]"
          type="button"
          onClick={() => setFullscreen(true)}
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Expand
        </Button>
      </div>
      <FullscreenModal title={title} open={fullscreen} onOpenChange={setFullscreen} showTrigger={false}>
        <BodyEditor {...props} fullscreen />
      </FullscreenModal>
    </>
  );
};
