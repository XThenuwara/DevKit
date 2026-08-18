import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  collectFieldCatalog,
  emptySchemaForType,
  fieldToSchema,
  filterFieldCatalog,
  PARAM_IN_ORDER,
  schemaType,
  uniqueName,
} from "./openapi-model";
import { FullscreenModal } from "./fullscreen-modal";
import { SuggestMenu } from "./suggest-menu";
import type { FieldSuggestion } from "./openapi-model";
import type { OpenAPIDoc, ParameterObject } from "./openapi-types";

const PARAM_TYPES = ["string", "integer", "number", "boolean", "array"] as const;
const PARAM_FORMATS: Record<string, string[]> = {
  string: ["", "date", "date-time", "uuid", "uri"],
  integer: ["", "int32", "int64"],
  number: ["", "float", "double"],
};

const CELL =
  "h-7 bg-transparent border-transparent shadow-none hover:bg-background hover:border-input focus-visible:bg-background";

const IN_TONE: Record<ParameterObject["in"], string> = {
  path: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  query: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  header: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  cookie: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
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

const suggestionToParam = (item: FieldSuggestion, fallbackIn: ParameterObject["in"]): ParameterObject => ({
  name: item.name,
  in: item.in ?? fallbackIn,
  required: (item.in ?? fallbackIn) === "path",
  description: item.description,
  schema: fieldToSchema(item),
});

type ParametersTableProps = {
  spec: OpenAPIDoc;
  pathParams: ParameterObject[];
  opParams: ParameterObject[];
  onPathChange: (parameters: ParameterObject[]) => void;
  onOpChange: (parameters: ParameterObject[]) => void;
  onAdd: (location: ParameterObject["in"], from?: FieldSuggestion) => void;
};

export const ParametersTable: React.FC<ParametersTableProps> = ({
  spec,
  pathParams,
  opParams,
  onPathChange,
  onOpChange,
  onAdd,
}) => {
  const [activeName, setActiveName] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const catalog = useMemo(() => collectFieldCatalog(spec), [spec]);
  const rows = useMemo(() => buildRows(pathParams, opParams), [pathParams, opParams]);
  const existingNames = useMemo(
    () => new Set(rows.map((row) => row.param.name.toLowerCase())),
    [rows],
  );

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

  const applySuggestion = (row: ParamRow, item: FieldSuggestion) => {
    const next = suggestionToParam(item, row.param.in);
    if (next.in === "path" && row.source === "operation") {
      onOpChange(opParams.filter((_, i) => i !== row.index));
      onPathChange([...pathParams, next]);
    } else if (next.in !== "path" && row.source === "path") {
      onPathChange(pathParams.filter((_, i) => i !== row.index));
      onOpChange([...opParams, next]);
    } else {
      patch(row, next);
    }
    setActiveName(null);
    setAnchor(null);
  };

  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-xs text-muted-foreground">No parameters yet. Add a field or reuse one from this spec.</p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={() => onAdd("path")}>
            <Plus className="h-3 w-3 mr-1" />
            Path
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={() => onAdd("query")}>
            <Plus className="h-3 w-3 mr-1" />
            Query
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={() => onAdd("header")}>
            <Plus className="h-3 w-3 mr-1" />
            Header
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid min-w-[720px] shrink-0 grid-cols-[1fr_80px_88px_88px_44px_1fr_72px_32px] gap-0 border-b border-border/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
        {rows.map((row, visualIndex) => {
          const { param } = row;
          const schema = param.schema ?? { type: "string" };
          const type = schemaType(schema);
          const formats = PARAM_FORMATS[type] ?? [""];
          const rowKey = `${row.source}-${row.index}`;
          const matches = filterFieldCatalog(catalog, param.name, {
            kinds: ["parameter", "property", "schema"],
            excludeNames: new Set(
              [...existingNames].filter((name) => name !== param.name.toLowerCase()),
            ),
          });
          return (
            <div
              key={rowKey}
              className={`grid min-w-[720px] grid-cols-[1fr_80px_88px_88px_44px_1fr_72px_32px] items-center gap-1 border-b border-border/40 px-2 py-1 ${
                visualIndex % 2 === 0 ? "bg-transparent" : "bg-muted/25"
              }`}
            >
              <div className="relative">
                <Input
                  value={param.name}
                  onFocus={(e) => {
                    setActiveName(rowKey);
                    setAnchor(e.currentTarget);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setActiveName((current) => (current === rowKey ? null : current));
                      setAnchor(null);
                    }, 150)
                  }
                  onChange={(e) => {
                    patch(row, { ...param, name: e.target.value });
                    setActiveName(rowKey);
                    setAnchor(e.currentTarget);
                  }}
                  className={`${CELL} text-xs font-mono`}
                  placeholder="name"
                />
                <SuggestMenu
                  open={activeName === rowKey}
                  anchor={activeName === rowKey ? anchor : null}
                  items={matches.map((item) => ({
                    id: item.key,
                    title: item.name,
                    badge: item.kind === "parameter" ? item.in ?? "param" : item.kind,
                    subtitle: `${item.type ?? "string"}${item.usedIn[0] ? ` · ${item.usedIn[0]}` : ""}${item.description ? ` · ${item.description}` : ""}`,
                  }))}
                  onSelect={(id) => {
                    const item = catalog.find((entry) => entry.key === id);
                    if (item) applySuggestion(row, item);
                  }}
                />
              </div>
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
                <SelectTrigger className={`h-7 text-[11px] font-semibold border-transparent ${IN_TONE[param.in]}`}>
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
                <SelectTrigger className={`${CELL} text-[11px]`}>
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
                className={`${CELL} text-xs`}
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
                className={`${CELL} text-xs font-mono`}
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
        <div className="sticky bottom-0 flex items-center gap-1.5 bg-background/90 px-2 py-1.5 backdrop-blur-xs">
          <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={() => onAdd("query")}>
            <Plus className="h-3 w-3 mr-1" />
            Add field
          </Button>
          <span className="text-[10px] text-muted-foreground">or</span>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" type="button" onClick={() => onAdd("path")}>
            Path
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" type="button" onClick={() => onAdd("query")}>
            Query
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" type="button" onClick={() => onAdd("header")}>
            Header
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ParametersPanel: React.FC<{
  spec: OpenAPIDoc;
  pathParams: ParameterObject[];
  opParams: ParameterObject[];
  onPathChange: (parameters: ParameterObject[]) => void;
  onOpChange: (parameters: ParameterObject[]) => void;
}> = (props) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [reuseKey, setReuseKey] = useState(0);
  const catalog = useMemo(() => collectFieldCatalog(props.spec), [props.spec]);
  const existing = useMemo(
    () => new Set([...props.pathParams, ...props.opParams].map((param) => param.name.toLowerCase())),
    [props.pathParams, props.opParams],
  );
  const reusable = filterFieldCatalog(catalog, "", {
    kinds: ["parameter", "property"],
    excludeNames: existing,
  });

  const add = (location: ParameterObject["in"], from?: FieldSuggestion) => {
    const existing = [...props.pathParams, ...props.opParams].map((param) => param.name);
    const fallback =
      location === "path" ? "id" : location === "header" ? "X-Header" : "param";
    const param: ParameterObject = from
      ? { ...suggestionToParam(from, location), name: uniqueName(existing, from.name) }
      : {
          name: uniqueName(existing, fallback),
          in: location,
          required: location === "path",
          schema: { type: "string" },
        };
    if (param.in === "path") props.onPathChange([...props.pathParams, param]);
    else props.onOpChange([...props.opParams, param]);
  };

  const renderAddToolbar = () => (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => add("query")} type="button">
        <Plus className="h-3 w-3 mr-1" />
        Add field
      </Button>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => add("path")} type="button">
        Path
      </Button>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => add("query")} type="button">
        Query
      </Button>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => add("header")} type="button">
        Header
      </Button>
      {reusable.length > 0 ? (
        <Select
          key={reuseKey}
          onValueChange={(key) => {
            const item = catalog.find((entry) => entry.key === key);
            if (item) add(item.in ?? "query", item);
            setReuseKey((n) => n + 1);
          }}
        >
          <SelectTrigger className="h-6 w-[108px] text-[11px]">
            <SelectValue placeholder="Reuse…" />
          </SelectTrigger>
          <SelectContent>
            {reusable.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.name}
                {item.kind === "parameter" && item.in ? ` (${item.in})` : ` · ${item.kind}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Parameters</h3>
        <div className="flex items-center gap-1">
          {renderAddToolbar()}
          <FullscreenModal
            title="Parameters"
            open={fullscreen}
            onOpenChange={setFullscreen}
            triggerLabel="Expand"
            headerAction={renderAddToolbar()}
          >
            <ParametersTable {...props} onAdd={add} />
          </FullscreenModal>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <ParametersTable {...props} onAdd={add} />
      </div>
    </section>
  );
};
