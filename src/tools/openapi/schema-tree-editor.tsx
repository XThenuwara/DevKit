import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  collectSchemaNames,
  componentRef,
  emptySchemaForType,
  isRef,
  parseComponentRef,
  resolveRef,
  schemaType,
  upsertComponentSchema,
} from "./openapi-model";
import type { OpenAPIDoc, SchemaObject } from "./openapi-types";

const TYPES = ["object", "array", "string", "integer", "number", "boolean", "$ref"] as const;

type SchemaTreeEditorProps = {
  spec: OpenAPIDoc;
  schema: SchemaObject | undefined;
  onChange: (schema: SchemaObject) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
  name?: string;
  depth?: number;
};

const NodeRow: React.FC<{
  name: string;
  schema: SchemaObject;
  spec: OpenAPIDoc;
  required?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canToggleRequired?: boolean;
  onRename?: (next: string) => void;
  onChange: (schema: SchemaObject) => void;
  onDelete?: () => void;
  onToggleRequired?: (required: boolean) => void;
  onSpecChange: (spec: OpenAPIDoc) => void;
  depth: number;
}> = ({
  name,
  schema,
  spec,
  required = false,
  canRename = false,
  canDelete = false,
  canToggleRequired = false,
  onRename,
  onChange,
  onDelete,
  onToggleRequired,
  onSpecChange,
  depth,
}) => {
  const [open, setOpen] = useState(depth < 2);
  const [draftName, setDraftName] = useState(name);
  const names = collectSchemaNames(spec);
  const type = schemaType(schema);
  const refInfo = schema.$ref ? parseComponentRef(schema.$ref) : null;
  const resolved = isRef(schema) ? resolveRef<SchemaObject>(spec, schema) : schema;
  const properties = resolved?.properties ?? {};
  const isObject = schemaType(resolved) === "object";
  const isArray = schemaType(resolved) === "array";
  const expandable = isObject || isArray || Boolean(refInfo);

  const patchResolved = (next: SchemaObject) => {
    if (refInfo?.group === "schemas") {
      onSpecChange(upsertComponentSchema(spec, refInfo.name, next));
      return;
    }
    onChange(next);
  };

  const setType = (nextType: string) => {
    if (nextType === "$ref") {
      onChange({ $ref: names[0] ? componentRef("schemas", names[0]) : "" });
      return;
    }
    const next = emptySchemaForType(nextType);
    if (schema.description) next.description = schema.description;
    onChange(next);
  };

  const addChild = () => {
    const current = resolved ?? { type: "object", properties: {} };
    let field = "field";
    let i = 1;
    while (current.properties?.[field]) field = `field${i++}`;
    patchResolved({
      ...current,
      type: "object",
      properties: { ...(current.properties ?? {}), [field]: { type: "string" } },
    });
    setOpen(true);
  };

  return (
    <div>
      <div
        className="group/node grid grid-cols-[18px_1fr_92px_28px_28px] items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/50"
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          type="button"
          className="flex h-6 w-[18px] items-center justify-center text-muted-foreground"
          onClick={() => expandable && setOpen((v) => !v)}
          disabled={!expandable}
        >
          {expandable ? (
            open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
        </button>
        {canRename ? (
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              const next = draftName.trim();
              if (next && next !== name) onRename?.(next);
              else setDraftName(name);
            }}
            className="h-6 border-transparent bg-transparent px-1 font-mono text-xs shadow-none focus-visible:border-border focus-visible:bg-background"
          />
        ) : (
          <span className="truncate px-1 font-mono text-xs font-semibold">{name}</span>
        )}
        <Select value={refInfo ? "$ref" : type} onValueChange={setType}>
          <SelectTrigger className="h-6 px-1.5 text-[10px]">
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
        {canToggleRequired ? (
          <label className="flex items-center justify-center" title="Required">
            <Checkbox
              checked={required}
              onCheckedChange={(value) => onToggleRequired?.(value === true)}
            />
          </label>
        ) : (
          <span />
        )}
        {canDelete ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover/node:opacity-100 text-muted-foreground hover:text-destructive"
            type="button"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        ) : (
          <span />
        )}
      </div>

      {open && refInfo ? (
        <div className="ml-6 mb-1 flex items-center gap-2 px-1">
          <Select value={refInfo.name} onValueChange={(next) => onChange({ $ref: componentRef("schemas", next) })}>
            <SelectTrigger className="h-6 w-[160px] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {names.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {open && isObject && resolved ? (
        <div>
          {Object.entries(properties).map(([key, child], index) => (
            <NodeRow
              key={`${index}-${key}`}
              name={key}
              schema={child}
              spec={spec}
              depth={depth + 1}
              required={(resolved.required ?? []).includes(key)}
              canRename
              canDelete
              canToggleRequired
              onRename={(nextName) => {
                if (!nextName || nextName === key || properties[nextName]) return;
                const nextProps: Record<string, SchemaObject> = {};
                for (const [propName, value] of Object.entries(properties)) {
                  nextProps[propName === key ? nextName : propName] = value;
                }
                patchResolved({
                  ...resolved,
                  properties: nextProps,
                  required: (resolved.required ?? []).map((item) => (item === key ? nextName : item)),
                });
              }}
              onChange={(next) =>
                patchResolved({
                  ...resolved,
                  properties: { ...properties, [key]: next },
                })
              }
              onDelete={() => {
                const nextProps = { ...properties };
                delete nextProps[key];
                patchResolved({
                  ...resolved,
                  properties: nextProps,
                  required: (resolved.required ?? []).filter((item) => item !== key),
                });
              }}
              onToggleRequired={(isRequired) => {
                const set = new Set(resolved.required ?? []);
                if (isRequired) set.add(key);
                else set.delete(key);
                patchResolved({ ...resolved, required: [...set] });
              }}
              onSpecChange={onSpecChange}
            />
          ))}
          <button
            type="button"
            onClick={addChild}
            className="ml-6 flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            style={{ paddingLeft: (depth + 1) * 12 }}
          >
            <Plus className="h-3 w-3" />
            Add field
          </button>
        </div>
      ) : null}

      {open && isArray && resolved ? (
        <NodeRow
          name="items"
          schema={resolved.items ?? { type: "string" }}
          spec={spec}
          depth={depth + 1}
          onChange={(next) => patchResolved({ ...resolved, type: "array", items: next })}
          onSpecChange={onSpecChange}
        />
      ) : null}
    </div>
  );
};

export const SchemaTreeEditor: React.FC<SchemaTreeEditorProps> = ({
  spec,
  schema,
  onChange,
  onSpecChange,
  name = "body",
}) => (
  <div className="h-full min-h-0 flex-1 overflow-auto rounded-md border border-border bg-muted/20 p-2">
    <div className="mb-1 grid grid-cols-[18px_1fr_92px_28px_28px] gap-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <span />
      <span>Field</span>
      <span>Type</span>
      <span>Req</span>
      <span />
    </div>
    <NodeRow
      name={name}
      schema={schema ?? { type: "object", properties: {} }}
      spec={spec}
      depth={0}
      onChange={onChange}
      onSpecChange={onSpecChange}
    />
  </div>
);
