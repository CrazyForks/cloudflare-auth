import { readFile } from "node:fs/promises";

import { createAuthClient, AuthClientError } from "@cf-auth/client";
import {
  createMockEmailAdapter,
  applyD1Migrations,
  createSqliteD1Database,
} from "@cf-auth/testing";
import {
  createAuthHandler,
  defineAuthConfig,
  getSession as getWorkerSession,
  getUser as getWorkerUser,
  requireUser as requireWorkerUser,
  requireVerifiedUser as requireWorkerVerifiedUser,
} from "@cf-auth/worker";
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
    const authorizedBody = (await authorized.json()) as {
      user: Record<string, unknown>;
    };
    expect(authorizedBody).toMatchObject({
      user: { email: "hono@example.com" },
    });
    expect(authorizedBody.user).not.toHaveProperty("password_hash");
    expect(authorizedBody.user).not.toHaveProperty("normalized_email");
  });

  it("exposes plain Worker helpers for current and verified users", async () => {
    const { db, config, env } = await fixture();
    const ctx = { waitUntil() {} } as unknown as ExecutionContext;
    const handler = createAuthHandler(config);
    const signup = await handler.fetch(
      new Request(`${origin}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({
          email: "worker@example.com",
          password: "correct horse battery staple",
        }),
      }),
      env,
      ctx,
    );
    expect(signup?.status).toBe(200);
    const cookie = signup?.headers.get("Set-Cookie") ?? "";
    const request = new Request(`${origin}/api/me`, {
      headers: { Cookie: cookie },
    });

    const session = await getWorkerSession(request, env, ctx, config);
    expect(session?.user.email).toBe("worker@example.com");

    const user = await getWorkerUser(request, env, ctx, config);
    expect(user).toMatchObject({
      email: "worker@example.com",
      emailVerified: false,
    });
    expect(user).not.toHaveProperty("password_hash");

    const required = await requireWorkerUser(request, env, ctx, config);
    expect(required).toMatchObject({ email: "worker@example.com" });

    const unverified = await requireWorkerVerifiedUser(
      request,
      env,
      ctx,
      config,
    );
    expect(unverified).toBeInstanceOf(Response);
    expect((unverified as Response).status).toBe(403);

    await db
      .prepare(
        "UPDATE users SET email_verified_at = ?, updated_at = ? WHERE normalized_email = ?",
      )
      .bind(Date.now(), Date.now(), "worker@example.com")
      .run();

    const verified = await requireWorkerVerifiedUser(request, env, ctx, config);
    expect(verified).toMatchObject({
      email: "worker@example.com",
      emailVerified: true,
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
    passwordHashing: {
      profile: "development-fast",
      maxConcurrentHashesPerIsolate: 1,
    },
  });
  const env = {
    AUTH_DB: db,
    AUTH_SECRET: authSecret,
    AUTH_ENV: "development",
    AUTH_PUBLIC_ORIGIN: origin,
  };
  return { db, config, env };
}
