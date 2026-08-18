import { dump as yamlDump, load as yamlLoad } from "js-yaml";
import {
  HTTP_METHODS,
  type HttpMethod,
  type OpenAPIDoc,
  type OperationObject,
  type OperationRef,
  type ParameterObject,
  type PathItemObject,
  type RequestBodyObject,
  type ResponseObject,
  type SchemaObject,
  type SpecFormat,
} from "./openapi-types";

export { HTTP_METHODS };

export const SAMPLE_OPENAPI: OpenAPIDoc = {
  openapi: "3.1.0",
  info: {
    title: "DevKit Pets API",
    version: "1.0.0",
    description: "Sample OpenAPI 3.1 spec. Click an endpoint to edit its request, responses, and schemas.",
  },
  servers: [{ url: "https://api.example.com/v1", description: "Production" }],
  tags: [
    { name: "pets", description: "Pet inventory" },
    { name: "store", description: "Orders" },
  ],
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        tags: ["pets"],
        summary: "List pets",
        description: "Returns a paginated list of pets.",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Max items to return",
            schema: { type: "integer", format: "int32", example: 20 },
          },
        ],
        responses: {
          "200": {
            description: "A page of pets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Pet" } },
                    next: { type: "string", format: "uri", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createPet",
        tags: ["pets"],
        summary: "Create a pet",
        requestBody: {
          required: true,
          description: "Pet to add to the store",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NewPet" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/pets/{petId}": {
      parameters: [
        {
          name: "petId",
          in: "path",
          required: true,
          description: "Pet identifier",
          schema: { type: "string" },
        },
      ],
      get: {
        operationId: "getPet",
        tags: ["pets"],
        summary: "Get a pet by id",
        responses: {
          "200": {
            description: "The pet",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      patch: {
        operationId: "updatePet",
        tags: ["pets"],
        summary: "Update a pet",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NewPet" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated pet",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
        },
      },
      delete: {
        operationId: "deletePet",
        tags: ["pets"],
        summary: "Delete a pet",
        responses: {
          "204": { description: "Deleted" },
        },
      },
    },
    "/orders": {
      post: {
        operationId: "placeOrder",
        tags: ["store"],
        summary: "Place an order",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["petId", "quantity"],
                properties: {
                  petId: { type: "string" },
                  quantity: { type: "integer", minimum: 1 },
                  shipDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Order placed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    status: { type: "string", enum: ["placed", "approved", "delivered"] },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          tag: { type: "string" },
        },
      },
      NewPet: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          tag: { type: "string" },
        },
      },
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "integer" },
          message: { type: "string" },
        },
      },
    },
  },
};

export const cloneSpec = <T>(value: T): T => structuredClone(value);

export const isHttpMethod = (value: string): value is HttpMethod =>
  (HTTP_METHODS as readonly string[]).includes(value);

export const isRef = (value: unknown): value is { $ref: string } =>
  Boolean(value && typeof value === "object" && "$ref" in value && typeof (value as { $ref: unknown }).$ref === "string");

export const parseComponentRef = (ref: string) => {
  const match = ref.match(/^#\/components\/(schemas|parameters|requestBodies|responses)\/(.+)$/);
  if (!match) return null;
  return { group: match[1] as "schemas" | "parameters" | "requestBodies" | "responses", name: decodeURIComponent(match[2]) };
};

export const componentRef = (group: string, name: string) =>
  `#/components/${group}/${encodeURIComponent(name)}`;

export const resolveRef = <T>(spec: OpenAPIDoc, value: T | { $ref: string } | undefined): T | undefined => {
  if (!value) return undefined;
  if (!isRef(value)) return value as T;
  const parsed = parseComponentRef(value.$ref);
  if (!parsed) return undefined;
  const bag = spec.components?.[parsed.group] as Record<string, T> | undefined;
  return bag?.[parsed.name];
};

export const parseSpec = (text: string): { spec: OpenAPIDoc; format: SpecFormat } => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Document is empty.");

  let parsed: unknown;
  let format: SpecFormat = "json";

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    parsed = JSON.parse(trimmed);
    format = "json";
  } else {
    parsed = yamlLoad(trimmed);
    format = "yaml";
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OpenAPI document must be an object.");
  }

  const spec = parsed as OpenAPIDoc;
  if (!spec.openapi || typeof spec.openapi !== "string") {
    throw new Error("Missing openapi version. This editor supports OpenAPI 3.0+.");
  }
  if (!spec.openapi.startsWith("3.")) {
    throw new Error(`Unsupported OpenAPI version "${spec.openapi}". Use 3.0 or 3.1.`);
  }
  if (!spec.info || typeof spec.info !== "object") {
    throw new Error("Missing info object.");
  }

  spec.paths ??= {};
  spec.components ??= {};
  spec.components.schemas ??= {};
  return { spec, format };
};

export const serializeSpec = (spec: OpenAPIDoc, format: SpecFormat) => {
  if (format === "yaml") {
    return yamlDump(spec, { lineWidth: 120, noRefs: true });
  }
  return JSON.stringify(spec, null, 2);
};

export const listOperations = (spec: OpenAPIDoc): OperationRef[] => {
  const ops: OperationRef[] = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation || typeof operation !== "object") continue;
      const op = operation as OperationObject;
      ops.push({
        id: `${method}:${path}`,
        path,
        method,
        summary: op.summary || op.operationId || path,
        description: op.description,
        operationId: op.operationId,
        tags: op.tags?.length ? op.tags : ["untagged"],
        deprecated: op.deprecated,
      });
    }
  }
  return sortOperationsByOrder(spec, ops);
};

const OPERATION_ORDER_KEY = "x-devkit-operation-order";
const TAG_ORDER_KEY = "x-devkit-tag-order";

export const getOperationOrder = (spec: OpenAPIDoc): string[] => {
  const stored = spec[OPERATION_ORDER_KEY];
  const ids = new Set<string>();
  const all: string[] = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    for (const method of HTTP_METHODS) {
      if (!item[method]) continue;
      const id = `${method}:${path}`;
      if (!ids.has(id)) {
        ids.add(id);
        all.push(id);
      }
    }
  }
  if (!Array.isArray(stored)) return all;
  const ordered = stored.filter((id): id is string => typeof id === "string" && ids.has(id));
  for (const id of all) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
};

export const setOperationOrder = (spec: OpenAPIDoc, order: string[]): OpenAPIDoc => {
  const next = cloneSpec(spec);
  next[OPERATION_ORDER_KEY] = order;
  return next;
};

export const getTagOrder = (spec: OpenAPIDoc, tags: string[]): string[] => {
  const stored = spec[TAG_ORDER_KEY];
  if (!Array.isArray(stored)) return tags;
  const ordered = stored.filter((tag): tag is string => typeof tag === "string" && tags.includes(tag));
  for (const tag of tags) {
    if (!ordered.includes(tag)) ordered.push(tag);
  }
  return ordered;
};

export const setTagOrder = (spec: OpenAPIDoc, order: string[]): OpenAPIDoc => {
  const next = cloneSpec(spec);
  next[TAG_ORDER_KEY] = order;
  return next;
};

export const sortOperationsByOrder = (spec: OpenAPIDoc, ops: OperationRef[]): OperationRef[] => {
  const order = getOperationOrder(spec);
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...ops].sort((a, b) => {
    const diff = (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999);
    if (diff !== 0) return diff;
    return a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
  });
};

export const reorderOperation = (
  spec: OpenAPIDoc,
  draggedId: string,
  targetId: string,
  position: "before" | "after",
): OpenAPIDoc => {
  const order = getOperationOrder(spec);
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return spec;
  const next = [...order];
  const [item] = next.splice(from, 1);
  const insertAt = position === "before" ? to : to + 1;
  const adjusted = from < insertAt ? insertAt - 1 : insertAt;
  next.splice(adjusted, 0, item);
  return setOperationOrder(spec, next);
};

export const PARAM_IN_ORDER: Record<ParameterObject["in"], number> = {
  path: 0,
  query: 1,
  header: 2,
  cookie: 3,
};

export const sortParametersByIn = (params: ParameterObject[]): ParameterObject[] =>
  [...params].sort((a, b) => {
    const diff = PARAM_IN_ORDER[a.in] - PARAM_IN_ORDER[b.in];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

export const getPathItem = (spec: OpenAPIDoc, path: string): PathItemObject => {
  spec.paths ??= {};
  spec.paths[path] ??= {};
  return spec.paths[path];
};

export const getOperation = (spec: OpenAPIDoc, path: string, method: HttpMethod): OperationObject | undefined => {
  const item = spec.paths?.[path];
  const value = item?.[method];
  if (!value || typeof value !== "object") return undefined;
  return value as OperationObject;
};

export const updatePathItem = (
  spec: OpenAPIDoc,
  path: string,
  updater: (item: PathItemObject) => PathItemObject,
): OpenAPIDoc => {
  const next = cloneSpec(spec);
  next.paths ??= {};
  next.paths[path] = updater(cloneSpec(next.paths[path] ?? {}));
  return next;
};

export const updateOperation = (
  spec: OpenAPIDoc,
  path: string,
  method: HttpMethod,
  updater: (operation: OperationObject) => OperationObject,
): OpenAPIDoc => {
  return updatePathItem(spec, path, (item) => {
    const current = (item[method] as OperationObject | undefined) ?? { responses: { "200": { description: "OK" } } };
    item[method] = updater(cloneSpec(current));
    return item;
  });
};

export const addOperation = (spec: OpenAPIDoc, path: string, method: HttpMethod): OpenAPIDoc => {
  const next = cloneSpec(spec);
  next.paths ??= {};
  const item = next.paths[path] ?? {};
  if (item[method]) return next;
  item[method] = {
    summary: `${method.toUpperCase()} ${path}`,
    operationId: `${method}${path.replace(/[{}/]/g, "_").replace(/_+/g, "_")}`.replace(/_$/, ""),
    responses: { "200": { description: "OK" } },
  } satisfies OperationObject;
  next.paths[path] = item;
  return next;
};

export const duplicateOperation = (
  spec: OpenAPIDoc,
  path: string,
  method: HttpMethod,
): { spec: OpenAPIDoc; path: string; method: HttpMethod } => {
  const source = getOperation(spec, path, method);
  const pathItem = spec.paths?.[path];
  if (!source || !pathItem) return { spec, path, method };

  let nextPath = `${path.replace(/\/$/, "")}-copy`;
  let n = 2;
  while (getOperation(spec, nextPath, method) || spec.paths?.[nextPath]?.[method]) {
    nextPath = `${path.replace(/\/$/, "")}-copy-${n++}`;
  }

  let next = cloneSpec(spec);
  next.paths ??= {};
  const copied: OperationObject = cloneSpec(source);
  if (copied.operationId) copied.operationId = `${copied.operationId}Copy`;
  if (copied.summary) copied.summary = `${copied.summary} (copy)`;
  const dest = next.paths[nextPath] ?? {};
  dest[method] = copied;
  if (pathItem.parameters?.length && !dest.parameters?.length) {
    dest.parameters = cloneSpec(pathItem.parameters);
  }
  next.paths[nextPath] = dest;

  const order = getOperationOrder(next);
  const newId = `${method}:${nextPath}`;
  const fromId = `${method}:${path}`;
  const insertAt = order.indexOf(fromId);
  const without = order.filter((id) => id !== newId);
  if (insertAt >= 0) without.splice(insertAt + 1, 0, newId);
  else without.push(newId);
  next = setOperationOrder(next, without);
  return { spec: next, path: nextPath, method };
};

export type ParameterSuggestion = {
  key: string;
  name: string;
  in: ParameterObject["in"];
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
  usedIn: string[];
};

export const collectParameterCatalog = (spec: OpenAPIDoc): ParameterSuggestion[] => {
  const map = new Map<string, ParameterSuggestion>();
  const add = (param: ParameterObject, loc: string) => {
    const resolved = resolveRef<ParameterObject>(spec, param) ?? param;
    if (!resolved?.name || !resolved.in) return;
    const key = `${resolved.in}:${resolved.name}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.usedIn.includes(loc)) existing.usedIn.push(loc);
      return;
    }
    map.set(key, {
      key,
      name: resolved.name,
      in: resolved.in,
      description: resolved.description,
      required: resolved.required,
      schema: resolved.schema ? cloneSpec(resolved.schema) : { type: "string" },
      usedIn: [loc],
    });
  };

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    for (const param of item.parameters ?? []) add(param, path);
    for (const method of HTTP_METHODS) {
      const operation = item[method] as OperationObject | undefined;
      if (!operation) continue;
      const loc = `${method.toUpperCase()} ${path}`;
      for (const param of operation.parameters ?? []) add(param, loc);
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.in.localeCompare(b.in));
};

export const collectPathCatalog = (spec: OpenAPIDoc): string[] =>
  Object.keys(spec.paths ?? {}).sort((a, b) => a.localeCompare(b));

export type FieldSuggestion = {
  key: string;
  name: string;
  kind: "property" | "parameter" | "schema" | "path";
  in?: ParameterObject["in"];
  type?: string;
  format?: string;
  description?: string;
  schema?: SchemaObject;
  usedIn: string[];
};

const PLACEHOLDER_NAMES = new Set(["", "param", "id", "field", "name", "body"]);

const mergeField = (map: Map<string, FieldSuggestion>, item: FieldSuggestion) => {
  const existing = map.get(item.key);
  if (existing) {
    for (const loc of item.usedIn) {
      if (!existing.usedIn.includes(loc)) existing.usedIn.push(loc);
    }
    if (!existing.schema && item.schema) existing.schema = item.schema;
    if (!existing.description && item.description) existing.description = item.description;
    if (!existing.type && item.type) existing.type = item.type;
    if (!existing.format && item.format) existing.format = item.format;
    return;
  }
  map.set(item.key, item);
};

export const collectFieldCatalog = (spec: OpenAPIDoc): FieldSuggestion[] => {
  const map = new Map<string, FieldSuggestion>();

  const walkSchema = (schema: SchemaObject | undefined, loc: string, seen: Set<string>) => {
    if (!schema) return;
    if (schema.$ref) {
      const parsed = parseComponentRef(schema.$ref);
      if (parsed?.group === "schemas") {
        mergeField(map, {
          key: `schema:${parsed.name}`,
          name: parsed.name,
          kind: "schema",
          schema: spec.components?.schemas?.[parsed.name],
          usedIn: [loc],
        });
        if (!seen.has(parsed.name)) {
          seen.add(parsed.name);
          walkSchema(spec.components?.schemas?.[parsed.name], `schema ${parsed.name}`, seen);
        }
      }
      return;
    }
    for (const [name, child] of Object.entries(schema.properties ?? {})) {
      mergeField(map, {
        key: `property:${name}`,
        name,
        kind: "property",
        type: schemaType(child),
        format: typeof child.format === "string" ? child.format : undefined,
        description: child.description,
        schema: cloneSpec(child),
        usedIn: [loc],
      });
      walkSchema(child, `${loc}.${name}`, new Set(seen));
    }
    if (schema.items) walkSchema(schema.items, `${loc}[]`, seen);
  };

  for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
    mergeField(map, {
      key: `schema:${name}`,
      name,
      kind: "schema",
      schema: cloneSpec(schema),
      usedIn: ["components"],
    });
    walkSchema(schema, name, new Set([name]));
  }

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    mergeField(map, { key: `path:${path}`, name: path, kind: "path", usedIn: [path] });
    for (const match of path.matchAll(/\{([^}]+)\}/g)) {
      mergeField(map, {
        key: `parameter:path:${match[1]}`,
        name: match[1],
        kind: "parameter",
        in: "path",
        type: "string",
        schema: { type: "string" },
        usedIn: [path],
      });
    }
    const addParam = (param: ParameterObject, loc: string) => {
      const resolved = resolveRef<ParameterObject>(spec, param) ?? param;
      if (!resolved?.name) return;
      mergeField(map, {
        key: `parameter:${resolved.in}:${resolved.name}`,
        name: resolved.name,
        kind: "parameter",
        in: resolved.in,
        type: schemaType(resolved.schema),
        format: resolved.schema?.format,
        description: resolved.description,
        schema: resolved.schema ? cloneSpec(resolved.schema) : { type: "string" },
        usedIn: [loc],
      });
      walkSchema(resolved.schema, loc, new Set());
    };
    for (const param of item.parameters ?? []) addParam(param, path);
    for (const method of HTTP_METHODS) {
      const operation = item[method] as OperationObject | undefined;
      if (!operation) continue;
      const loc = `${method.toUpperCase()} ${path}`;
      for (const param of operation.parameters ?? []) addParam(param, loc);
      const body = resolveRef<RequestBodyObject>(spec, operation.requestBody);
      for (const media of Object.values(body?.content ?? {})) walkSchema(media.schema, `${loc} body`, new Set());
      for (const response of Object.values(operation.responses ?? {})) {
        const resolved = resolveRef<ResponseObject>(spec, response);
        for (const media of Object.values(resolved?.content ?? {})) walkSchema(media.schema, `${loc} response`, new Set());
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
};

export const filterFieldCatalog = (
  items: FieldSuggestion[],
  query: string,
  options?: { kinds?: FieldSuggestion["kind"][]; excludeNames?: Set<string> },
): FieldSuggestion[] => {
  const q = query.trim().toLowerCase();
  const placeholder = PLACEHOLDER_NAMES.has(q);
  return items
    .filter((item) => {
      if (options?.kinds && !options.kinds.includes(item.kind)) return false;
      if (options?.excludeNames?.has(item.name.toLowerCase()) && item.name.toLowerCase() !== q) return false;
      if (placeholder) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.usedIn.some((loc) => loc.toLowerCase().includes(q)) ||
        (item.description ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, 16);
};

export const fieldToSchema = (item: FieldSuggestion): SchemaObject => {
  if (item.kind === "schema") return { $ref: componentRef("schemas", item.name) };
  if (item.schema) return cloneSpec(item.schema);
  const next: SchemaObject = { type: item.type || "string" };
  if (item.format) next.format = item.format;
  if (item.description) next.description = item.description;
  return next;
};

export const removeOperation = (spec: OpenAPIDoc, path: string, method: HttpMethod): OpenAPIDoc => {
  const next = cloneSpec(spec);
  const item = next.paths?.[path];
  if (!item) return next;
  delete item[method];
  const remaining = HTTP_METHODS.some((m) => item[m]);
  const extras = Object.keys(item).filter((k) => !isHttpMethod(k) && k !== "parameters" && k !== "summary" && k !== "description");
  if (!remaining && extras.length === 0 && !item.parameters?.length) {
    delete next.paths![path];
  }
  return next;
};

export const schemaType = (schema?: SchemaObject): string => {
  if (!schema) return "object";
  if (schema.$ref) return "$ref";
  if (Array.isArray(schema.type)) return schema.type[0] || "object";
  if (schema.type) return String(schema.type);
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.oneOf) return "oneOf";
  if (schema.anyOf) return "anyOf";
  return "object";
};

export const collectSchemaNames = (spec: OpenAPIDoc): string[] =>
  Object.keys(spec.components?.schemas ?? {}).sort((a, b) => a.localeCompare(b));

const walkSchemaRefs = (
  spec: OpenAPIDoc,
  schema: SchemaObject | undefined,
  acc: Set<string>,
  deep: boolean,
  seen = new Set<string>(),
) => {
  if (!schema) return;
  if (schema.$ref) {
    const parsed = parseComponentRef(schema.$ref);
    if (parsed?.group === "schemas" && !seen.has(parsed.name)) {
      seen.add(parsed.name);
      acc.add(parsed.name);
      if (deep) {
        walkSchemaRefs(spec, spec.components?.schemas?.[parsed.name], acc, deep, seen);
      }
    }
    return;
  }
  if (schema.items) walkSchemaRefs(spec, schema.items, acc, deep, seen);
  if (schema.properties) {
    for (const child of Object.values(schema.properties)) walkSchemaRefs(spec, child, acc, deep, seen);
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    walkSchemaRefs(spec, schema.additionalProperties, acc, deep, seen);
  }
  for (const union of [schema.oneOf, schema.anyOf, schema.allOf]) {
    union?.forEach((child) => walkSchemaRefs(spec, child, acc, deep, seen));
  }
};

/** Schemas directly referenced from this operation (body, params, responses). */
export const collectDirectOperationSchemaNames = (
  spec: OpenAPIDoc,
  path: string,
  method: HttpMethod,
): string[] => {
  const names = new Set<string>();
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!operation) return [];

  const params = [...(pathItem?.parameters ?? []), ...(operation.parameters ?? [])];
  for (const param of params) {
    const resolved = resolveRef<ParameterObject>(spec, param);
    walkSchemaRefs(spec, resolved?.schema, names, false);
  }

  const body = resolveRef<RequestBodyObject>(spec, operation.requestBody);
  for (const media of Object.values(body?.content ?? {})) {
    walkSchemaRefs(spec, media.schema, names, false);
  }

  for (const response of Object.values(operation.responses ?? {})) {
    const resolved = resolveRef<ResponseObject>(spec, response);
    for (const media of Object.values(resolved?.content ?? {})) {
      walkSchemaRefs(spec, media.schema, names, false);
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
};

/** Schemas referenced by this operation, including nested $refs inside linked models. */
export const collectOperationSchemaNames = (
  spec: OpenAPIDoc,
  path: string,
  method: HttpMethod,
): string[] => {
  const names = new Set<string>();
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!operation) return [];

  const params = [...(pathItem?.parameters ?? []), ...(operation.parameters ?? [])];
  for (const param of params) {
    const resolved = resolveRef<ParameterObject>(spec, param);
    walkSchemaRefs(spec, resolved?.schema, names, true);
  }

  const body = resolveRef<RequestBodyObject>(spec, operation.requestBody);
  for (const media of Object.values(body?.content ?? {})) {
    walkSchemaRefs(spec, media.schema, names, true);
  }

  for (const response of Object.values(operation.responses ?? {})) {
    const resolved = resolveRef<ResponseObject>(spec, response);
    for (const media of Object.values(resolved?.content ?? {})) {
      walkSchemaRefs(spec, media.schema, names, true);
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
};

export const upsertComponentSchema = (spec: OpenAPIDoc, name: string, schema: SchemaObject): OpenAPIDoc => {
  const next = cloneSpec(spec);
  next.components ??= {};
  next.components.schemas ??= {};
  next.components.schemas[name] = schema;
  return next;
};

export const renameComponentSchema = (spec: OpenAPIDoc, from: string, to: string): OpenAPIDoc => {
  if (!from || !to || from === to) return spec;
  const next = cloneSpec(spec);
  next.components ??= {};
  next.components.schemas ??= {};
  if (!next.components.schemas[from] || next.components.schemas[to]) return spec;
  next.components.schemas[to] = next.components.schemas[from];
  delete next.components.schemas[from];

  const rewrite = (node: unknown): unknown => {
    if (!node || typeof node !== "object") return node;
    if (isRef(node) && node.$ref === componentRef("schemas", from)) {
      return { ...node, $ref: componentRef("schemas", to) };
    }
    if (Array.isArray(node)) return node.map(rewrite);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) out[key] = rewrite(value);
    return out;
  };

  return rewrite(next) as OpenAPIDoc;
};

export const emptySchemaForType = (type: string): SchemaObject => {
  if (type === "array") return { type: "array", items: { type: "string" } };
  if (type === "object") return { type: "object", properties: {}, required: [] };
  if (type === "$ref") return { $ref: "" };
  return { type };
};

export const uniqueName = (existing: Iterable<string>, base: string): string => {
  const used = new Set([...existing].map((name) => name.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  let index = 2;
  while (used.has(`${base}${index}`.toLowerCase())) index += 1;
  return `${base}${index}`;
};

export const sharedPathPrefix = (paths: string[]): string => {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length < 2) return "";
  let prefix = unique[0];
  for (const path of unique.slice(1)) {
    let index = 0;
    const limit = Math.min(prefix.length, path.length);
    while (index < limit && prefix[index] === path[index]) index += 1;
    prefix = prefix.slice(0, index);
  }
  const lastSlash = prefix.lastIndexOf("/");
  if (lastSlash <= 0) return "";
  prefix = prefix.slice(0, lastSlash);
  const hasRemainder = unique.every((path) => path.length > prefix.length + 1);
  if (!hasRemainder) {
    const previous = prefix.lastIndexOf("/");
    if (previous <= 0) return "";
    prefix = prefix.slice(0, previous);
  }
  return prefix;
};

export const displayPath = (path: string, prefix: string): string => {
  if (!prefix) return path;
  if (path === prefix) return "/";
  if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || "/";
  if (path.startsWith(prefix)) {
    const rest = path.slice(prefix.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return path;
};

export const inferSchemaFromJson = (value: unknown): SchemaObject => {
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length ? inferSchemaFromJson(value[0]) : { type: "string" },
    };
  }
  if (value !== null && typeof value === "object") {
    const properties: Record<string, SchemaObject> = {};
    const required: string[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      properties[key] = inferSchemaFromJson(child);
      if (child !== null && child !== undefined) required.push(key);
    }
    return { type: "object", properties, required };
  }
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
  if (value === null) return { type: "string", nullable: true };
  return { type: "string" };
};

export const COMMON_MEDIA_TYPES = [
  "application/json",
  "application/xml",
  "multipart/form-data",
  "application/x-www-form-urlencoded",
  "text/plain",
  "application/octet-stream",
] as const;

export const contentTypes = (content?: Record<string, unknown>) => Object.keys(content ?? {});

export const firstContentType = (content?: Record<string, unknown>) =>
  contentTypes(content)[0] || "application/json";

const PRIMITIVE_EXAMPLES: Record<string, unknown> = {
  string: "string",
  integer: 0,
  number: 0,
  boolean: true,
};

export const generateExampleFromSchema = (
  spec: OpenAPIDoc,
  schema: SchemaObject | undefined,
  seen = new Set<string>(),
): unknown => {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.$ref) {
    const parsed = parseComponentRef(schema.$ref);
    if (!parsed || parsed.group !== "schemas") return {};
    if (seen.has(parsed.name)) return {};
    seen.add(parsed.name);
    const resolved = spec.components?.schemas?.[parsed.name];
    return generateExampleFromSchema(spec, resolved, seen);
  }
  if (schema.enum?.length) return schema.enum[0];
  const type = schemaType(schema);
  if (type === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      out[key] = generateExampleFromSchema(spec, child, seen);
    }
    return out;
  }
  if (type === "array") {
    const item = generateExampleFromSchema(spec, schema.items, seen);
    return item === null || item === undefined ? [] : [item];
  }
  if (type === "oneOf" || type === "anyOf") {
    const first = schema.oneOf?.[0] ?? schema.anyOf?.[0];
    return generateExampleFromSchema(spec, first, seen);
  }
  return PRIMITIVE_EXAMPLES[type] ?? null;
};

type ComponentGroup = "schemas" | "parameters" | "requestBodies" | "responses";

const componentWriteKey = (group: ComponentGroup, name: string) => `${group}:${name}`;

const lookupComponent = (
  spec: OpenAPIDoc,
  writes: Map<string, unknown>,
  group: ComponentGroup,
  name: string,
) => {
  const key = componentWriteKey(group, name);
  if (writes.has(key)) return writes.get(key);
  return spec.components?.[group]?.[name];
};

const reattachRefs = (
  previous: unknown,
  incoming: unknown,
  spec: OpenAPIDoc,
  writes: Map<string, unknown>,
  skipWrites: Set<string>,
): unknown => {
  if (!incoming || typeof incoming !== "object") return incoming;
  if (!previous || typeof previous !== "object") return incoming;

  if (Array.isArray(incoming)) {
    if (!Array.isArray(previous)) return incoming;
    return incoming.map((item, index) => reattachRefs(previous[index], item, spec, writes, skipWrites));
  }

  const prevObj = previous as Record<string, unknown>;
  const nextObj = incoming as Record<string, unknown>;

  if (typeof prevObj.$ref === "string" && typeof nextObj.$ref !== "string") {
    const parsed = parseComponentRef(prevObj.$ref);
    if (parsed) {
      const key = componentWriteKey(parsed.group, parsed.name);
      const existing = lookupComponent(spec, writes, parsed.group, parsed.name);
      const merged = reattachRefs(existing, nextObj, spec, writes, skipWrites);
      if (!skipWrites.has(key)) writes.set(key, merged);
      return { $ref: prevObj.$ref };
    }
  }

  const out: Record<string, unknown> = { ...nextObj };
  for (const [key, child] of Object.entries(nextObj)) {
    if (key in prevObj) {
      out[key] = reattachRefs(prevObj[key], child, spec, writes, skipWrites);
    }
  }
  return out;
};

const applyComponentWrites = (spec: OpenAPIDoc, writes: Map<string, unknown>): OpenAPIDoc => {
  if (writes.size === 0) return spec;
  const next = cloneSpec(spec);
  next.components ??= {};
  for (const [key, value] of writes) {
    const [group, ...nameParts] = key.split(":");
    const name = nameParts.join(":");
    const bag = group as ComponentGroup;
    next.components[bag] ??= {};
    (next.components[bag] as Record<string, unknown>)[name] = value as never;
  }
  return next;
};

export const buildOperationView = (spec: OpenAPIDoc, path: string, method: HttpMethod) => {
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!pathItem || !operation) return {};

  const pathEntry: PathItemObject = {};
  if (pathItem.parameters?.length) pathEntry.parameters = cloneSpec(pathItem.parameters);
  pathEntry[method] = cloneSpec(operation);

  const schemaNames = collectDirectOperationSchemaNames(spec, path, method);
  const view: Record<string, unknown> = { [path]: pathEntry };
  if (schemaNames.length) {
    const schemas: Record<string, SchemaObject> = {};
    for (const name of schemaNames) {
      const schema = spec.components?.schemas?.[name];
      if (schema) schemas[name] = cloneSpec(schema);
    }
    view.components = { schemas };
  }
  return view;
};

export const serializeOperationView = (spec: OpenAPIDoc, path: string, method: HttpMethod, format: SpecFormat) => {
  const view = buildOperationView(spec, path, method);
  if (format === "yaml") return yamlDump(view, { lineWidth: 100, noRefs: true });
  return JSON.stringify(view, null, 2);
};

export const mergeOperationView = (
  spec: OpenAPIDoc,
  path: string,
  method: HttpMethod,
  text: string,
  format: SpecFormat,
): OpenAPIDoc => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Snippet is empty.");

  const parsed =
    format === "yaml"
      ? (yamlLoad(trimmed) as Record<string, unknown>)
      : (JSON.parse(trimmed) as Record<string, unknown>);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Snippet must be an object.");
  }

  const pathKey = Object.keys(parsed).find((key) => key.startsWith("/")) ?? path;
  const pathItem = parsed[pathKey] as PathItemObject | undefined;
  if (!pathItem || typeof pathItem !== "object") {
    throw new Error(`Missing path entry "${pathKey}".`);
  }

  const operation = pathItem[method] as OperationObject | undefined;
  if (!operation || typeof operation !== "object") {
    throw new Error(`Missing ${method.toUpperCase()} operation under "${pathKey}".`);
  }

  const writes = new Map<string, unknown>();
  const incomingSchemas = parsed.components as { schemas?: Record<string, SchemaObject> } | undefined;
  const skipWrites = new Set<string>();
  if (incomingSchemas?.schemas) {
    for (const name of Object.keys(incomingSchemas.schemas)) {
      skipWrites.add(componentWriteKey("schemas", name));
    }
    for (const [name, schema] of Object.entries(incomingSchemas.schemas)) {
      const existing = spec.components?.schemas?.[name];
      writes.set(
        componentWriteKey("schemas", name),
        reattachRefs(existing, schema, spec, writes, skipWrites),
      );
    }
  }

  const previousPath = spec.paths?.[pathKey] ?? spec.paths?.[path];
  const previousOp = getOperation(spec, pathKey, method) ?? getOperation(spec, path, method);
  const { parameters, ...operationRest } = pathItem;
  void operationRest;

  const nextParameters = parameters
    ? (reattachRefs(previousPath?.parameters, cloneSpec(parameters), spec, writes, skipWrites) as ParameterObject[])
    : undefined;
  const nextOperation = reattachRefs(previousOp, cloneSpec(operation), spec, writes, skipWrites) as OperationObject;

  let next = applyComponentWrites(spec, writes);
  if (nextParameters) {
    next = updatePathItem(next, pathKey, (item) => ({ ...item, parameters: nextParameters }));
  }
  next = updateOperation(next, pathKey, method, () => nextOperation);
  return next;
};
