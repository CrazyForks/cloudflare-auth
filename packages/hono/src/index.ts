export const honoPackageName = "@cf-auth/hono";

import { Hono } from "hono";

export function createAuthRoutes(config: {
  appName: string;
  basePath: string;
}) {
  const app = new Hono();
  app.all("*", (c) => c.json({ ok: true, appName: config.appName }));
  return app;
}
