import React, { useEffect, useMemo, useState } from "react";
import { Maximize2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "./code-editor";
import { FullscreenModal } from "./fullscreen-modal";
import { SchemaTreeEditor } from "./schema-tree-editor";
import {
  componentRef,
  contentTypes,
  generateExampleFromSchema,
  isRef,
  resolveRef,
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
};

const BodyEditor: React.FC<BodySchemaPanelProps> = ({
  spec,
  content,
  onChange,
  onSpecChange,
  emptyLabel,
}) => {
  const [jsonView, setJsonView] = useState<"example" | "schema">("example");
  const [extractName, setExtractName] = useState("");
  const [exampleDraft, setExampleDraft] = useState("");
  const [exampleDirty, setExampleDirty] = useState(false);
  const [schemaDraft, setSchemaDraft] = useState("");
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

  useEffect(() => {
    setSchemaDraft(schemaJson);
  }, [schemaJson]);

  if (!content || types.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-[240px] flex-col gap-1.5 lg:min-h-0">
          <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Schema tree</p>
          <SchemaTreeEditor
            spec={spec}
            schema={schema ?? { type: "object", properties: {} }}
            onChange={patchSchema}
            onSpecChange={onSpecChange}
          />
        </div>
        <div className="flex min-h-[240px] flex-col gap-1.5 lg:min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Tabs value={jsonView} onValueChange={(value) => setJsonView(value as "example" | "schema")}>
              <TabsList className="h-7">
                <TabsTrigger value="example" className="h-6 px-2 text-[11px]">
                  Example JSON
                </TabsTrigger>
                <TabsTrigger value="schema" className="h-6 px-2 text-[11px]">
                  Schema JSON
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              {jsonView === "example" && exampleDirty ? (
                <Button size="sm" className="h-6 px-2 text-[10px]" type="button" onClick={applyExample}>
                  Apply
                </Button>
              ) : null}
              <CopyButton value={jsonView === "example" ? exampleDraft : schemaDraft} className="h-6 w-6" />
            </div>
          </div>
          {jsonView === "example" ? (
            <CodeEditor
              value={exampleDraft}
              onChange={(value) => {
                setExampleDraft(value);
                setExampleDirty(value !== exampleText);
              }}
              language="json"
              height="100%"
              className="min-h-0 flex-1"
            />
          ) : (
            <CodeEditor
              value={schemaDraft}
              onChange={(value) => {
                setSchemaDraft(value);
                try {
                  patchSchema(JSON.parse(value) as SchemaObject);
                } catch {
                  /* keep typing */
                }
              }}
              language="json"
              height="100%"
              className="min-h-0 flex-1"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const BodySchemaPanel: React.FC<BodySchemaPanelProps> = (props) => {
  const [fullscreen, setFullscreen] = useState(false);
  const title = props.title ?? "Body";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <BodyEditor {...props} />
      </div>
      <div className="flex shrink-0 justify-end pt-2">
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
        <BodyEditor {...props} />
      </FullscreenModal>
    </div>
  );
};
