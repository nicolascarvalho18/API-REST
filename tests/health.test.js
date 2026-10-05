import { describe, expect, test } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";

describe("HTTP application", () => {
  test("serves a health check and Swagger UI", async () => {
    expect((await request(app).get("/health")).body.status).toBe("ok");
    const docs = await request(app).get("/api-docs/");
    expect(docs.status).toBe(200);
    expect(docs.text).toContain("swagger-ui");
  });
});
