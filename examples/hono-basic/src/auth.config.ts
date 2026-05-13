import { defineAuthConfig, terminalEmail } from "@cf-auth/worker";

export default defineAuthConfig({
  appName: "Hono Basic",
  basePath: "/auth",
  passwordHashing: {
    profile: "development-fast",
    maxConcurrentHashesPerIsolate: 1,
  },
  email: terminalEmail({ outbox: true }),
});
