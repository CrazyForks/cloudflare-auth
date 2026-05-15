export const releaseReadinessAuditPath = "docs/release-readiness-audit.md";

export const requiredReleaseReadinessAuditText = [
  "cloudflare_auth_implementation_plan.md",
  "## Completion Audit",
  "## Non-Negotiable Rules Audit",
  "Repositories never generate raw auth tokens",
  "scripts/lint.mjs",
  "interpolated D1 `prepare`/`exec` template SQL",
  "tests/lint.test.ts",
  "## V1 Exclusion Audit",
  "role/permission framework",
  "peppering",
  "## Functional Specification Audit",
  "Section 0 execution contract",
  "Sections 1-4 product and user experience",
  "Sections 5-8 architecture, repo, and packages",
  "Sections 9-11 bindings, config, and Wrangler",
  "Sections 12-13 D1 schema and repositories",
  "Sections 14-17 tokens, passwords, identity, and cookies",
  "Sections 18-20 HTTP, CSRF/CORS, and redirects",
  "Sections 21-22 API contract and D1 atomicity",
  "Sections 23-24 rate limiting and email",
  "Sections 25-27 SDK, integrations, and CLI",
  "Sections 28-29 security model and Turnstile",
  "## Testing, CI, And Docs Plan Audit",
  "Section 31.1 unit tests",
  "Section 31.2 repository tests",
  "Section 31.3 route tests",
  "Section 31.4 concurrency/security tests",
  "Section 31.5 CLI tests",
  "Section 31.6 example tests",
  "Section 32.1 CI command set",
  "Section 32.2 examples workflow",
  "Section 32.3 release workflow",
  "Section 32.4 security automation",
  "Section 33.1 README",
  "Section 33.2 docs directory",
  "Section 33.3 troubleshooting matrix",
  "## Source Notes And README Draft Audit",
  "Section 34 source notes",
  "Section 35 README draft",
  "docs/platform-assumptions.md",
  "Package-owner-safe fallback wording",
  "## Final Beta Definition Of Done Audit",
  "Section 36 create-package quickstart command",
  "Section 36 unscoped init command",
  "Local magic link works without email setup.",
  "Remote deploy works with documented Cloudflare setup.",
  "Packages can be published with Changesets.",
  "No known high-severity auth bug is open.",
  "## Blocking Evidence",
  "maintainer, npm, GitHub, or Cloudflare evidence",
  "not be fabricated in the repo",
  "Private alpha evidence",
  "Public beta evidence",
  "Published quickstart smoke",
  "Deploy to Cloudflare evidence",
  "Production Cloudflare smoke",
  "Package ownership",
  "Security release tracker",
  "API approval",
  "Config schema approval",
  "Security review decision",
  "Published package versions",
  "## Release Rule",
  "not ready for public beta or stable 1.0",
  "docs/metrics.md",
  "runtime auth-event metrics docs",
  "pnpm verify:release-audit",
  "CF_AUTH_REQUIRE_ALPHA_EVIDENCE=1 pnpm verify:alpha-evidence",
  "CF_AUTH_REQUIRE_BETA_EVIDENCE=1 pnpm verify:beta-evidence",
  "CF_AUTH_REQUIRE_DEPLOY_BUTTON_EVIDENCE=1 pnpm verify:deploy-button-evidence",
  "CF_AUTH_REQUIRE_PACKAGE_OWNERSHIP=1 pnpm verify:package-ownership",
  "pnpm check:package-names",
  "CF_AUTH_REQUIRE_SECURITY_TRACKER=1 pnpm verify:security-tracker",
  "docs/api-report.md",
  "docs/config-schema.md",
  "docs/decisions/security-review.md",
  "0.0.0",
];

export function collectReleaseReadinessAuditFailures(audit, options = {}) {
  const {
    path = releaseReadinessAuditPath,
    missingTextMessage = (needle) => `${path}: missing ${needle}`,
    missingStageMessage = (stage) => `${path}: missing Stage ${stage}`,
    missingRuleMessage = (rule) => `${path}: missing Rule ${rule}`,
  } = options;
  const failures = [];

  for (const needle of requiredReleaseReadinessAuditText) {
    if (!audit.includes(needle)) {
      failures.push(missingTextMessage(needle));
    }
  }
  for (let stage = 0; stage <= 12; stage += 1) {
    if (!audit.includes(`Stage ${stage}`)) {
      failures.push(missingStageMessage(stage));
    }
  }
  for (let rule = 1; rule <= 28; rule += 1) {
    if (!new RegExp(`\\|\\s*${rule}\\s*\\|`, "u").test(audit)) {
      failures.push(missingRuleMessage(rule));
    }
  }

  return failures;
}
