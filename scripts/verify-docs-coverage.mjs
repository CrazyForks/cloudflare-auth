import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

const docs = {
  api: await readFile("docs/api.md", "utf8"),
  apiReport: await readFile("docs/api-report.md", "utf8"),
  cli: await readFile("docs/cli.md", "utf8"),
  configSchema: await readFile("docs/config-schema.md", "utf8"),
  config: await readFile("docs/configuration.md", "utf8"),
  deployment: await readFile("docs/deployment.md", "utf8"),
  migrations: await readFile("docs/migrations.md", "utf8"),
  readme: await readFile("README.md", "utf8"),
};
const failures = [];

const cliCommands = await cliCommandNames();
for (const command of cliCommands) {
  requireText("docs/cli.md", docs.cli, `cf-auth ${command}`);
}

for (const command of [
  "cf-auth generate hono",
  "cf-auth generate worker-snippet",
  "cf-auth generate react-client",
  "cf-auth generate types",
  "cf-auth rotate-secret --print",
  "cf-auth rotate-secret --apply --env production",
  "cf-auth clean --local",
  "cf-auth clean --remote --env production",
  "cf-auth users disable",
  "cf-auth users enable",
  "cf-auth sessions revoke --user",
  "cf-auth sessions list --user",
]) {
  requireText("docs/cli.md", docs.cli, command);
}

const configKeys = [
  "appName",
  "basePath",
  "runtime.mode",
  "runtime.publicOrigin",
  "runtime.trustedHosts",
  "database.binding",
  "session.cookieName",
  "session.maxAgeDays",
  "session.sameSite",
  "session.secure",
  "session.domain",
  "session.requireVerifiedEmail",
  "request.maxBodyBytes",
  "request.requireOriginOnUnsafeMethods",
  "request.enumerationMinResponseMs",
  "request.enumerationJitterMs",
  "security.allowedRequestOrigins",
  "security.allowedPreviewRequestOrigins",
  "passwordHashing.profile",
  "passwordHashing.maxConcurrentHashesPerIsolate",
  "passwordHashing.queueTimeoutMs",
  "signup.enabled",
  "signup.requireEmailVerificationBeforeSession",
  "signup.enumerationSafe",
  "signup.username.enabled",
  "signup.username.required",
  "login.emailPassword",
  "login.usernamePassword",
  "login.magicLink",
  "login.requireVerifiedEmail",
  "magicLink.allowSignups",
  "magicLink.expiresInMinutes",
  "magicLink.activeTokenPolicy",
  "passwordReset.enabled",
  "passwordReset.expiresInMinutes",
  "passwordReset.revokeExistingSessions",
  "passwordReset.createSessionAfterReset",
  "passwordReset.markEmailVerifiedOnReset",
  "passwordReset.activeTokenPolicy",
  "emailVerification.enabled",
  "emailVerification.expiresInHours",
  "emailVerification.createSessionAfterVerification",
  "emailVerification.activeTokenPolicy",
  "turnstile.mode",
  "turnstile.endpoints",
  "turnstile.verify",
  "email",
  "redirects.defaultAfterLogin",
  "redirects.defaultAfterLogout",
  "redirects.defaultAfterEmailVerification",
  "redirects.defaultAfterPasswordReset",
  "redirects.allowedOrigins",
  "redirects.allowedPreviewOrigins",
];
for (const key of configKeys) {
  requireText("docs/configuration.md", docs.config, key);
}
for (const key of configKeys) {
  requireText("docs/config-schema.md", docs.configSchema, key);
}

for (const key of [
  "AUTH_DB",
  "AUTH_SECRET",
  "AUTH_SECRET_PREVIOUS",
  "AUTH_ENV",
  "AUTH_PUBLIC_ORIGIN",
  "TURNSTILE_SECRET_KEY",
  "AUTH_RATE_LIMITER",
  "AUTH_EMAIL",
]) {
  requireText("docs/config-schema.md", docs.configSchema, key);
}

const authEndpoints = await authRouteEndpoints();
for (const endpoint of authEndpoints) {
  requireText("docs/api.md", docs.api, endpoint);
}

for (const text of ["Referrer-Policy: no-referrer", "history entry"]) {
  requireText("docs/api.md", docs.api, text);
}

for (const entrypoint of [
  "cf-auth",
  "@cf-auth/cli",
  "create-cloudflare-auth",
  "@cf-auth/core",
  "@cf-auth/worker",
  "@cf-auth/hono",
  "@cf-auth/client",
  "@cf-auth/email-cloudflare",
  "@cf-auth/testing",
]) {
  requireText("docs/api.md", docs.api, entrypoint);
}

for (const symbol of [
  "runCli",
  "createAuthClient",
  "AuthClientError",
  "normalizeEmail",
  "validateRedirectTarget",
  "parseAuthKeyRing",
  "hashPassword",
  "resolveSessionCookie",
  "defineAuthConfig",
  "createAuthHandler",
  "getSession",
  "getUser",
  "requireUser",
  "requireVerifiedUser",
  "getAuthSessionFromRequest",
  "createD1Repositories",
  "cleanCfAuth",
  "terminalEmail",
  "byEnvironment",
  "verifyTurnstileToken",
  "turnstileEndpointNames",
  "cloudflareRateLimitPrefilter",
  "redactLogValue",
  "createAuthRoutes",
  "getAuthUser",
  "optionalUser",
  "cloudflareEmail",
  "defaultMagicLinkTemplate",
  "defaultEmailVerificationTemplate",
  "defaultPasswordResetTemplate",
  "createSqliteD1Database",
  "applyD1Migrations",
  "createMockEmailAdapter",
]) {
  requireText("docs/api.md", docs.api, symbol);
}

const rootExports = await rootExportNames();
for (const exportName of rootExports) {
  requireText("docs/api.md", docs.api, exportName);
}
for (const exportName of rootExports) {
  requireText("docs/api-report.md", docs.apiReport, exportName);
}

for (const text of ["Default retention windows", "non-negative integer"]) {
  requireText("docs/api.md", docs.api, text);
}

for (const command of [
  "cf-auth migrate --local",
  "cf-auth migrate --remote --env production",
  "cf-auth migrate --status --local",
  "cf-auth migrate --status --remote --env production",
]) {
  requireText("docs/migrations.md", docs.migrations, command);
}

for (const text of ["cleanCfAuth", "ctx.waitUntil", "non-negative integer"]) {
  requireText("docs/migrations.md", docs.migrations, text);
}

for (const text of [
  "cf-auth doctor --env production",
  "cf-auth migrate --remote --env production",
  "cf-auth deploy --env production",
  "AUTH_PUBLIC_ORIGIN",
  "AUTH_SECRET",
  "AUTH_DB.database_id",
  "AUTH_EMAIL",
  "/auth/logout",
]) {
  requireText("docs/deployment.md", docs.deployment, text);
}

requireText("README.md", docs.readme, "SECURITY.md");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("documentation coverage verified");

function requireText(file, text, needle) {
  if (!text.includes(needle)) {
    failures.push(`${file}: missing ${needle}`);
  }
}

async function rootExportNames() {
  const entries = await readdir("packages", { withFileTypes: true });
  const names = new Set();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let source;
    try {
      source = await readFile(
        join("packages", entry.name, "src", "index.ts"),
        "utf8",
      );
    } catch {
      continue;
    }
    for (const line of source.split("\n")) {
      const trimmed = line.trim();
      const declaration = trimmed.match(
        /^export\s+(?:async\s+)?(?:function|class|const|interface|type)\s+([A-Za-z_$][\w$]*)/u,
      );
      if (declaration?.[1]) {
        names.add(declaration[1]);
        continue;
      }
      const named = trimmed.match(/^export\s*\{([^}]+)\}/u);
      if (!named?.[1]) continue;
      for (const item of named[1].split(",")) {
        const [name, alias] = item.trim().split(/\s+as\s+/u);
        const exported = alias ?? name;
        if (/^[A-Za-z_$][\w$]*$/u.test(exported)) names.add(exported);
      }
    }
  }
  return [...names].sort();
}

async function authRouteEndpoints() {
  const path = "packages/worker/src/index.ts";
  let sourceText;
  try {
    sourceText = await readFile(path, "utf8");
  } catch {
    failures.push(`${path}: could not be read for auth endpoint docs coverage`);
    return [];
  }

  const sourceFile = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const endpoints = new Set();
  let foundDispatcher = false;

  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "dispatchAuthRequest"
    ) {
      foundDispatcher = true;
      ts.forEachChild(node, collectEndpoint);
      return;
    }
    ts.forEachChild(node, visit);
  }

  function collectEndpoint(node) {
    if (ts.isIfStatement(node)) {
      const endpoint = routeEndpointFromExpression(node.expression);
      if (endpoint) endpoints.add(endpoint);
    }
    ts.forEachChild(node, collectEndpoint);
  }

  visit(sourceFile);

  if (!foundDispatcher)
    failures.push(
      `${path}: missing dispatchAuthRequest for auth endpoint docs coverage`,
    );
  if (endpoints.size === 0)
    failures.push(`${path}: no auth endpoints found in dispatchAuthRequest`);

  return [...endpoints].sort();
}

async function cliCommandNames() {
  const path = "packages/cli/src/index.ts";
  let sourceText;
  try {
    sourceText = await readFile(path, "utf8");
  } catch {
    failures.push(`${path}: could not be read for CLI command docs coverage`);
    return [];
  }

  const sourceFile = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const commands = new Set();
  let foundRunCli = false;

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "runCli") {
      foundRunCli = true;
      ts.forEachChild(node, collectCliSwitch);
      return;
    }
    ts.forEachChild(node, visit);
  }

  function collectCliSwitch(node) {
    if (
      ts.isSwitchStatement(node) &&
      expressionName(node.expression) === "parsed.command"
    ) {
      for (const clause of node.caseBlock.clauses) {
        if (
          !ts.isCaseClause(clause) ||
          !ts.isStringLiteral(clause.expression)
        ) {
          continue;
        }
        const command = clause.expression.text;
        if (!["help", "--help", "-h"].includes(command)) commands.add(command);
      }
    }
    ts.forEachChild(node, collectCliSwitch);
  }

  visit(sourceFile);

  if (!foundRunCli)
    failures.push(`${path}: missing runCli for CLI command docs coverage`);
  if (commands.size === 0)
    failures.push(`${path}: no CLI commands found in runCli dispatcher`);

  return [...commands].sort();
}

function routeEndpointFromExpression(expression) {
  let routePath = null;
  let method = null;

  for (const condition of flattenAndConditions(expression)) {
    const equality = stringEquality(condition);
    if (!equality) continue;
    if (equality.name === "path") routePath = equality.value;
    if (equality.name === "request.method") method = equality.value;
  }

  return routePath && method ? `${method} /auth${routePath}` : null;
}

function flattenAndConditions(expression) {
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  ) {
    return [
      ...flattenAndConditions(expression.left),
      ...flattenAndConditions(expression.right),
    ];
  }
  return [expression];
}

function stringEquality(expression) {
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
  ) {
    return null;
  }

  const leftName = expressionName(expression.left);
  const rightValue = stringLiteralValue(expression.right);
  if (leftName && rightValue !== null)
    return { name: leftName, value: rightValue };

  const rightName = expressionName(expression.right);
  const leftValue = stringLiteralValue(expression.left);
  if (rightName && leftValue !== null)
    return { name: rightName, value: leftValue };

  return null;
}

function expressionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (!ts.isPropertyAccessExpression(expression)) return null;
  const parent = expressionName(expression.expression);
  return parent ? `${parent}.${expression.name.text}` : null;
}

function stringLiteralValue(expression) {
  return ts.isStringLiteral(expression) ? expression.text : null;
}
