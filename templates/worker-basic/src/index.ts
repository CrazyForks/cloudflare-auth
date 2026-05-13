import {
  createAuthHandler,
  defineAuthConfig,
  terminalEmail,
} from "@cf-auth/worker";

const authConfig = defineAuthConfig({
  appName: "My App",
  basePath: "/auth",
  email: terminalEmail({ outbox: true }),
});
const authHandler = createAuthHandler(authConfig);

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const authResponse = await authHandler.fetch(request, env, ctx);
    if (authResponse) return authResponse;
    return new Response("Cloudflare Auth");
  },
};
