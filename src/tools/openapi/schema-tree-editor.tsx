import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  collectFieldCatalog,
  collectSchemaNames,
  componentRef,
  emptySchemaForType,
  fieldToSchema,
  filterFieldCatalog,
  isRef,
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
  string: ["", "date", "date-time", "email", "uuid", "uri"],
  integer: ["", "int32", "int64"],
  number: ["", "float", "double"],
};

const GRID = "grid grid-cols-[18px_minmax(110px,1.15fr)_88px_minmax(92px,0.9fr)_36px_1fr_32px] items-center gap-1";
const CELL =
  "h-7 bg-transparent border-transparent shadow-none hover:bg-background hover:border-input focus-visible:bg-background";

type SchemaTreeEditorProps = {
  spec: OpenAPIDoc;
  schema: SchemaObject | undefined;
  onChange: (schema: SchemaObject) => void;
  onSpecChange?: (spec: OpenAPIDoc) => void;
};

type FieldRowProps = {
  spec: OpenAPIDoc;
  name: string;
  schema: SchemaObject;
  required: boolean;
  depth: number;
  ancestry: string[];
  onRename: (next: string) => void;
  onChange: (schema: SchemaObject) => void;
  onDelete: () => void;
  onToggleRequired: (required: boolean) => void;
  onSpecChange?: (spec: OpenAPIDoc) => void;
  renameable?: boolean;
};

const FieldRow: React.FC<FieldRowProps> = ({
  spec,
  name,
  schema,
  required,
  depth,
  ancestry,
  onRename,
  onChange,
  onDelete,
  onToggleRequired,
  onSpecChange,
  renameable = true,
}) => {
  const refInfo = schema.$ref ? parseComponentRef(schema.$ref) : null;
  const resolved = useMemo(() => {
    if (!isRef(schema)) return schema;
    return resolveRef<SchemaObject>(spec, schema) ?? { type: "object", properties: {} };
  }, [schema, spec]);
  const type = schemaType(schema);
  const resolvedType = schemaType(resolved);
  const circular = Boolean(refInfo && ancestry.includes(refInfo.name));
  const expandable = type === "object" || type === "array" || (type === "$ref" && !circular);
  const [open, setOpen] = useState(depth < 1);
  const [draftName, setDraftName] = useState(name);
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => collectFieldCatalog(spec), [spec]);
  const schemaNames = useMemo(() => collectSchemaNames(spec), [spec]);
  const formats = FORMATS[type] ?? [""];
  const matches = filterFieldCatalog(catalog, draftName, {
    kinds: ["property", "parameter", "schema"],
    excludeNames: new Set([name.toLowerCase()]),
  });

  const nextAncestry = refInfo ? [...ancestry, refInfo.name] : ancestry;

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

  const objectTarget = type === "$ref" ? resolved : schema;
  const commitObject = type === "$ref" ? patchResolved : onChange;

  return (
    <div>
      <div className={`${GRID} px-2 py-1 hover:bg-muted/40`} style={{ paddingLeft: 8 + depth * 14 }}>
        <button
          type="button"
          className="flex h-7 w-[18px] items-center justify-center text-muted-foreground"
          onClick={() => expandable && setOpen((value) => !value)}
          disabled={!expandable}
        >
          {expandable ? (
            open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
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
          value={type}
          onValueChange={(value) => {
            if (value === "$ref") {
              onChange({ $ref: schemaNames[0] ? componentRef("schemas", schemaNames[0]) : "" });
            } else {
              const next = emptySchemaForType(value);
              if (schema.description) next.description = schema.description;
              onChange(next);
            }
            setOpen(true);
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
          <Select
            value={refInfo?.name || schemaNames[0] || ""}
            onValueChange={(value) => onChange({ $ref: componentRef("schemas", value) })}
            disabled={schemaNames.length === 0}
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
          <Select
            value={schema.format ?? ""}
            onValueChange={(value) => onChange({ ...schema, format: value || undefined })}
            disabled={!FORMATS[type]}
          >
            <SelectTrigger className={`${CELL} text-[11px]`}>
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
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          type="button"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {open && type === "$ref" && circular ? (
        <p className="px-2 py-1 text-[11px] text-muted-foreground" style={{ paddingLeft: 28 + depth * 14 }}>
          Circular reference
        </p>
      ) : null}

      {open && type === "$ref" && !circular ? (
        <div className="border-l border-sky-500/25" style={{ marginLeft: 16 + depth * 14 }}>
          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-sky-800 dark:text-sky-300">
            <Link2 className="h-3 w-3" />
            <span>
              {refInfo?.name ?? "schema"} · {resolvedType}
              {onSpecChange ? " · edits update the shared schema" : ""}
            </span>
          </div>
          {resolvedType === "object" ? (
            <ObjectChildren
              spec={spec}
              schema={objectTarget}
              depth={depth}
              ancestry={nextAncestry}
              onChange={commitObject}
              onSpecChange={onSpecChange}
            />
          ) : resolvedType === "array" ? (
            <FieldRow
              spec={spec}
              name="items"
              schema={resolved.items ?? { type: "string" }}
              required={false}
              depth={depth + 1}
              ancestry={nextAncestry}
              renameable={false}
              onRename={() => undefined}
              onChange={(next) => patchResolved({ ...resolved, type: "array", items: next })}
              onDelete={() => patchResolved({ ...resolved, type: "array", items: { type: "string" } })}
              onToggleRequired={() => undefined}
              onSpecChange={onSpecChange}
            />
          ) : (
            <p className="px-2 pb-2 text-[11px] text-muted-foreground">Referenced type is {resolvedType}.</p>
          )}
        </div>
      ) : null}

      {open && type === "object" ? (
        <ObjectChildren
          spec={spec}
          schema={schema}
          depth={depth}
          ancestry={nextAncestry}
          onChange={onChange}
          onSpecChange={onSpecChange}
        />
      ) : null}

      {open && type === "array" ? (
        <FieldRow
          spec={spec}
          name="items"
          schema={schema.items ?? { type: "string" }}
          required={false}
          depth={depth + 1}
          ancestry={nextAncestry}
          renameable={false}
          onRename={() => undefined}
          onChange={(next) => onChange({ ...schema, type: "array", items: next })}
          onDelete={() => onChange({ ...schema, type: "array", items: { type: "string" } })}
          onToggleRequired={() => undefined}
          onSpecChange={onSpecChange}
        />
      ) : null}
    </div>
  );
};

const ObjectChildren: React.FC<{
  spec: OpenAPIDoc;
  schema: SchemaObject;
  depth: number;
  ancestry: string[];
  onChange: (schema: SchemaObject) => void;
  onSpecChange?: (spec: OpenAPIDoc) => void;
}> = ({ spec, schema, depth, ancestry, onChange, onSpecChange }) => {
  const properties = schema.properties ?? {};
  const requiredSet = new Set(schema.required ?? []);
  return (
    <div>
      {Object.entries(properties).map(([key, child]) => (
        <FieldRow
          key={key}
          spec={spec}
          name={key}
          schema={child}
          required={requiredSet.has(key)}
          depth={depth + 1}
          ancestry={ancestry}
          onRename={(nextName) => {
            if (!nextName || nextName === key || properties[nextName]) return;
            const nextProps: Record<string, SchemaObject> = {};
            for (const [propName, value] of Object.entries(properties)) {
              nextProps[propName === key ? nextName : propName] = value;
            }
            onChange({
              ...schema,
              type: "object",
              properties: nextProps,
              required: (schema.required ?? []).map((item) => (item === key ? nextName : item)),
            });
          }}
          onChange={(next) =>
            onChange({
              ...schema,
              type: "object",
              properties: { ...properties, [key]: next },
            })
          }
          onDelete={() => {
            const nextProps = { ...properties };
            delete nextProps[key];
            onChange({
              ...schema,
              properties: nextProps,
              required: (schema.required ?? []).filter((item) => item !== key),
            });
          }}
          onToggleRequired={(isRequired) => {
            const set = new Set(schema.required ?? []);
            if (isRequired) set.add(key);
            else set.delete(key);
            onChange({ ...schema, type: "object", required: [...set] });
          }}
          onSpecChange={onSpecChange}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          const field = uniqueName(Object.keys(properties), "field");
          onChange({
            ...schema,
            type: "object",
            properties: { ...properties, [field]: { type: "string" } },
          });
        }}
        className="mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        style={{ marginLeft: 22 + (depth + 1) * 14 }}
      >
        <Plus className="h-3 w-3" />
        Add field
      </button>
    </div>
  );
};

export const SchemaTreeEditor: React.FC<SchemaTreeEditorProps> = ({ spec, schema, onChange, onSpecChange }) => {
  const rootRef = schema?.$ref ? parseComponentRef(schema.$ref) : null;
  const current = useMemo(() => {
    if (!schema) return { type: "object", properties: {} } satisfies SchemaObject;
    if (isRef(schema)) return resolveRef<SchemaObject>(spec, schema) ?? { type: "object", properties: {} };
    return schema;
  }, [schema, spec]);
  const type = schemaType(current);
  const properties = current.properties ?? {};
  const required = new Set(current.required ?? []);
  const ancestry = rootRef ? [rootRef.name] : [];

  const commit = (next: SchemaObject) => {
    if (rootRef?.group === "schemas" && onSpecChange) {
      onSpecChange(upsertComponentSchema(spec, rootRef.name, next));
      return;
    }
    onChange(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`${GRID} shrink-0 border-b border-border/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground`}>
        <span />
        <span>Field</span>
        <span>Type</span>
        <span>Format</span>
        <span>Req</span>
        <span>Description</span>
        <span />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {type !== "object" ? (
          <div className="space-y-2 p-3">
            <p className="text-xs text-muted-foreground">
              Root type is <span className="font-mono font-semibold">{type}</span>. Switch to object to edit fields.
            </p>
            <Select value={type} onValueChange={(value) => commit(emptySchemaForType(value))}>
              <SelectTrigger className="h-8 w-[160px] bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.filter((item) => item !== "$ref").map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : Object.keys(properties).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-xs text-muted-foreground">No fields yet. Use Add field, or type a name from this spec.</p>
          </div>
        ) : (
          Object.entries(properties).map(([key, child]) => (
            <FieldRow
              key={key}
              spec={spec}
              name={key}
              schema={child}
              required={required.has(key)}
              depth={0}
              ancestry={ancestry}
              onRename={(nextName) => {
                if (!nextName || nextName === key || properties[nextName]) return;
                const nextProps: Record<string, SchemaObject> = {};
                for (const [propName, value] of Object.entries(properties)) {
                  nextProps[propName === key ? nextName : propName] = value;
                }
                commit({
                  ...current,
                  properties: nextProps,
                  required: (current.required ?? []).map((item) => (item === key ? nextName : item)),
                });
              }}
              onChange={(next) =>
                commit({
                  ...current,
                  type: "object",
                  properties: { ...properties, [key]: next },
                })
              }
              onDelete={() => {
                const nextProps = { ...properties };
                delete nextProps[key];
                commit({
                  ...current,
                  properties: nextProps,
                  required: (current.required ?? []).filter((item) => item !== key),
                });
              }}
              onToggleRequired={(isRequired) => {
                const set = new Set(current.required ?? []);
                if (isRequired) set.add(key);
                else set.delete(key);
                commit({ ...current, required: [...set] });
              }}
              onSpecChange={onSpecChange}
            />
          ))
        )}
      </div>
      {type === "object" ? (
        <div className="flex shrink-0 items-center px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={() => {
              const field = uniqueName(Object.keys(properties), "field");
              commit({
                ...current,
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
    </div>
  );
};
