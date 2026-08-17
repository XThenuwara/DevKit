export const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type SchemaObject = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  title?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  enum?: unknown[];
  example?: unknown;
  nullable?: boolean;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  [key: string]: unknown;
};

export type ParameterObject = {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject;
  $ref?: string;
  [key: string]: unknown;
};

export type MediaTypeObject = {
  schema?: SchemaObject;
  example?: unknown;
  [key: string]: unknown;
};

export type RequestBodyObject = {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
  $ref?: string;
  [key: string]: unknown;
};

export type ResponseObject = {
  description?: string;
  headers?: Record<string, unknown>;
  content?: Record<string, MediaTypeObject>;
  $ref?: string;
  [key: string]: unknown;
};

export type OperationObject = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  [key: string]: unknown;
};

export type PathItemObject = {
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  [method: string]: unknown;
};

export type OpenAPIDoc = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    [key: string]: unknown;
  };
  servers?: { url: string; description?: string; [key: string]: unknown }[];
  tags?: { name: string; description?: string }[];
  paths?: Record<string, PathItemObject>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    parameters?: Record<string, ParameterObject>;
    requestBodies?: Record<string, RequestBodyObject>;
    responses?: Record<string, ResponseObject>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type OperationRef = {
  id: string;
  path: string;
  method: HttpMethod;
  summary: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated?: boolean;
};

export type SpecFormat = "json" | "yaml";
