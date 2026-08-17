import React, { useEffect, useMemo, useState } from "react";
import { Link2, Link2Off, Maximize2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/shared/copy-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "./code-editor";
import { FullscreenModal } from "./fullscreen-modal";
import { SchemaTreeEditor } from "./schema-tree-editor";
import {
  COMMON_MEDIA_TYPES,
  componentRef,
  contentTypes,
  emptySchemaForType,
  generateExampleFromSchema,
  inferSchemaFromJson,
  isRef,
  parseComponentRef,
  resolveRef,
  schemaType,
  uniqueName,
  upsertComponentSchema,
} from "./openapi-model";
import type { OpenAPIDoc, SchemaObject } from "./openapi-types";

type BodySchemaPanelProps = {
  spec: OpenAPIDoc;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
  onChange: (content: Record<string, { schema?: SchemaObject; example?: unknown }>) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
  emptyLabel: string;
  title?: string;
  required?: boolean;
  onRequiredChange?: (required: boolean) => void;
};

const ROOT_TYPES = ["object", "array", "string", "integer", "number", "boolean"] as const;

type BodyEditorProps = BodySchemaPanelProps & {
  layout: "compact" | "wide";
  onExpand?: () => void;
};

const BodyEditor: React.FC<BodyEditorProps> = ({
  spec,
  content,
  onChange,
  onSpecChange,
  emptyLabel,
  title = "Body",
  required,
  onRequiredChange,
  layout,
  onExpand,
}) => {
  const [jsonView, setJsonView] = useState<"example" | "schema">("example");
  const [extractName, setExtractName] = useState("");
  const [exampleDraft, setExampleDraft] = useState("");
  const [exampleDirty, setExampleDirty] = useState(false);
  const [schemaDraft, setSchemaDraft] = useState("");
  const types = contentTypes(content);
  const [contentType, setContentType] = useState(types[0] || "application/json");
  const activeType = types.includes(contentType) ? contentType : types[0] || "application/json";
  const rawSchema = content?.[activeType]?.schema;
  const refInfo = rawSchema?.$ref ? parseComponentRef(rawSchema.$ref) : null;
  const resolved = useMemo(() => {
    if (!rawSchema) return { type: "object", properties: {} } satisfies SchemaObject;
    if (isRef(rawSchema)) return resolveRef<SchemaObject>(spec, rawSchema) ?? { type: "object", properties: {} };
    return rawSchema;
  }, [rawSchema, spec]);

  const example = useMemo(() => {
    const explicit = content?.[activeType]?.example;
    if (explicit !== undefined) return explicit;
    return generateExampleFromSchema(spec, rawSchema ?? resolved);
  }, [activeType, content, rawSchema, resolved, spec]);

  const exampleText = JSON.stringify(example ?? {}, null, 2);
  const schemaJson = JSON.stringify(resolved ?? {}, null, 2);
  const rootType = schemaType(resolved);
  const mediaOptions = useMemo(() => {
    const set = new Set<string>(COMMON_MEDIA_TYPES);
    if (activeType) set.add(activeType);
    return [...set];
  }, [activeType]);

  useEffect(() => {
    if (!exampleDirty) setExampleDraft(exampleText);
  }, [exampleText, exampleDirty]);

  useEffect(() => {
    setSchemaDraft(schemaJson);
  }, [schemaJson]);

  const commitSchema = (next: SchemaObject) => {
    if (refInfo?.group === "schemas") {
      onSpecChange(upsertComponentSchema(spec, refInfo.name, next));
      return;
    }
    onChange({
      ...content,
      [activeType]: { ...content?.[activeType], schema: next },
    });
  };

  const addField = () => {
    const current = rootType === "object" ? resolved : emptySchemaForType("object");
    const properties = current.properties ?? {};
    const name = uniqueName(Object.keys(properties), "field");
    commitSchema({
      ...current,
      type: "object",
      properties: { ...properties, [name]: { type: "string" } },
    });
  };

  const inferFromExample = () => {
    try {
      const parsed = JSON.parse(exampleDraft) as unknown;
      const nextSchema = inferSchemaFromJson(parsed);
      if (refInfo?.group === "schemas") {
        onSpecChange(upsertComponentSchema(spec, refInfo.name, nextSchema));
        onChange({
          ...content,
          [activeType]: { ...content?.[activeType], example: parsed },
        });
      } else {
        onChange({
          ...content,
          [activeType]: { ...content?.[activeType], example: parsed, schema: nextSchema },
        });
      }
      setExampleDirty(false);
    } catch {
      /* invalid json */
    }
  };

  const applyExample = () => {
    try {
      const parsed = JSON.parse(exampleDraft) as unknown;
      onChange({
        ...content,
        [activeType]: { ...content?.[activeType], example: parsed },
      });
      setExampleDirty(false);
    } catch {
      /* invalid json */
    }
  };

  if (!content || types.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-10 text-center">
        <p className="text-sm font-semibold">No body defined</p>
        <p className="max-w-sm text-xs text-muted-foreground">{emptyLabel}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          type="button"
          onClick={() => onChange({ "application/json": { schema: { type: "object", properties: {} } } })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add JSON body
        </Button>
      </div>
    );
  }

  const fieldsPane = (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider">Fields</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {refInfo ? `Editing shared schema ${refInfo.name}` : "Name, type, and required for this body"}
          </p>
        </div>
        <Select
          value={ROOT_TYPES.includes(rootType as (typeof ROOT_TYPES)[number]) ? rootType : "object"}
          onValueChange={(value) => commitSchema(emptySchemaForType(value))}
        >
          <SelectTrigger className="h-7 w-[108px] bg-background text-[11px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {ROOT_TYPES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={addField}>
          <Plus className="h-3 w-3 mr-1" />
          Add field
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <SchemaTreeEditor spec={spec} schema={resolved} onChange={commitSchema} />
      </div>
    </div>
  );

  const jsonPane = (
    <div className="relative z-0 flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <Tabs value={jsonView} onValueChange={(value) => setJsonView(value as "example" | "schema")}>
          <TabsList className="h-7">
            <TabsTrigger value="example" className="h-6 px-2 text-[11px]">
              Example
            </TabsTrigger>
            <TabsTrigger value="schema" className="h-6 px-2 text-[11px]">
              Schema JSON
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          {jsonView === "example" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              type="button"
              onClick={inferFromExample}
              title="Build fields from the example JSON"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Infer fields
            </Button>
          ) : null}
          {jsonView === "example" && exampleDirty ? (
            <Button size="sm" className="h-6 px-2 text-[10px]" type="button" onClick={applyExample}>
              Save example
            </Button>
          ) : null}
          <CopyButton value={jsonView === "example" ? exampleDraft : schemaDraft} className="h-6 w-6" />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {jsonView === "example" ? (
          <CodeEditor
            value={exampleDraft}
            onChange={(value) => {
              setExampleDraft(value);
              setExampleDirty(value !== exampleText);
            }}
            language="json"
            height="100%"
            className="h-full rounded-none border-0"
          />
        ) : (
          <CodeEditor
            value={schemaDraft}
            onChange={(value) => {
              setSchemaDraft(value);
              try {
                commitSchema(JSON.parse(value) as SchemaObject);
              } catch {
                /* keep typing */
              }
            }}
            language="json"
            height="100%"
            className="h-full rounded-none border-0"
          />
        )}
      </div>
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        {layout === "compact" ? (
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
        ) : null}
        {onRequiredChange ? (
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Checkbox
              checked={Boolean(required)}
              onCheckedChange={(value) => onRequiredChange(value === true)}
            />
            Required
          </label>
        ) : null}
        <Select
          value={activeType}
          onValueChange={(nextType) => {
            onChange({ [nextType]: content[activeType] });
            setContentType(nextType);
          }}
        >
          <SelectTrigger className="h-7 w-[210px] bg-background font-mono text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mediaOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {refInfo ? (
          <div className="flex items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-800 dark:text-sky-300">
            <Link2 className="h-3 w-3" />
            <span className="font-semibold">#{refInfo.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px]"
              type="button"
              onClick={() =>
                onChange({
                  ...content,
                  [activeType]: { ...content[activeType], schema: structuredClone(resolved) },
                })
              }
            >
              <Link2Off className="h-3 w-3 mr-1" />
              Unlink
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              value={extractName}
              onChange={(e) => setExtractName(e.target.value)}
              placeholder="Save as schema…"
              className="h-7 w-[140px] text-xs bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              type="button"
              disabled={!extractName.trim()}
              onClick={() => {
                const name = extractName.trim();
                onSpecChange(upsertComponentSchema(spec, name, resolved));
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
        )}
        {onExpand ? (
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-[11px]" type="button" onClick={onExpand}>
            <Maximize2 className="h-3 w-3 mr-1" />
            Expand
          </Button>
        ) : null}
      </header>
      <div
        className={
          layout === "wide"
            ? "grid min-h-0 flex-1 grid-cols-1 divide-x divide-border lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
            : "flex min-h-0 flex-1 flex-col divide-y divide-border"
        }
      >
        {fieldsPane}
        <div className={layout === "wide" ? "flex min-h-0 min-w-0 flex-col" : "flex min-h-[170px] flex-[0.85] flex-col"}>
          {jsonPane}
        </div>
      </div>
    </section>
  );
};

export const BodySchemaPanel: React.FC<BodySchemaPanelProps> = (props) => {
  const [fullscreen, setFullscreen] = useState(false);
  const title = props.title ?? "Body";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!fullscreen ? (
        <BodyEditor {...props} layout="compact" onExpand={() => setFullscreen(true)} />
      ) : (
        <p className="text-xs text-muted-foreground">Editing in fullscreen…</p>
      )}
      <FullscreenModal title={title} open={fullscreen} onOpenChange={setFullscreen} showTrigger={false}>
        <BodyEditor {...props} layout="wide" />
      </FullscreenModal>
    </div>
  );
};
