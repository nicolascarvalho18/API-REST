import { describe, expect, test } from "@jest/globals";
import { prisma } from "../src/config/database.js";
import { api, authenticate, register } from "./helpers.js";

describe("Users API (PostgreSQL integration)", () => {
  test("creates a user, normalizes email, and never returns the password hash", async () => {
    const response = await register({ email: "  Person@Example.COM " });
    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe("person@example.com");
    expect(response.body.data.passwordHash).toBeUndefined();
    const saved = await prisma.user.findUnique({
      where: { id: response.body.data.id },
    });
    expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
    expect(saved.passwordHash).not.toBe("SenhaSegura#2026");
  });

  test("rejects invalid input and unknown fields", async () => {
    const invalid = await register({ name: "Jo", password: "short" });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect((await register({ isAdmin: true })).status).toBe(422);
    const malformedJson = await api
      .post("/api/users")
      .set("Content-Type", "application/json")
      .send('{"name":');
    expect(malformedJson.status).toBe(400);
  });

  test("enforces email uniqueness including database conflicts", async () => {
    const attempts = await Promise.all([
      register({ email: "same@example.com" }),
      register({ email: "SAME@example.com" }),
    ]);
    expect(attempts.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(attempts.find(({ status }) => status === 409).body.error.code).toBe(
      "EMAIL_ALREADY_EXISTS",
    );
  });

  test("requires auth and restricts users to their own records", async () => {
    const first = await authenticate();
    const second = await register();
    expect((await api.get(`/api/users/${first.user.id}`)).status).toBe(401);
    expect(
      (
        await api
          .get(`/api/users/${first.user.id}`)
          .set("Authorization", `Bearer ${first.accessToken}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await api
          .get(`/api/users/${second.body.data.id}`)
          .set("Authorization", `Bearer ${first.accessToken}`)
      ).status,
    ).toBe(403);
  });

  test("returns 404 for a missing user after authorization and validates UUIDs", async () => {
    const actor = await authenticate();
    expect(
      (
        await api
          .get("/api/users/not-a-uuid")
          .set("Authorization", `Bearer ${actor.accessToken}`)
      ).status,
    ).toBe(422);
    expect(
      (
        await api
          .get("/api/users/00000000-0000-4000-8000-000000000000")
          .set("Authorization", `Bearer ${actor.accessToken}`)
      ).status,
    ).toBe(404);
  });

  test("updates only allowed fields and rejects duplicate email", async () => {
    const actor = await authenticate();
    expect(
      (
        await api
          .put(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${actor.accessToken}`)
          .send({ name: "Nome Atualizado" })
      ).body.data.name,
    ).toBe("Nome Atualizado");
    const other = await register({ email: "occupied@example.com" });
    expect(
      (
        await api
          .put(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${actor.accessToken}`)
          .send({ email: other.body.data.email })
      ).status,
    ).toBe(409);
    expect(
      (
        await api
          .put(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${actor.accessToken}`)
          .send({ role: "admin" })
      ).status,
    ).toBe(422);
  });

  test("deletes an owned user with 204 and reports a missing user", async () => {
    const actor = await authenticate();
    expect(
      (
        await api
          .delete(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${actor.accessToken}`)
      ).status,
    ).toBe(204);
    expect(
      (
        await api
          .delete(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${actor.accessToken}`)
      ).status,
    ).toBe(404);
  });
});
