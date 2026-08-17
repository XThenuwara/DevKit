import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  collectFieldCatalog,
  emptySchemaForType,
  fieldToSchema,
  filterFieldCatalog,
  schemaType,
} from "./openapi-model";
import { SuggestMenu } from "./suggest-menu";
import type { OpenAPIDoc, SchemaObject } from "./openapi-types";

const TYPES = ["object", "array", "string", "integer", "number", "boolean", "$ref"] as const;
const FORMATS: Record<string, string[]> = {
  string: ["", "date", "date-time", "email", "uuid", "uri"],
  integer: ["", "int32", "int64"],
  number: ["", "float", "double"],
};

type SchemaTreeEditorProps = {
  spec: OpenAPIDoc;
  schema: SchemaObject | undefined;
  onChange: (schema: SchemaObject) => void;
};

const FieldRow: React.FC<{
  spec: OpenAPIDoc;
  name: string;
  schema: SchemaObject;
  required: boolean;
  depth: number;
  onRename: (next: string) => void;
  onChange: (schema: SchemaObject) => void;
  onDelete: () => void;
  onToggleRequired: (required: boolean) => void;
}> = ({ spec, name, schema, required, depth, onRename, onChange, onDelete, onToggleRequired }) => {
  const [open, setOpen] = useState(depth < 1);
  const [draftName, setDraftName] = useState(name);
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => collectFieldCatalog(spec), [spec]);
  const type = schemaType(schema);
  const expandable = type === "object" || type === "array";
  const formats = FORMATS[type] ?? [""];
  const matches = filterFieldCatalog(catalog, draftName, {
    kinds: ["property", "parameter", "schema"],
    excludeNames: new Set([name.toLowerCase()]),
  });

  const properties = schema.properties ?? {};
  const requiredSet = new Set(schema.required ?? []);

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

  return (
    <div>
      <div
        className="group/node grid grid-cols-[18px_minmax(120px,1.2fr)_88px_88px_36px_1fr_32px] items-center gap-1 rounded-md border border-transparent px-1 py-1 hover:border-border hover:bg-background"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          className="flex h-7 w-[18px] items-center justify-center text-muted-foreground"
          onClick={() => expandable && setOpen((v) => !v)}
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
            onFocus={() => setSuggesting(true)}
            onBlur={() => {
              setTimeout(() => setSuggesting(false), 150);
              applyName(draftName);
            }}
            onChange={(e) => {
              setDraftName(e.target.value);
              setSuggesting(true);
            }}
            className="h-7 bg-background font-mono text-xs"
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
            const next = emptySchemaForType(value === "$ref" ? "$ref" : value);
            if (schema.description) next.description = schema.description;
            onChange(next);
            setOpen(true);
          }}
        >
          <SelectTrigger className="h-7 bg-background text-[11px]">
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
        <Select
          value={schema.format ?? ""}
          onValueChange={(value) => onChange({ ...schema, format: value || undefined })}
          disabled={!FORMATS[type]}
        >
          <SelectTrigger className="h-7 bg-background text-[11px]">
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
          <Checkbox checked={required} onCheckedChange={(value) => onToggleRequired(value === true)} />
        </label>
        <Input
          value={schema.description ?? ""}
          onChange={(e) => onChange({ ...schema, description: e.target.value })}
          className="h-7 bg-background text-xs"
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

      {open && type === "object" ? (
        <div>
          {Object.entries(properties).map(([key, child]) => (
            <FieldRow
              key={key}
              spec={spec}
              name={key}
              schema={child}
              required={requiredSet.has(key)}
              depth={depth + 1}
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
            />
          ))}
          <button
            type="button"
            onClick={() => {
              let field = "field";
              let i = 1;
              while (properties[field]) field = `field${i++}`;
              onChange({
                ...schema,
                type: "object",
                properties: { ...properties, [field]: { type: "string" } },
              });
              setOpen(true);
            }}
            className="mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground"
            style={{ marginLeft: 22 + (depth + 1) * 14 }}
          >
            <Plus className="h-3 w-3" />
            Add field
          </button>
        </div>
      ) : null}

      {open && type === "array" ? (
        <FieldRow
          spec={spec}
          name="items"
          schema={schema.items ?? { type: "string" }}
          required={false}
          depth={depth + 1}
          onRename={() => undefined}
          onChange={(next) => onChange({ ...schema, type: "array", items: next })}
          onDelete={() => onChange({ ...schema, type: "array", items: { type: "string" } })}
          onToggleRequired={() => undefined}
        />
      ) : null}
    </div>
  );
};

export const SchemaTreeEditor: React.FC<SchemaTreeEditorProps> = ({ spec, schema, onChange }) => {
  const current = schema ?? { type: "object", properties: {} };
  const type = schemaType(current);
  const properties = current.properties ?? {};
  const required = new Set(current.required ?? []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-[18px_minmax(120px,1.2fr)_88px_88px_36px_1fr_32px] gap-1 border-b border-border bg-muted/70 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span />
        <span>Field</span>
        <span>Type</span>
        <span>Format</span>
        <span>Req</span>
        <span>Description</span>
        <span />
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/15 p-1">
        {type !== "object" ? (
          <div className="space-y-2 p-2">
            <p className="text-xs text-muted-foreground">
              Root type is <span className="font-mono font-semibold">{type}</span>. Switch to object to edit fields.
            </p>
            <Select value={type} onValueChange={(value) => onChange(emptySchemaForType(value))}>
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
        ) : Object.keys(properties).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-xs text-muted-foreground">No fields yet. Add one or pick a name from this spec.</p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              type="button"
              onClick={() => onChange({ ...current, type: "object", properties: { field: { type: "string" } } })}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add field
            </Button>
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
              onRename={(nextName) => {
                if (!nextName || nextName === key || properties[nextName]) return;
                const nextProps: Record<string, SchemaObject> = {};
                for (const [propName, value] of Object.entries(properties)) {
                  nextProps[propName === key ? nextName : propName] = value;
                }
                onChange({
                  ...current,
                  properties: nextProps,
                  required: (current.required ?? []).map((item) => (item === key ? nextName : item)),
                });
              }}
              onChange={(next) =>
                onChange({
                  ...current,
                  type: "object",
                  properties: { ...properties, [key]: next },
                })
              }
              onDelete={() => {
                const nextProps = { ...properties };
                delete nextProps[key];
                onChange({
                  ...current,
                  properties: nextProps,
                  required: (current.required ?? []).filter((item) => item !== key),
                });
              }}
              onToggleRequired={(isRequired) => {
                const set = new Set(current.required ?? []);
                if (isRequired) set.add(key);
                else set.delete(key);
                onChange({ ...current, required: [...set] });
              }}
            />
          ))
        )}
        {type === "object" && Object.keys(properties).length > 0 ? (
          <button
            type="button"
            onClick={() => {
              let field = "field";
              let i = 1;
              while (properties[field]) field = `field${i++}`;
              onChange({
                ...current,
                type: "object",
                properties: { ...properties, [field]: { type: "string" } },
              });
            }}
            className="m-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add field
          </button>
        ) : null}
      </div>
    </div>
  );
};
