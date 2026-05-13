import { createAuthClient } from "@cf-auth/client";

export const auth = createAuthClient({ basePath: "/auth" });
