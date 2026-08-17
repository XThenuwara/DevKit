import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Link2, Link2Off, Plus, Trash2 } from "lucide-react";
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

const PRIMITIVE_TYPES = ["object", "array", "string", "number", "integer", "boolean"] as const;

const FORMATS: Record<string, string[]> = {
  string: ["", "date", "date-time", "email", "uuid", "uri", "hostname", "ipv4", "ipv6", "byte", "binary", "password"],
  integer: ["", "int32", "int64"],
  number: ["", "float", "double"],
};

type SchemaVisualEditorProps = {
  spec: OpenAPIDoc;
  schema: SchemaObject | undefined;
  onChange: (schema: SchemaObject) => void;
  onSpecChange?: (spec: OpenAPIDoc) => void;
  depth?: number;
};

export const SchemaVisualEditor: React.FC<SchemaVisualEditorProps> = ({
  spec,
  schema,
  onChange,
  onSpecChange,
  depth = 0,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const names = useMemo(() => collectSchemaNames(spec), [spec]);
  const current = schema ?? { type: "object", properties: {} };
  const type = schemaType(current);
  const refInfo = current.$ref ? parseComponentRef(current.$ref) : null;
  const resolved = isRef(current) ? resolveRef<SchemaObject>(spec, current) : current;

  const setType = (nextType: string) => {
    if (nextType === "$ref") {
      onChange({ $ref: names[0] ? componentRef("schemas", names[0]) : "" });
      return;
    }
    const next = emptySchemaForType(nextType);
    if (current.description) next.description = current.description;
    onChange(next);
  };

  const patchResolved = (next: SchemaObject) => {
    if (refInfo?.group === "schemas" && onSpecChange) {
      onSpecChange(upsertComponentSchema(spec, refInfo.name, next));
      return;
    }
    onChange(next);
  };

  const unlink = () => {
    if (!resolved) return;
    onChange(structuredClone(resolved));
  };

  const properties = resolved?.properties ?? {};
  const required = new Set(resolved?.required ?? []);

  const updateProperty = (name: string, next: SchemaObject) => {
    if (!resolved) return;
    patchResolved({
      ...resolved,
      type: "object",
      properties: { ...properties, [name]: next },
    });
  };

  const renameProperty = (from: string, to: string) => {
    if (!resolved || !to || from === to || properties[to]) return;
    const nextProps: Record<string, SchemaObject> = {};
    for (const [key, value] of Object.entries(properties)) {
      nextProps[key === from ? to : key] = value;
    }
    const nextRequired = (resolved.required ?? []).map((item) => (item === from ? to : item));
    patchResolved({ ...resolved, properties: nextProps, required: nextRequired });
  };

  const removeProperty = (name: string) => {
    if (!resolved) return;
    const nextProps = { ...properties };
    delete nextProps[name];
    patchResolved({
      ...resolved,
      properties: nextProps,
      required: (resolved.required ?? []).filter((item) => item !== name),
    });
  };

  const addProperty = () => {
    if (!resolved) {
      onChange({ type: "object", properties: { field: { type: "string" } }, required: [] });
      return;
    }
    let name = "field";
    let i = 1;
    while (properties[name]) name = `field${i++}`;
    patchResolved({
      ...resolved,
      type: "object",
      properties: { ...properties, [name]: { type: "string" } },
    });
    setExpanded((prev) => ({ ...prev, [name]: true }));
  };

  const toggleRequired = (name: string, isRequired: boolean) => {
    if (!resolved) return;
    const set = new Set(resolved.required ?? []);
    if (isRequired) set.add(name);
    else set.delete(name);
    patchResolved({ ...resolved, required: [...set] });
  };

  return (
    <div className={`rounded-md border border-border bg-muted/40 ${depth === 0 ? "p-3" : "p-2"} space-y-2.5`}>
      {refInfo ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/8 px-2.5 py-1.5">
          <Link2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            Shared schema
          </span>
          <Select
            value={refInfo.name}
            onValueChange={(name) => onChange({ $ref: componentRef("schemas", name) })}
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {names.length === 0 ? (
                <SelectItem value={refInfo.name}>{refInfo.name}</SelectItem>
              ) : (
                names.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={unlink} type="button">
            <Link2Off className="h-3.5 w-3.5 mr-1" />
            Unlink
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</span>
          <Select value={type === "$ref" ? "$ref" : type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIMITIVE_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
              <SelectItem value="$ref">$ref</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {resolved && !isRef(current) && FORMATS[schemaType(resolved)] ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Format</span>
            <Select
              value={resolved.format || "__none"}
              onValueChange={(value) =>
                patchResolved({ ...resolved, format: value === "__none" ? undefined : value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {FORMATS[schemaType(resolved)].map((fmt) => (
                  <SelectItem key={fmt || "none"} value={fmt || "__none"}>
                    {fmt || "None"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : (
          <div />
        )}
        <label className="flex flex-col gap-1 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Description</span>
          <Input
            value={resolved?.description ?? ""}
            onChange={(e) => {
              if (isRef(current) && resolved) patchResolved({ ...resolved, description: e.target.value });
              else onChange({ ...current, description: e.target.value });
            }}
            className="h-8 text-xs"
            placeholder="What this value is"
          />
        </label>
      </div>

      {resolved && schemaType(resolved) !== "object" && schemaType(resolved) !== "array" && !isRef(resolved) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Example</span>
            <Input
              value={resolved.example == null ? "" : String(resolved.example)}
              onChange={(e) => patchResolved({ ...resolved, example: e.target.value || undefined })}
              className="h-8 text-xs font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Enum (comma separated)</span>
            <Input
              value={(resolved.enum ?? []).map(String).join(", ")}
              onChange={(e) => {
                const values = e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);
                patchResolved({ ...resolved, enum: values.length ? values : undefined });
              }}
              className="h-8 text-xs font-mono"
              placeholder="placed, approved"
            />
          </label>
        </div>
      ) : null}

      {resolved && !isRef(resolved) && schemaType(resolved) === "array" && depth < 6 ? (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Array items</span>
          <SchemaVisualEditor
            spec={spec}
            schema={resolved.items ?? { type: "string" }}
            onChange={(items) => patchResolved({ ...resolved, type: "array", items })}
            onSpecChange={onSpecChange}
            depth={depth + 1}
          />
        </div>
      ) : null}

      {resolved && !isRef(resolved) && schemaType(resolved) === "object" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Properties</span>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addProperty} type="button">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add field
            </Button>
          </div>
          {Object.keys(properties).length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-1">No fields yet. Add a property to describe this object.</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(properties).map(([name, child]) => {
                const open = expanded[name] ?? depth < 1;
                return (
                  <div key={name} className="overflow-hidden rounded-md border border-border bg-card">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setExpanded((prev) => ({ ...prev, [name]: !open }))}
                      >
                        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <Checkbox
                        checked={required.has(name)}
                        onCheckedChange={(value) => toggleRequired(name, value === true)}
                        title="Required"
                      />
                      <Input
                        value={name}
                        onChange={(e) => renameProperty(name, e.target.value.trim())}
                        className="h-7 text-xs font-mono flex-1"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0 truncate">
                        {schemaType(child)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeProperty(name)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {open && depth < 6 ? (
                      <div className="px-2 pb-2">
                        <SchemaVisualEditor
                          spec={spec}
                          schema={child}
                          onChange={(next) => updateProperty(name, next)}
                          onSpecChange={onSpecChange}
                          depth={depth + 1}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
