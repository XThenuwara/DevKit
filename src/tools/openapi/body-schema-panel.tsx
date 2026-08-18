import React, { useEffect, useMemo, useState } from "react";
import { Link2, Maximize2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "./code-editor";
import { FullscreenModal } from "./fullscreen-modal";
import { SchemaCrumbEditor } from "./schema-crumb-editor";
import { CopyButton } from "@/components/shared/copy-button";
import {
  COMMON_MEDIA_TYPES,
  collectSchemaNames,
  componentRef,
  contentTypes,
  collectLinkedSchemaNames,
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
  const [pane, setPane] = useState<"fields" | "example" | "schema">("fields");
  const [extractName, setExtractName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [exampleDraft, setExampleDraft] = useState("");
  const [exampleDirty, setExampleDirty] = useState(false);
  const [schemaDraft, setSchemaDraft] = useState("");
  const types = contentTypes(content);
  const [contentType, setContentType] = useState(types[0] || "application/json");
  const activeType = types.includes(contentType) ? contentType : types[0] || "application/json";
  const rawSchema = content?.[activeType]?.schema;
  const refInfo = rawSchema?.$ref ? parseComponentRef(rawSchema.$ref) : null;
  const schemaNames = useMemo(() => collectSchemaNames(spec), [spec]);
  const resolved = useMemo(() => {
    if (!rawSchema) return { type: "object", properties: {} } satisfies SchemaObject;
    if (isRef(rawSchema)) return resolveRef<SchemaObject>(spec, rawSchema) ?? { type: "object", properties: {} };
    return rawSchema;
  }, [rawSchema, spec]);

  // When viewing schema JSON, we can switch the “target” schema that the editor
  // shows/edits (useful for drilling into linked $refs).
  const [schemaTargetName, setSchemaTargetName] = useState<string | null>(null);

  useEffect(() => {
    // Only reset the target when changing the pane; schema selection stays
    // stable while the user is browsing linked models.
    if (pane !== "schema") {
      setSchemaTargetName(null);
      return;
    }
    setSchemaTargetName(refInfo?.group === "schemas" ? refInfo.name : null);
  }, [pane, refInfo?.group, refInfo?.name]);

  const linkedSchemaNames = useMemo(
    () => collectLinkedSchemaNames(spec, rawSchema ?? resolved),
    [rawSchema, resolved, spec],
  );

  const schemaForTarget = schemaTargetName
    ? spec.components?.schemas?.[schemaTargetName] ?? resolved
    : resolved;

  const example = useMemo(() => {
    const explicit = content?.[activeType]?.example;
    if (explicit !== undefined) return explicit;
    return generateExampleFromSchema(spec, rawSchema ?? resolved);
  }, [activeType, content, rawSchema, resolved, spec]);

  const exampleText = JSON.stringify(example ?? {}, null, 2);
  const schemaJson = JSON.stringify(schemaForTarget ?? {}, null, 2);
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

  const commitSchema = (next: SchemaObject, targetName?: string | null) => {
    const target =
      targetName ?? schemaTargetName ?? (refInfo?.group === "schemas" ? refInfo.name : null);
    if (target) {
      onSpecChange(upsertComponentSchema(spec, target, next));
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
    setPane("fields");
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
      setPane("fields");
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
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SchemaCrumbEditor
        spec={spec}
        schema={rawSchema ?? resolved}
        onChange={commitSchema}
        onSpecChange={onSpecChange}
        rootLabel={refInfo?.name ?? title}
      />
    </div>
  );

  const jsonPane = (view: "example" | "schema") => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          {view === "schema"
            ? schemaTargetName
              ? `Editing schema ${schemaTargetName}`
              : refInfo
                ? `Resolved schema ${refInfo.name}`
                : "Schema JSON"
            : view === "example"
              ? "Request/response example JSON"
              : "Schema JSON"}
        </p>
        <div className="flex items-center gap-1">
          {view === "example" ? (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" type="button" onClick={inferFromExample}>
              <Sparkles className="h-3 w-3 mr-1" />
              Infer fields
            </Button>
          ) : null}
          {view === "example" && exampleDirty ? (
            <Button size="sm" className="h-6 px-2 text-[10px]" type="button" onClick={applyExample}>
              Save example
            </Button>
          ) : null}
          <CopyButton value={view === "example" ? exampleDraft : schemaDraft} className="h-6 w-6" />
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {view === "example" ? (
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
          <div className="flex h-full min-h-0 flex-1 overflow-hidden">
            <div className="relative min-h-0 flex-1">
              <CodeEditor
                value={schemaDraft}
                onChange={(value) => {
                  setSchemaDraft(value);
                  try {
                    commitSchema(JSON.parse(value) as SchemaObject, schemaTargetName);
                  } catch {
                    /* keep typing */
                  }
                }}
                language="json"
                height="100%"
                className="h-full rounded-none border-0"
              />
            </div>

            {linkedSchemaNames.length > 0 ? (
              <aside className="flex min-h-0 w-[240px] shrink-0 flex-col border-l border-border/50 bg-background/50">
                <div className="shrink-0 border-b border-border/40 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Linked schemas
                  </p>
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
                  {linkedSchemaNames.map((name) => {
                    const active = schemaTargetName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        className={`w-full rounded-md border px-2 py-1 text-left text-xs font-mono ${
                          active
                            ? "border-border bg-background text-foreground"
                            : "border-transparent bg-transparent hover:border-border/50 hover:bg-background/80"
                        }`}
                        onClick={() => setSchemaTargetName(name)}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
        {layout === "compact" ? (
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
        ) : null}
        {refInfo ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 dark:text-sky-300">
            <Link2 className="h-3 w-3" />
            {refInfo.name}
          </span>
        ) : null}
        {layout === "compact" ? (
          <Tabs value={pane} onValueChange={(value) => setPane(value as typeof pane)}>
            <TabsList className="h-7">
              <TabsTrigger value="fields" className="h-6 px-2 text-[11px]">
                Fields
              </TabsTrigger>
              <TabsTrigger value="example" className="h-6 px-2 text-[11px]">
                Example
              </TabsTrigger>
              <TabsTrigger value="schema" className="h-6 px-2 text-[11px]">
                Schema
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
        <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={addField}>
          <Plus className="h-3 w-3 mr-1" />
          Add field
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          {onExpand ? (
            <Button variant="ghost" size="icon-xs" type="button" onClick={onExpand} title="Expand">
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="sr-only">Expand</span>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" type="button">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More body options</span>
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {onRequiredChange ? (
              <DropdownMenuCheckboxItem checked={Boolean(required)} onCheckedChange={(value) => onRequiredChange(value === true)}>
                Required
              </DropdownMenuCheckboxItem>
            ) : null}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Content type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-48">
                <DropdownMenuRadioGroup
                  value={activeType}
                  onValueChange={(nextType) => {
                    onChange({ [nextType]: content[activeType] });
                    setContentType(nextType);
                  }}
                >
                  {mediaOptions.map((item) => (
                    <DropdownMenuRadioItem key={item} value={item} className="font-mono text-xs">
                      {item}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Root type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={ROOT_TYPES.includes(rootType as (typeof ROOT_TYPES)[number]) ? rootType : "object"}
                  onValueChange={(value) => commitSchema(emptySchemaForType(value))}
                >
                  {ROOT_TYPES.map((item) => (
                    <DropdownMenuRadioItem key={item} value={item}>
                      {item}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {refInfo ? (
              <>
                <DropdownMenuLabel>Schema {refInfo.name}</DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Switch schema</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-40">
                    {schemaNames.map((name) => (
                      <DropdownMenuItem
                        key={name}
                        onClick={() =>
                          onChange({
                            ...content,
                            [activeType]: { ...content[activeType], schema: { $ref: componentRef("schemas", name) } },
                          })
                        }
                      >
                        {name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() =>
                    onChange({
                      ...content,
                      [activeType]: { ...content[activeType], schema: structuredClone(resolved) },
                    })
                  }
                >
                  Unlink (copy inline)
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => setSaveOpen(true)}>Save as schema…</DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setPane("example");
                inferFromExample();
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Infer fields from example
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
      {layout === "compact" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {pane === "fields" ? fieldsPane : jsonPane(pane)}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {fieldsPane}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:border-l lg:border-border/50">
            <div className="flex shrink-0 items-center px-3 pt-2">
              <Tabs value={pane === "fields" ? "example" : pane} onValueChange={(value) => setPane(value as typeof pane)}>
                <TabsList className="h-7">
                  <TabsTrigger value="example" className="h-6 px-2 text-[11px]">
                    Example
                  </TabsTrigger>
                  <TabsTrigger value="schema" className="h-6 px-2 text-[11px]">
                    Schema
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {jsonPane(pane === "schema" ? "schema" : "example")}
          </div>
        </div>
      )}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as schema</DialogTitle>
            <DialogDescription>Stores this body in components.schemas and points the operation at a $ref.</DialogDescription>
          </DialogHeader>
          <Input
            value={extractName}
            onChange={(e) => setExtractName(e.target.value)}
            placeholder="Pet"
            className="h-8 text-sm"
          />
          <DialogFooter>
            <Button
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
                setSaveOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export const BodySchemaPanel: React.FC<BodySchemaPanelProps> = (props) => {
  const [fullscreen, setFullscreen] = useState(false);
  const title = props.title ?? "Body";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!fullscreen ? (
        <BodyEditor {...props} layout="compact" onExpand={() => setFullscreen(true)} />
      ) : (
        <p className="px-3 py-2 text-xs text-muted-foreground">Editing in fullscreen…</p>
      )}
      <FullscreenModal title={title} open={fullscreen} onOpenChange={setFullscreen} showTrigger={false}>
        <BodyEditor {...props} layout="wide" />
      </FullscreenModal>
    </div>
  );
};
