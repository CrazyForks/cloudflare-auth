import { describe, expect, it } from "vitest";

import { clientPackageName } from "@cf-auth/client";
import { cliPackageName } from "@cf-auth/cli";
import { corePackageName } from "@cf-auth/core";
import { emailCloudflarePackageName } from "@cf-auth/email-cloudflare";
import { honoPackageName } from "@cf-auth/hono";
import { testingPackageName } from "@cf-auth/testing";
import { workerPackageName } from "@cf-auth/worker";

describe("package boundary exports", () => {
  it("imports every public package through its root export", () => {
    expect(corePackageName).toBe("@cf-auth/core");
    expect(workerPackageName).toBe("@cf-auth/worker");
    expect(honoPackageName).toBe("@cf-auth/hono");
    expect(clientPackageName).toBe("@cf-auth/client");
    expect(cliPackageName).toBe("@cf-auth/cli");
    expect(emailCloudflarePackageName).toBe("@cf-auth/email-cloudflare");
    expect(testingPackageName).toBe("@cf-auth/testing");
  });
});
