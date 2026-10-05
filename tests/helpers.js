import { beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.js";
import { prisma } from "../src/config/database.js";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (process.env.NODE_ENV !== "test" || databaseName !== "users_api_test") {
  throw new Error(
    "Integration tests require NODE_ENV=test and the dedicated users_api_test database.",
  );
}

beforeAll(async () => {
  await prisma.$connect();
});
beforeEach(async () => {
  await prisma.refreshSession.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

export const api = request(app);
export const register = async (overrides = {}) =>
  api.post("/api/users").send({
    name: "Pessoa de Teste",
    email: `user-${randomUUID()}@example.com`,
    password: "SenhaSegura#2026",
    ...overrides,
  });
export const authenticate = async (overrides = {}) => {
  const created = await register(overrides);
  const login = await api.post("/api/auth/login").send({
    email: created.body.data.email,
    password: overrides.password ?? "SenhaSegura#2026",
  });
  return { user: created.body.data, ...login.body.data };
};
