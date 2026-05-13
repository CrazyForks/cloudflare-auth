import { defineAuthConfig, terminalEmail } from "@cf-auth/worker";

export default defineAuthConfig({
  appName: "Hono Basic",
  basePath: "/auth",
  email: terminalEmail({ outbox: true }),
});
