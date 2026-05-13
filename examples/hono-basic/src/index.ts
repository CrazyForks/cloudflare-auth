import { Hono } from "hono";
import { createAuthRoutes } from "@cf-auth/hono";
import authConfig from "./auth.config.js";

const app = new Hono();

app.route(authConfig.basePath, createAuthRoutes(authConfig));
app.get("/", (c) => c.text("Cloudflare Auth Hono example"));

export default app;
