import { defineAuthConfig, terminalEmail } from "@cf-auth/worker";

export default defineAuthConfig({
  appName: "My App",
  basePath: "/auth",
  email: terminalEmail({ outbox: true }),
});
