import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emptySchemaForType, PARAM_IN_ORDER, schemaType } from "./openapi-model";
import { FullscreenModal } from "./fullscreen-modal";
import type { ParameterObject } from "./openapi-types";

const PARAM_TYPES = ["string", "integer", "number", "boolean", "array"] as const;
const PARAM_FORMATS: Record<string, string[]> = {
  string: ["", "date", "date-time", "uuid", "uri"],
  integer: ["", "int32", "int64"],
  number: ["", "float", "double"],
};

type ParamRow = {
  source: "path" | "operation";
  index: number;
  param: ParameterObject;
};

const buildRows = (pathParams: ParameterObject[], opParams: ParameterObject[]): ParamRow[] => {
  const rows: ParamRow[] = [
    ...pathParams.map((param, index) => ({ source: "path" as const, index, param })),
    ...opParams.map((param, index) => ({ source: "operation" as const, index, param })),
  ];
  return rows.sort((a, b) => {
    const inDiff = PARAM_IN_ORDER[a.param.in] - PARAM_IN_ORDER[b.param.in];
    if (inDiff !== 0) return inDiff;
    if (a.source !== b.source) return a.source === "path" ? -1 : 1;
    return a.index - b.index;
  });
};

type ParametersTableProps = {
  pathParams: ParameterObject[];
  opParams: ParameterObject[];
  onPathChange: (parameters: ParameterObject[]) => void;
  onOpChange: (parameters: ParameterObject[]) => void;
  compact?: boolean;
};

export const ParametersTable: React.FC<ParametersTableProps> = ({
  pathParams,
  opParams,
  onPathChange,
  onOpChange,
  compact = false,
}) => {
  const rows = useMemo(() => buildRows(pathParams, opParams), [pathParams, opParams]);

  const patch = (row: ParamRow, next: ParameterObject) => {
    if (row.source === "path") {
      onPathChange(pathParams.map((item, i) => (i === row.index ? next : item)));
    } else {
      onOpChange(opParams.map((item, i) => (i === row.index ? next : item)));
    }
  };

  const remove = (row: ParamRow) => {
    if (row.source === "path") onPathChange(pathParams.filter((_, i) => i !== row.index));
    else onOpChange(opParams.filter((_, i) => i !== row.index));
  };

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No parameters. Path params are inferred from the URL template.
      </p>
    );
  }

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-md border border-border ${compact ? "h-full" : "h-full"}`}>
      <div className="grid min-w-[680px] shrink-0 grid-cols-[1fr_72px_88px_88px_44px_1fr_72px_32px] gap-0 bg-muted/70 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Name</span>
        <span>In</span>
        <span>Type</span>
        <span>Format</span>
        <span>Req</span>
        <span>Description</span>
        <span>Example</span>
        <span />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
      {rows.map((row) => {
        const { param } = row;
        const schema = param.schema ?? { type: "string" };
        const type = schemaType(schema);
        const formats = PARAM_FORMATS[type] ?? [""];
        return (
          <div
            key={`${row.source}-${row.index}`}
            className="grid min-w-[680px] grid-cols-[1fr_72px_88px_88px_44px_1fr_72px_32px] items-center gap-1 border-t border-border bg-card px-2 py-1.5"
          >
            <Input
              value={param.name}
              onChange={(e) => patch(row, { ...param, name: e.target.value })}
              className="h-7 text-xs font-mono"
              placeholder="name"
            />
            <Select
              value={param.in}
              onValueChange={(value) => {
                const nextIn = value as ParameterObject["in"];
                if (nextIn === "path" && row.source === "operation") {
                  const moved = { ...param, in: nextIn, required: true };
                  onOpChange(opParams.filter((_, i) => i !== row.index));
                  onPathChange([...pathParams, moved]);
                  return;
                }
                if (nextIn !== "path" && row.source === "path") {
                  const moved = { ...param, in: nextIn, required: false };
                  onPathChange(pathParams.filter((_, i) => i !== row.index));
                  onOpChange([...opParams, moved]);
                  return;
                }
                patch(row, {
                  ...param,
                  in: nextIn,
                  required: nextIn === "path" ? true : param.required,
                });
              }}
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
            <Select
              value={type}
              onValueChange={(value) =>
                patch(row, {
                  ...param,
                  schema: emptySchemaForType(value),
                })
              }
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAM_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={schema.format ?? ""}
              onValueChange={(value) =>
                patch(row, {
                  ...param,
                  schema: { ...schema, format: value || undefined },
                })
              }
              disabled={!PARAM_FORMATS[type]}
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
                checked={Boolean(param.required) || param.in === "path"}
                onCheckedChange={(value) => patch(row, { ...param, required: value === true })}
                disabled={param.in === "path"}
              />
            </label>
            <Input
              value={param.description ?? ""}
              onChange={(e) => patch(row, { ...param, description: e.target.value })}
              className="h-7 text-xs"
              placeholder="Description"
            />
            <Input
              value={schema.example !== undefined ? String(schema.example) : ""}
              onChange={(e) => {
                const raw = e.target.value;
                let example: unknown = raw;
                if (type === "integer") example = raw ? Number.parseInt(raw, 10) : undefined;
                else if (type === "number") example = raw ? Number.parseFloat(raw) : undefined;
                else if (type === "boolean") example = raw === "true";
                patch(row, {
                  ...param,
                  schema: { ...schema, example: raw ? example : undefined },
                });
              }}
              className="h-7 text-xs font-mono"
              placeholder="ex"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove(row)}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      </div>
    </div>
  );
};

export const ParametersPanel: React.FC<{
  pathParams: ParameterObject[];
  opParams: ParameterObject[];
  onPathChange: (parameters: ParameterObject[]) => void;
  onOpChange: (parameters: ParameterObject[]) => void;
}> = (props) => {
  const [fullscreen, setFullscreen] = useState(false);

  const add = (location: ParameterObject["in"]) => {
    const param: ParameterObject = {
      name: location === "path" ? "id" : "param",
      in: location,
      required: location === "path",
      schema: { type: "string" },
    };
    if (location === "path") props.onPathChange([...props.pathParams, param]);
    else props.onOpChange([...props.opParams, param]);
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Parameters</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => add("query")} type="button">
            <Plus className="h-3 w-3 mr-1" />
            Query
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => add("header")} type="button">
            Header
          </Button>
          <FullscreenModal
            title="Parameters"
            open={fullscreen}
            onOpenChange={setFullscreen}
            triggerLabel="Expand"
          >
            <ParametersTable {...props} />
          </FullscreenModal>
        </div>
      </header>
      <div className="min-h-0 flex-1 p-3">
        <ParametersTable {...props} compact />
      </div>
    </section>
  );
};
