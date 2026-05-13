export const workerPackageName = "@cf-auth/worker";

export interface MinimalAuthConfig {
  appName: string;
  basePath: string;
  email?: unknown;
}

export function defineAuthConfig<T extends MinimalAuthConfig>(config: T): T {
  return config;
}

export function terminalEmail(options: { outbox?: boolean } = {}) {
  return { kind: "terminal", outbox: options.outbox === true };
}

export function createAuthHandler(config: MinimalAuthConfig) {
  return {
    async fetch(
      request: Request,
      _env?: unknown,
      _ctx?: ExecutionContext,
    ): Promise<Response | null> {
      const url = new URL(request.url);
      if (
        url.pathname === config.basePath ||
        url.pathname.startsWith(`${config.basePath}/`)
      ) {
        return Response.json({ ok: true, appName: config.appName });
      }
      return null;
    },
  };
}
