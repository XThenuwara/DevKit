import React, { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getOperation,
  getTagOrder,
  listOperations,
  parseComponentRef,
  resolveRef,
  schemaType,
} from "./openapi-model";
import type {
  HttpMethod,
  OpenAPIDoc,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "./openapi-types";

const METHOD_STYLE: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  post: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/25",
  put: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25",
  patch: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25",
  options: "bg-muted text-muted-foreground border-border",
  head: "bg-muted text-muted-foreground border-border",
  trace: "bg-muted text-muted-foreground border-border",
};

const STATUS_STYLE = (code: string) => {
  if (code.startsWith("2")) return "text-emerald-600 dark:text-emerald-400";
  if (code.startsWith("3")) return "text-sky-600 dark:text-sky-400";
  if (code.startsWith("4")) return "text-amber-600 dark:text-amber-400";
  if (code.startsWith("5")) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
};

const describeSchema = (spec: OpenAPIDoc, schema: SchemaObject | undefined, depth = 0): string => {
  if (!schema) return "—";
  if (schema.$ref) {
    const parsed = parseComponentRef(schema.$ref);
    if (parsed?.group === "schemas") return parsed.name;
    return schema.$ref;
  }
  const resolved = schema;
  const type = schemaType(resolved);
  if (type === "object") {
    const keys = Object.keys(resolved.properties ?? {});
    if (keys.length === 0) return "object";
    if (depth > 0 || keys.length > 5) return `object · ${keys.length} properties`;
    return `{ ${keys.join(", ")} }`;
  }
  if (type === "array") {
    const inner = describeSchema(spec, resolved.items, depth + 1);
    return `array<${inner}>`;
  }
  if (resolved.enum?.length) return `${type} · ${resolved.enum.map(String).join(" | ")}`;
  return resolved.format ? `${type} (${resolved.format})` : type;
};

const SchemaBlock: React.FC<{ spec: OpenAPIDoc; schema?: SchemaObject; label: string }> = ({
  spec,
  schema,
  label,
}) => {
  if (!schema) return null;
  const resolved = schema.$ref ? resolveRef<SchemaObject>(spec, schema) ?? schema : schema;
  const type = schemaType(resolved);
  const properties = resolved.properties ?? {};
  const required = new Set(resolved.required ?? []);

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xs text-foreground">{describeSchema(spec, schema)}</p>
      {type === "object" && Object.keys(properties).length > 0 ? (
        <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
          {Object.entries(properties).map(([name, child]) => (
            <div key={name} className="flex items-start gap-2 text-[11px]">
              <span className="min-w-[88px] font-mono font-semibold text-foreground">
                {name}
                {required.has(name) ? <span className="text-destructive">*</span> : null}
              </span>
              <span className="font-mono text-muted-foreground">{describeSchema(spec, child, 1)}</span>
              {child.description ? (
                <span className="min-w-0 flex-1 text-muted-foreground">— {child.description}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ParamsTable: React.FC<{ params: ParameterObject[] }> = ({ params }) => {
  if (params.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border/70">
      <div className="grid grid-cols-[minmax(100px,1fr)_72px_minmax(88px,0.8fr)_44px_1fr] gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Name</span>
        <span>In</span>
        <span>Type</span>
        <span>Req</span>
        <span>Description</span>
      </div>
      {params.map((param, index) => {
        const type = schemaType(param.schema);
        return (
          <div
            key={`${param.in}-${param.name}-${index}`}
            className="grid grid-cols-[minmax(100px,1fr)_72px_minmax(88px,0.8fr)_44px_1fr] gap-2 border-b border-border/40 px-3 py-2 text-[11px] last:border-b-0"
          >
            <span className="font-mono font-semibold">{param.name}</span>
            <span className="uppercase text-muted-foreground">{param.in}</span>
            <span className="font-mono text-muted-foreground">{type}</span>
            <span>{param.required || param.in === "path" ? "yes" : "—"}</span>
            <span className="text-muted-foreground">{param.description ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
};

const OperationBlock: React.FC<{
  spec: OpenAPIDoc;
  path: string;
  method: HttpMethod;
  operation: OperationObject;
  compact?: boolean;
  onOpen?: () => void;
}> = ({ spec, path, method, operation, compact, onOpen }) => {
  const pathItem = spec.paths?.[path];
  const params = [
    ...(pathItem?.parameters ?? []).map((p) => resolveRef<ParameterObject>(spec, p) ?? p),
    ...(operation.parameters ?? []).map((p) => resolveRef<ParameterObject>(spec, p) ?? p),
  ];
  const body = resolveRef<RequestBodyObject>(spec, operation.requestBody);
  const responses = Object.entries(operation.responses ?? {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Card size="sm" className="overflow-hidden ring-border/60">
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-extrabold uppercase ${METHOD_STYLE[method] ?? METHOD_STYLE.get}`}
          >
            {method}
          </span>
          <code className="text-xs font-semibold text-foreground">{path}</code>
          {operation.deprecated ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              deprecated
            </span>
          ) : null}
          {onOpen ? (
            <Button variant="ghost" size="xs" type="button" className="ml-auto h-6" onClick={onOpen}>
              Edit
              <ChevronRight className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        {operation.summary ? <CardTitle className="text-sm">{operation.summary}</CardTitle> : null}
        {operation.description && !compact ? (
          <CardDescription className="text-xs leading-relaxed">{operation.description}</CardDescription>
        ) : null}
        {operation.operationId ? (
          <p className="font-mono text-[10px] text-muted-foreground">{operation.operationId}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {params.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parameters</p>
            <ParamsTable params={params} />
          </div>
        ) : null}
        {body ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Request body{body.required ? " · required" : ""}
            </p>
            {Object.entries(body.content ?? {}).map(([media, item]) => (
              <div key={media} className="space-y-2">
                <p className="font-mono text-[10px] text-muted-foreground">{media}</p>
                <SchemaBlock spec={spec} schema={item.schema} label="Schema" />
              </div>
            ))}
          </div>
        ) : null}
        {responses.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Responses</p>
            <div className="space-y-2">
              {responses.map(([code, response]) => {
                const resolved = resolveRef<ResponseObject>(spec, response) ?? response;
                const media = Object.entries(resolved.content ?? {});
                return (
                  <div key={code} className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${STATUS_STYLE(code)}`}>{code}</span>
                      <span className="text-xs text-muted-foreground">{resolved.description || "—"}</span>
                    </div>
                    {media.map(([type, item]) => (
                      <div key={type} className="mt-2">
                        <p className="mb-1 font-mono text-[10px] text-muted-foreground">{type}</p>
                        <SchemaBlock spec={spec} schema={item.schema} label="Schema" />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

type SwaggerViewProps = {
  spec: OpenAPIDoc;
  path?: string;
  method?: HttpMethod;
  onSelectOperation?: (path: string, method: HttpMethod) => void;
};

export const SwaggerView: React.FC<SwaggerViewProps> = ({ spec, path, method, onSelectOperation }) => {
  const operations = useMemo(() => listOperations(spec), [spec]);
  const single = path && method;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof operations>();
    for (const op of operations) {
      if (single && (op.path !== path || op.method !== method)) continue;
      for (const tag of op.tags) {
        const list = map.get(tag) ?? [];
        list.push(op);
        map.set(tag, list);
      }
    }
    const tags = getTagOrder(
      spec,
      [...map.keys()].sort((a, b) => a.localeCompare(b)),
    );
    return tags.map((tag) => ({ tag, ops: map.get(tag) ?? [] }));
  }, [operations, path, method, single, spec]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-muted/15">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        {!single ? (
          <header className="space-y-2 border-b border-border/60 pb-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="font-heading text-xl tracking-tight text-foreground">{spec.info.title}</h1>
              <span className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground">
                v{spec.info.version}
              </span>
            </div>
            {spec.info.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{spec.info.description}</p>
            ) : null}
            {(spec.servers ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {spec.servers!.map((server, index) => (
                  <code
                    key={index}
                    className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground"
                  >
                    {server.url}
                  </code>
                ))}
              </div>
            ) : null}
          </header>
        ) : null}

        {grouped.map(({ tag, ops }) => (
          <section key={tag} className="space-y-2">
            {!single ? (
              <h2 className="sticky top-0 z-10 bg-muted/15 py-1 text-sm font-bold text-foreground backdrop-blur-xs">
                {tag === "untagged" ? "Endpoints" : tag}
              </h2>
            ) : null}
            <div className="space-y-3">
              {ops.map((op) => {
                const operation = getOperation(spec, op.path, op.method);
                if (!operation) return null;
                return (
                  <OperationBlock
                    key={op.id}
                    spec={spec}
                    path={op.path}
                    method={op.method}
                    operation={operation}
                    compact={Boolean(single)}
                    onOpen={
                      onSelectOperation ? () => onSelectOperation(op.path, op.method) : undefined
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
