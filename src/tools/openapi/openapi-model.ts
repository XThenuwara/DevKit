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
  return ops.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
};

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

const walkSchemaRefs = (schema: SchemaObject | undefined, acc: Set<string>) => {
  if (!schema) return;
  if (schema.$ref) {
    const parsed = parseComponentRef(schema.$ref);
    if (parsed?.group === "schemas") acc.add(parsed.name);
    return;
  }
  if (schema.items) walkSchemaRefs(schema.items, acc);
  if (schema.properties) {
    for (const child of Object.values(schema.properties)) walkSchemaRefs(child, acc);
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    walkSchemaRefs(schema.additionalProperties, acc);
  }
  for (const union of [schema.oneOf, schema.anyOf, schema.allOf]) {
    union?.forEach((child) => walkSchemaRefs(child, acc));
  }
};

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
    walkSchemaRefs(resolved?.schema, names);
  }

  const body = resolveRef<RequestBodyObject>(spec, operation.requestBody);
  for (const media of Object.values(body?.content ?? {})) {
    walkSchemaRefs(media.schema, names);
  }

  for (const response of Object.values(operation.responses ?? {})) {
    const resolved = resolveRef<ResponseObject>(spec, response);
    for (const media of Object.values(resolved?.content ?? {})) {
      walkSchemaRefs(media.schema, names);
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

export const inlineSchemaRefs = (
  spec: OpenAPIDoc,
  schema: SchemaObject | undefined,
  seen = new Set<string>(),
): SchemaObject | undefined => {
  if (!schema) return undefined;
  if (schema.$ref) {
    const parsed = parseComponentRef(schema.$ref);
    if (!parsed || parsed.group !== "schemas") return schema;
    if (seen.has(parsed.name)) return schema;
    seen.add(parsed.name);
    const resolved = spec.components?.schemas?.[parsed.name];
    if (!resolved) return schema;
    const inlined = inlineSchemaRefs(spec, cloneSpec(resolved), seen);
    return inlined ? { ...inlined, title: inlined.title ?? parsed.name } : schema;
  }
  const next: SchemaObject = { ...schema };
  if (schema.properties) {
    next.properties = {};
    for (const [key, child] of Object.entries(schema.properties)) {
      next.properties[key] = inlineSchemaRefs(spec, child, new Set(seen)) ?? child;
    }
  }
  if (schema.items) next.items = inlineSchemaRefs(spec, schema.items, new Set(seen)) ?? schema.items;
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    next.additionalProperties =
      inlineSchemaRefs(spec, schema.additionalProperties, new Set(seen)) ?? schema.additionalProperties;
  }
  for (const key of ["oneOf", "anyOf", "allOf"] as const) {
    if (schema[key]) {
      next[key] = schema[key]!.map((child) => inlineSchemaRefs(spec, child, new Set(seen)) ?? child);
    }
  }
  return next;
};

const inlineValueRefs = (spec: OpenAPIDoc, value: unknown, seen = new Set<string>()): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => inlineValueRefs(spec, item, seen));
  if (isRef(value) && "$ref" in value && !("type" in value)) {
    const parsed = parseComponentRef(value.$ref);
    if (parsed?.group === "schemas") {
      const resolved = spec.components?.schemas?.[parsed.name];
      if (resolved) return inlineSchemaRefs(spec, resolved, seen) ?? value;
    }
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "schema" && child && typeof child === "object") {
      out[key] = inlineSchemaRefs(spec, child as SchemaObject, seen) ?? child;
    } else {
      out[key] = inlineValueRefs(spec, child, seen);
    }
  }
  return out;
};

export const buildOperationView = (spec: OpenAPIDoc, path: string, method: HttpMethod) => {
  const pathItem = spec.paths?.[path];
  const operation = getOperation(spec, path, method);
  if (!pathItem || !operation) return {};

  const pathEntry: PathItemObject = {};
  if (pathItem.parameters?.length) {
    pathEntry.parameters = cloneSpec(pathItem.parameters).map((param) => {
      const resolved = resolveRef<ParameterObject>(spec, param) ?? param;
      return inlineValueRefs(spec, resolved) as ParameterObject;
    });
  }

  const inlinedOp = inlineValueRefs(spec, cloneSpec(operation)) as OperationObject;
  pathEntry[method] = inlinedOp;

  const schemaNames = collectOperationSchemaNames(spec, path, method);
  const view: Record<string, unknown> = { [path]: pathEntry };
  if (schemaNames.length) {
    const schemas: Record<string, SchemaObject> = {};
    for (const name of schemaNames) {
      const schema = spec.components?.schemas?.[name];
      if (schema) schemas[name] = inlineSchemaRefs(spec, cloneSpec(schema)) ?? schema;
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

  let next = cloneSpec(spec);
  const pathKey =
    Object.keys(parsed).find((key) => key.startsWith("/")) ??
    path;
  const pathItem = parsed[pathKey] as PathItemObject | undefined;
  if (!pathItem || typeof pathItem !== "object") {
    throw new Error(`Missing path entry "${pathKey}".`);
  }

  const operation = pathItem[method] as OperationObject | undefined;
  if (!operation || typeof operation !== "object") {
    throw new Error(`Missing ${method.toUpperCase()} operation under "${pathKey}".`);
  }

  const components = parsed.components as { schemas?: Record<string, SchemaObject> } | undefined;
  if (components?.schemas) {
    for (const [name, schema] of Object.entries(components.schemas)) {
      next = upsertComponentSchema(next, name, schema);
    }
  }

  const { parameters, ...operationRest } = pathItem;
  void operationRest;

  next = updatePathItem(next, pathKey, (item) => ({
    ...item,
    ...(parameters ? { parameters: cloneSpec(parameters) } : {}),
  }));

  next = updateOperation(next, pathKey, method, () => cloneSpec(operation));
  return next;
};
