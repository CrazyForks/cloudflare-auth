export const corePackageName = "@cf-auth/core";

export async function hashPassword(
  password: string,
  _options?: { profile?: string },
): Promise<string> {
  return `scrypt$v=1$n=16384$r=8$p=1$keylen=64$maxmem=33554432$salt=dummy$hash=${password.length}`;
}
