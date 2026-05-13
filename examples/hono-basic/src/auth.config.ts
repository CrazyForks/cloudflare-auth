import { cloudflareEmail } from "@cf-auth/email-cloudflare";
import {
  byEnvironment,
  defineAuthConfig,
  terminalEmail,
} from "@cf-auth/worker";

export default defineAuthConfig({
  appName: "Hono Basic",
  basePath: "/auth",
  passwordHashing: {
    profile: "development-fast",
    maxConcurrentHashesPerIsolate: 1,
  },
  email: byEnvironment({
    development: terminalEmail({ outbox: true }),
    preview: cloudflareEmail({
      binding: "AUTH_EMAIL",
      from: { email: "auth@example.com", name: "Hono Basic" },
    }),
    production: cloudflareEmail({
      binding: "AUTH_EMAIL",
      from: { email: "auth@example.com", name: "Hono Basic" },
    }),
  }),
});
