import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  collectFieldCatalog,
  collectSchemaNames,
  componentRef,
  emptySchemaForType,
  fieldToSchema,
  filterFieldCatalog,
  parseComponentRef,
  resolveRef,
  schemaType,
  uniqueName,
  upsertComponentSchema,
} from "./openapi-model";
import { SuggestMenu } from "./suggest-menu";
import type { OpenAPIDoc, SchemaObject } from "./openapi-types";

const TYPES = ["object", "array", "string", "integer", "number", "boolean", "$ref"] as const;
const FORMATS: Record<string, string[]> = {
  string: ["none", "date", "date-time", "email", "uuid", "uri"],
  integer: ["none", "int32", "int64"],
  number: ["none", "float", "double"],
};

const GRID = "grid grid-cols-[18px_minmax(110px,1.15fr)_88px_minmax(92px,0.9fr)_36px_1fr] items-center gap-1";
const CELL =
  "h-7 bg-transparent border-transparent shadow-none hover:bg-background hover:border-input focus-visible:bg-background";

export type SchemaPathSeg = { kind: "property"; name: string } | { kind: "items" };

type SchemaCrumbEditorProps = {
  spec: OpenAPIDoc;
  schema: SchemaObject | undefined;
  onChange: (schema: SchemaObject) => void;
  onSpecChange?: (spec: OpenAPIDoc) => void;
  rootLabel?: string;
};

const formatValue = (schema: SchemaObject) => schema.format || "none";

const setAtPath = (schema: SchemaObject, path: SchemaPathSeg[], next: SchemaObject): SchemaObject => {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  if (head.kind === "items") {
    return { ...schema, type: "array", items: setAtPath(schema.items ?? { type: "string" }, rest, next) };
  }
  const properties = { ...(schema.properties ?? {}) };
  properties[head.name] = setAtPath(properties[head.name] ?? { type: "string" }, rest, next);
  return { ...schema, type: "object", properties };
};

const childAt = (spec: OpenAPIDoc, schema: SchemaObject, seg: SchemaPathSeg): SchemaObject | undefined => {
  const resolved = schema.$ref ? resolveRef<SchemaObject>(spec, schema) ?? schema : schema;
  if (seg.kind === "items") return resolved.items;
  return resolved.properties?.[seg.name];
};

const pathExists = (spec: OpenAPIDoc, root: SchemaObject, path: SchemaPathSeg[]) => {
  let node: SchemaObject | undefined = root;
  for (const seg of path) {
    if (!node) return false;
    node = childAt(spec, node, seg);
  }
  return Boolean(node);
};

const locate = (spec: OpenAPIDoc, root: SchemaObject, path: SchemaPathSeg[]) => {
  let scope = root;
  let scopeRef = root.$ref ? parseComponentRef(root.$ref) : null;
  if (scopeRef?.group === "schemas") {
    scope = resolveRef<SchemaObject>(spec, root) ?? scope;
  } else {
    scopeRef = null;
  }
  let rel: SchemaPathSeg[] = [];
  let node: SchemaObject = root;

  for (const seg of path) {
    const nodeRef = node.$ref ? parseComponentRef(node.$ref) : null;
    if (nodeRef?.group === "schemas") {
      scopeRef = nodeRef;
      scope = resolveRef<SchemaObject>(spec, node) ?? scope;
      rel = [];
    }
    const resolved = node.$ref ? resolveRef<SchemaObject>(spec, node) ?? node : node;
    rel = [...rel, seg];
    node =
      seg.kind === "property"
        ? resolved.properties?.[seg.name] ?? { type: "string" }
        : resolved.items ?? { type: "string" };
  }

  const resolved = node.$ref ? resolveRef<SchemaObject>(spec, node) ?? node : node;
  const nodeRef = node.$ref ? parseComponentRef(node.$ref) : null;
  return { node, resolved, scope, scopeRef, rel, nodeRef };
};

const crumbLabel = (seg: SchemaPathSeg) => (seg.kind === "items" ? "items" : seg.name);

type FieldRowProps = {
  spec: OpenAPIDoc;
  name: string;
  schema: SchemaObject;
  required: boolean;
  renameable?: boolean;
  drillable: boolean;
  onRename: (next: string) => void;
  onChange: (schema: SchemaObject) => void;
  onDelete: () => void;
  onToggleRequired: (required: boolean) => void;
  onDrill: () => void;
  onSpecChange?: (spec: OpenAPIDoc) => void;
};

const FieldRow: React.FC<FieldRowProps> = ({
  spec,
  name,
  schema,
  required,
  renameable = true,
  drillable,
  onRename,
  onChange,
  onDelete,
  onToggleRequired,
  onDrill,
  onSpecChange,
}) => {
  const refInfo = schema.$ref ? parseComponentRef(schema.$ref) : null;
  const resolved = useMemo(() => {
    if (!schema.$ref) return schema;
    return resolveRef<SchemaObject>(spec, schema) ?? { type: "object", properties: {} };
  }, [schema, spec]);
  const type = schemaType(schema);
  const selectType = TYPES.includes(type as (typeof TYPES)[number]) ? type : "object";
  const [draftName, setDraftName] = useState(name);
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => collectFieldCatalog(spec), [spec]);
  const schemaNames = useMemo(() => collectSchemaNames(spec), [spec]);
  const formats = FORMATS[type] ?? ["none"];

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const applyName = (nextName: string, nextSchema?: SchemaObject) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      setDraftName(name);
      return;
    }
    if (nextSchema) onChange(nextSchema);
    if (trimmed !== name) onRename(trimmed);
    setDraftName(trimmed);
    setSuggesting(false);
  };

  const patchResolved = (next: SchemaObject) => {
    if (refInfo?.group === "schemas" && onSpecChange) {
      onSpecChange(upsertComponentSchema(spec, refInfo.name, next));
      return;
    }
    onChange(next);
  };

  const matches = filterFieldCatalog(catalog, draftName, {
    kinds: ["property", "parameter", "schema"],
    excludeNames: new Set([name.toLowerCase()]),
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={`${GRID} px-2 py-1 hover:bg-muted/40`}>
          <button
            type="button"
            className="flex h-7 w-[18px] items-center justify-center text-muted-foreground disabled:opacity-30"
            onClick={() => drillable && onDrill()}
            disabled={!drillable}
            title={drillable ? "Open" : undefined}
          >
            {drillable ? <ChevronRight className="h-3.5 w-3.5" /> : <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />}
          </button>
          <div className="relative min-w-0">
            <Input
              ref={inputRef}
              value={draftName}
              disabled={!renameable}
              onFocus={() => renameable && setSuggesting(true)}
              onBlur={() => {
                setTimeout(() => setSuggesting(false), 150);
                if (renameable) applyName(draftName);
              }}
              onChange={(e) => {
                setDraftName(e.target.value);
                setSuggesting(true);
              }}
              className={`${CELL} font-mono text-xs`}
              placeholder="field"
            />
            <SuggestMenu
              open={suggesting}
              anchor={inputRef.current}
              items={matches.map((item) => ({
                id: item.key,
                title: item.name,
                badge: item.kind,
                subtitle: `${item.type ?? item.in ?? item.kind}${item.usedIn[0] ? ` · ${item.usedIn[0]}` : ""}`,
              }))}
              onSelect={(id) => {
                const item = catalog.find((entry) => entry.key === id);
                if (!item) return;
                applyName(item.name, fieldToSchema(item));
              }}
            />
          </div>
          <Select
            value={selectType}
            onValueChange={(value) => {
              if (value === "$ref") {
                onChange({ $ref: schemaNames[0] ? componentRef("schemas", schemaNames[0]) : "" });
              } else {
                const next = emptySchemaForType(value);
                if (schema.description) next.description = schema.description;
                onChange(next);
              }
            }}
          >
            <SelectTrigger className={`${CELL} text-[11px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {type === "$ref" ? (
            schemaNames.length > 0 ? (
              <Select
                value={refInfo?.name || schemaNames[0]}
                onValueChange={(value) => onChange({ $ref: componentRef("schemas", value) })}
              >
                <SelectTrigger className={`${CELL} text-[11px] font-medium text-sky-800 dark:text-sky-300`}>
                  <SelectValue placeholder="Schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemaNames.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="px-2 text-[11px] text-muted-foreground">—</span>
            )
          ) : (
            <Select
              value={formatValue(schema)}
              onValueChange={(value) => onChange({ ...schema, format: value === "none" ? undefined : value })}
              disabled={!FORMATS[type]}
            >
              <SelectTrigger className={`${CELL} text-[11px]`}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {fmt === "none" ? "—" : fmt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <label className="flex items-center justify-center">
            <Checkbox checked={required} onCheckedChange={(value) => onToggleRequired(value === true)} />
          </label>
          <Input
            value={(type === "$ref" ? resolved.description : schema.description) ?? ""}
            onChange={(e) => {
              if (type === "$ref") patchResolved({ ...resolved, description: e.target.value });
              else onChange({ ...schema, description: e.target.value });
            }}
            className={`${CELL} text-xs`}
            placeholder="Description"
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        {drillable ? <ContextMenuItem onClick={onDrill}>Open</ContextMenuItem> : null}
        <ContextMenuCheckboxItem checked={required} onCheckedChange={(value) => onToggleRequired(value === true)}>
          Required
        </ContextMenuCheckboxItem>
        {type === "$ref" ? (
          <ContextMenuItem onClick={() => onChange(structuredClone(resolved))}>Unlink schema</ContextMenuItem>
        ) : schemaNames.length > 0 ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Use schema</ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-40">
              {schemaNames.map((item) => (
                <ContextMenuItem key={item} onClick={() => onChange({ $ref: componentRef("schemas", item) })}>
                  {item}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete field
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const SchemaCrumbEditor: React.FC<SchemaCrumbEditorProps> = ({
  spec,
  schema,
  onChange,
  onSpecChange,
  rootLabel,
}) => {
  const [path, setPath] = useState<SchemaPathSeg[]>([]);
  const root = useMemo(
    () => schema ?? ({ type: "object", properties: {} } satisfies SchemaObject),
    [schema],
  );
  const located = useMemo(() => locate(spec, root, path), [spec, root, path]);
  const schemaNames = useMemo(() => collectSchemaNames(spec), [spec]);
  const type = schemaType(located.node);
  const resolvedType = schemaType(located.resolved);
  const properties = located.resolved.properties ?? {};
  const required = new Set(located.resolved.required ?? []);
  const label =
    rootLabel ??
    (root.$ref ? parseComponentRef(root.$ref)?.name : undefined) ??
    "Schema";

  // When drilling deeper, subtly lift the background so nested component levels are
  // easier to distinguish in dark themes.
  const depth = path.length;
  const depthBgClass = depth >= 4 ? "bg-muted/20" : depth >= 2 ? "bg-muted/15" : depth >= 1 ? "bg-muted/10" : "bg-transparent";

  useEffect(() => {
    if (!pathExists(spec, root, path)) {
      setPath((current) => {
        let next = current;
        while (next.length > 0 && !pathExists(spec, root, next)) next = next.slice(0, -1);
        return next;
      });
    }
  }, [spec, root, path]);

  const commitResolved = (next: SchemaObject) => {
    if (located.nodeRef?.group === "schemas" && onSpecChange) {
      onSpecChange(upsertComponentSchema(spec, located.nodeRef.name, next));
      return;
    }
    const patched = setAtPath(located.scope, located.rel, next);
    if (located.scopeRef?.group === "schemas" && onSpecChange) {
      onSpecChange(upsertComponentSchema(spec, located.scopeRef.name, patched));
      return;
    }
    onChange(patched);
  };

  const commitNode = (next: SchemaObject) => {
    if (path.length === 0) {
      onChange(next);
      return;
    }
    const patched = setAtPath(located.scope, located.rel, next);
    if (located.scopeRef?.group === "schemas" && onSpecChange) {
      onSpecChange(upsertComponentSchema(spec, located.scopeRef.name, patched));
      return;
    }
    onChange(patched);
  };

  const crumbs = [
    { label, path: [] as SchemaPathSeg[] },
    ...path.map((seg, index) => ({
      label: crumbLabel(seg),
      path: path.slice(0, index + 1),
    })),
  ];

  const drillable = (child: SchemaObject) => {
    const childType = schemaType(child);
    return childType === "object" || childType === "array" || childType === "$ref";
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${depthBgClass}`}>
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2 py-1.5">
        {crumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
            <Button
              variant="ghost"
              size="xs"
              type="button"
              className={`h-6 px-1.5 font-mono text-[11px] ${
                index === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setPath(crumb.path)}
            >
              {crumb.label}
            </Button>
          </React.Fragment>
        ))}
        {located.nodeRef ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:text-sky-300">
            <Link2 className="h-3 w-3" />
            {located.nodeRef.name}
          </span>
        ) : null}
      </div>

      {resolvedType !== "object" && resolvedType !== "array" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
          <p className="text-xs text-muted-foreground">
            This value is <span className="font-mono font-semibold">{resolvedType}</span>. Switch to object to edit fields.
          </p>
          <Select
            value={TYPES.includes(type as (typeof TYPES)[number]) ? type : "object"}
            onValueChange={(value) => commitNode(value === "$ref"
              ? { $ref: schemaNames[0] ? componentRef("schemas", schemaNames[0]) : "" }
              : emptySchemaForType(value))}
          >
            <SelectTrigger className="h-8 w-[160px] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className={`${GRID} shrink-0 border-b border-border/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground`}>
            <span />
            <span>Field</span>
            <span>Type</span>
            <span>Format</span>
            <span>Req</span>
            <span>Description</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {resolvedType === "array" ? (
              <FieldRow
                spec={spec}
                name="items"
                schema={located.resolved.items ?? { type: "string" }}
                required={false}
                renameable={false}
                drillable={drillable(located.resolved.items ?? { type: "string" })}
                onRename={() => undefined}
                onChange={(next) => commitResolved({ ...located.resolved, type: "array", items: next })}
                onDelete={() => commitResolved({ ...located.resolved, type: "array", items: { type: "string" } })}
                onToggleRequired={() => undefined}
                onDrill={() => setPath([...path, { kind: "items" }])}
                onSpecChange={onSpecChange}
              />
            ) : Object.keys(properties).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <p className="text-xs text-muted-foreground">No fields at this level. Add a field, or open a parent from the path.</p>
              </div>
            ) : (
              Object.entries(properties).map(([key, child]) => (
                <FieldRow
                  key={key}
                  spec={spec}
                  name={key}
                  schema={child}
                  required={required.has(key)}
                  drillable={drillable(child)}
                  onRename={(nextName) => {
                    if (!nextName || nextName === key || properties[nextName]) return;
                    const nextProps: Record<string, SchemaObject> = {};
                    for (const [propName, value] of Object.entries(properties)) {
                      nextProps[propName === key ? nextName : propName] = value;
                    }
                    commitResolved({
                      ...located.resolved,
                      type: "object",
                      properties: nextProps,
                      required: (located.resolved.required ?? []).map((item) => (item === key ? nextName : item)),
                    });
                  }}
                  onChange={(next) =>
                    commitResolved({
                      ...located.resolved,
                      type: "object",
                      properties: { ...properties, [key]: next },
                    })
                  }
                  onDelete={() => {
                    const nextProps = { ...properties };
                    delete nextProps[key];
                    commitResolved({
                      ...located.resolved,
                      properties: nextProps,
                      required: (located.resolved.required ?? []).filter((item) => item !== key),
                    });
                  }}
                  onToggleRequired={(isRequired) => {
                    const set = new Set(located.resolved.required ?? []);
                    if (isRequired) set.add(key);
                    else set.delete(key);
                    commitResolved({ ...located.resolved, required: [...set] });
                  }}
                  onDrill={() => setPath([...path, { kind: "property", name: key }])}
                  onSpecChange={onSpecChange}
                />
              ))
            )}
          </div>
          {resolvedType === "object" ? (
            <div className="flex shrink-0 items-center border-t border-border/60 px-2 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => {
                  const field = uniqueName(Object.keys(properties), "field");
                  commitResolved({
                    ...located.resolved,
                    type: "object",
                    properties: { ...properties, [field]: { type: "string" } },
                  });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add field
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
