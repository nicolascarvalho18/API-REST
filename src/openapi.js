export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Users REST API",
    version: "1.0.0",
    description: "API segura para gerenciamento autenticado de usuários.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/users": {
      post: {
        summary: "Cadastrar usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", minLength: 3, maxLength: 100 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 12 },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          201: { description: "Criado" },
          409: { description: "E-mail duplicado" },
          422: { description: "Validação falhou" },
        },
      },
    },
    "/users/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        summary: "Consultar o próprio usuário",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Usuário encontrado" },
          401: { description: "Não autenticado" },
          403: { description: "Sem permissão" },
          404: { description: "Não encontrado" },
        },
      },
      put: {
        summary: "Atualizar o próprio usuário",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          200: { description: "Atualizado" },
          409: { description: "E-mail duplicado" },
        },
      },
      delete: {
        summary: "Excluir o próprio usuário",
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: "Excluído" },
          401: { description: "Não autenticado" },
          403: { description: "Sem permissão" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Autenticar usuário",
        responses: {
          200: { description: "Tokens emitidos" },
          401: { description: "Credenciais inválidas" },
          429: { description: "Limite de tentativas" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Rotacionar refresh token",
        responses: {
          200: { description: "Sessão renovada" },
          401: { description: "Token inválido ou reutilizado" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revogar refresh token",
        responses: { 204: { description: "Sessão revogada" } },
      },
    },
  },
};

const tokenPair = {
  type: "object",
  required: ["accessToken", "refreshToken", "tokenType"],
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    tokenType: { type: "string", enum: ["Bearer"] },
  },
};

const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "array", items: { type: "object" } },
      },
    },
  },
};

const errorResponse = (description) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
});

const jsonRequest = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
});
const successResponse = (description, schema) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["data"],
        properties: { data: schema },
      },
    },
  },
});

openapi.info.description =
  "API de usuários com autenticação JWT e autorização por proprietário.";
openapi.tags = [
  { name: "Users", description: "Cadastro e manutenção do próprio usuário" },
  { name: "Auth", description: "Autenticação e gestão da sessão" },
];
openapi.components.schemas.TokenPair = tokenPair;
openapi.components.schemas.Error = errorSchema;
openapi.components.schemas.User.required = [
  "id",
  "name",
  "email",
  "createdAt",
  "updatedAt",
];
openapi.components.schemas.User.properties.name.minLength = 3;
openapi.components.schemas.User.properties.name.maxLength = 100;
openapi.components.schemas.User.properties.email.maxLength = 254;

const loginResponseSchema = {
  ...tokenPair,
  required: [...tokenPair.required, "user"],
  properties: {
    ...tokenPair.properties,
    user: { $ref: "#/components/schemas/User" },
  },
};
openapi.paths["/users"].post.responses[201] = successResponse(
  "Usuário criado",
  { $ref: "#/components/schemas/User" },
);
openapi.paths["/users/{id}"].get.responses[200] = successResponse(
  "Usuário encontrado",
  { $ref: "#/components/schemas/User" },
);
openapi.paths["/users/{id}"].put.responses[200] = successResponse(
  "Usuário atualizado",
  { $ref: "#/components/schemas/User" },
);
openapi.paths["/auth/login"].post.responses[200] = successResponse(
  "Autenticação realizada",
  loginResponseSchema,
);
openapi.paths["/auth/refresh"].post.responses[200] = successResponse(
  "Sessão renovada",
  tokenPair,
);

openapi.paths["/auth/login"].post.tags = ["Auth"];
openapi.paths["/auth/login"].post.requestBody = jsonRequest({
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1, maxLength: 128 },
  },
});
openapi.paths["/auth/login"].post.responses[422] =
  errorResponse("Dados inválidos");

for (const path of ["/auth/refresh", "/auth/logout"]) {
  openapi.paths[path].post.tags = ["Auth"];
  openapi.paths[path].post.requestBody = jsonRequest({
    type: "object",
    required: ["refreshToken"],
    additionalProperties: false,
    properties: {
      refreshToken: { type: "string", minLength: 40, maxLength: 200 },
    },
  });
  openapi.paths[path].post.responses[422] = errorResponse("Dados inválidos");
}

openapi.paths["/users"].post.tags = ["Users"];
openapi.paths["/users/{id}"].get.tags = ["Users"];
openapi.paths["/users/{id}"].put.tags = ["Users"];
openapi.paths["/users/{id}"].delete.tags = ["Users"];
