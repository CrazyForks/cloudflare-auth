export const clientPackageName = "@cf-auth/client";

export interface AuthClientOptions {
  basePath?: string;
  fetch?: typeof fetch;
}

export function createAuthClient(options: AuthClientOptions = {}) {
  const basePath = options.basePath ?? "/auth";
  const fetcher = options.fetch ?? fetch;
  return {
    async getUser() {
      return fetcher(`${basePath}/user`, { credentials: "include" }).then(
        (response) => response.json(),
      );
    },
  };
}
