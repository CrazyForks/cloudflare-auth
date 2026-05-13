import { readFile } from "node:fs/promises";

import { createAuthClient, AuthClientError } from "@cf-auth/client";
import {
  createMockEmailAdapter,
  applyD1Migrations,
  createSqliteD1Database,
} from "@cf-auth/testing";
import { defineAuthConfig } from "@cf-auth/worker";
import { createAuthRoutes, getAuthUser, requireUser } from "@cf-auth/hono";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

const authSecret = "k1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const origin = "http://localhost:8787";

describe("Hono adapter and browser client", () => {
  it("mounts at one /auth prefix and protects Hono routes", async () => {
    const { db, config, env } = await fixture();
    const app = new Hono();
    app.route(config.basePath, createAuthRoutes(config));
    app.get("/api/me", requireUser(), (c) => c.json({ user: getAuthUser(c) }));

    const signup = await app.request(
      `${origin}/auth/signup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({
          email: "hono@example.com",
          password: "correct horse battery staple",
        }),
      },
      env,
    );
    expect(signup.status).toBe(200);
    const cookie = signup.headers.get("Set-Cookie") ?? "";
    const mountedOnce = await db
      .prepare("SELECT count(*) AS count FROM users WHERE normalized_email = ?")
      .bind("hono@example.com")
      .first("count");
    expect(mountedOnce).toBe(1);

    const doublePrefix = await app.request(
      `${origin}/auth/auth/signup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: "{}",
      },
      env,
    );
    expect(doublePrefix.status).toBe(404);

    const unauthorized = await app.request(`${origin}/api/me`, {}, env);
    expect(unauthorized.status).toBe(401);
    const authorized = await app.request(
      `${origin}/api/me`,
      { headers: { Cookie: cookie } },
      env,
    );
    await expect(authorized.json()).resolves.toMatchObject({
      user: { email: "hono@example.com" },
    });
  });

  it("client sends same-origin credentialed requests and throws typed errors", async () => {
    const calls: RequestInit[] = [];
    const client = createAuthClient({
      basePath: "/auth",
      fetch: async (_input, init) => {
        calls.push(init ?? {});
        if (calls.length === 1) return Response.json({ user: null });
        return Response.json(
          {
            error: {
              code: "invalid_credentials",
              message: "Invalid credentials",
            },
          },
          { status: 401 },
        );
      },
    });
    await expect(client.getUser()).resolves.toEqual({ user: null });
    expect(calls[0]?.credentials).toBe("include");
    await expect(
      client.signInWithPassword({
        identifier: "a@example.com",
        password: "wrong password",
      }),
    ).rejects.toMatchObject({
      code: "invalid_credentials",
      status: 401,
    } satisfies Partial<AuthClientError>);
  });
});

async function fixture() {
  const db = createSqliteD1Database();
  await applyD1Migrations(db, [
    await readFile("migrations/0001_initial.sql", "utf8"),
    await readFile("migrations/0002_indexes.sql", "utf8"),
  ]);
  const config = defineAuthConfig({
    appName: "Hono Test",
    basePath: "/auth",
    email: createMockEmailAdapter(),
  });
  const env = {
    AUTH_DB: db,
    AUTH_SECRET: authSecret,
    AUTH_ENV: "development",
    AUTH_PUBLIC_ORIGIN: origin,
  };
  return { db, config, env };
}
