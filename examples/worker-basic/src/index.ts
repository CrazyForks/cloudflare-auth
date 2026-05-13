import {
  createAuthHandler,
  defineAuthConfig,
  terminalEmail,
} from "@cf-auth/worker";

const authConfig = defineAuthConfig({
  appName: "Worker Basic",
  basePath: "/auth",
  email: terminalEmail({ outbox: true }),
});
const authHandler = createAuthHandler(authConfig);

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const authResponse = await authHandler.fetch(request, env, ctx);
    if (authResponse) return authResponse;
    return new Response(
      `<!doctype html>
<meta charset="utf-8">
<title>Cloudflare Auth Worker Example</title>
<main>
  <h1>Cloudflare Auth</h1>
  <form data-auth="signup">
    <input name="email" type="email" placeholder="email@example.com">
    <input name="password" type="password" placeholder="Password">
    <button type="submit">Sign up</button>
  </form>
  <form data-auth="login">
    <input name="identifier" placeholder="Email or username">
    <input name="password" type="password" placeholder="Password">
    <button type="submit">Sign in</button>
  </form>
</main>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  },
};
