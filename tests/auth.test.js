import { describe, expect, test } from "@jest/globals";
import { createHash } from "node:crypto";
import { api, authenticate, register } from "./helpers.js";
import { prisma } from "../src/config/database.js";

describe("Authentication API (PostgreSQL integration)", () => {
  test("logs in with valid credentials and rejects invalid credentials", async () => {
    const created = await register();
    const valid = await api
      .post("/api/auth/login")
      .send({ email: created.body.data.email, password: "SenhaSegura#2026" });
    expect(valid.status).toBe(200);
    expect(valid.body.data.accessToken).toBeTruthy();
    expect(valid.body.data.refreshToken).toBeTruthy();
    expect(
      (
        await api
          .post("/api/auth/login")
          .send({ email: created.body.data.email, password: "incorrect" })
      ).status,
    ).toBe(401);
  });

  test("rotates and revokes refresh tokens; reused tokens fail", async () => {
    const session = await authenticate();
    const next = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken });
    expect(next.status).toBe(200);
    expect(next.body.data.refreshToken).not.toBe(session.refreshToken);
    expect(
      (
        await api
          .post("/api/auth/refresh")
          .send({ refreshToken: session.refreshToken })
      ).status,
    ).toBe(401);
    // Replay of a rotated token revokes the user's currently active refresh sessions.
    expect(
      (
        await api
          .post("/api/auth/refresh")
          .send({ refreshToken: next.body.data.refreshToken })
      ).status,
    ).toBe(401);
  });

  test("logout revokes the refresh token", async () => {
    const session = await authenticate();
    expect(
      (
        await api
          .post("/api/auth/logout")
          .send({ refreshToken: session.refreshToken })
      ).status,
    ).toBe(204);
    expect(
      (
        await api
          .post("/api/auth/refresh")
          .send({ refreshToken: session.refreshToken })
      ).status,
    ).toBe(401);
  });

  test("rejects expired refresh tokens stored in PostgreSQL", async () => {
    const created = await register();
    const refreshToken =
      "expired-refresh-token-that-is-long-enough-to-pass-validation-000001";
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    await prisma.refreshSession.create({
      data: {
        tokenHash,
        userId: created.body.data.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    expect(
      (await api.post("/api/auth/refresh").send({ refreshToken })).status,
    ).toBe(401);
  });

  test("rejects malformed, invalid, and expired access tokens", async () => {
    const actor = await authenticate();
    expect(
      (
        await api
          .get(`/api/users/${actor.user.id}`)
          .set("Authorization", "Bearer broken.token.value")
      ).status,
    ).toBe(401);
    const { default: jwt } = await import("jsonwebtoken");
    const { env } = await import("../src/config/env.js");
    const expired = jwt.sign(
      { sub: actor.user.id, iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE },
      env.JWT_ACCESS_SECRET,
      { algorithm: "HS256", expiresIn: -1 },
    );
    expect(
      (
        await api
          .get(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${expired}`)
      ).status,
    ).toBe(401);
    const wrongAlgorithm = jwt.sign(
      { sub: actor.user.id, iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE },
      env.JWT_ACCESS_SECRET,
      { algorithm: "HS384" },
    );
    expect(
      (
        await api
          .get(`/api/users/${actor.user.id}`)
          .set("Authorization", `Bearer ${wrongAlgorithm}`)
      ).status,
    ).toBe(401);
  });
});
