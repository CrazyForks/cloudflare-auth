# GitHub Actions Release Security

All third-party actions are pinned to full commit SHAs. The adjacent version
comments are informational; the SHA is the executable identity.

The pins were resolved on 2026-07-11 directly from each official GitHub
repository with:

```sh
git ls-remote --refs https://github.com/OWNER/REPOSITORY.git refs/tags/TAG
```

| Action                             | Verified tag | Commit SHA                                 |
| ---------------------------------- | ------------ | ------------------------------------------ |
| `actions/checkout`                 | `v7`         | `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` |
| `pnpm/action-setup`                | `v6`         | `b0f76dfb45f55f8421693e4803ac7bb65143bd34` |
| `actions/setup-node`               | `v6`         | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` |
| `actions/upload-artifact`          | `v7`         | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `github/codeql-action`             | `v4`         | `1ad29ea4a422cce9a242a9fae469541dcd08addc` |
| `actions/dependency-review-action` | `v5.0.0`     | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` |

`actions/dependency-review-action` does not publish a floating `v5` tag;
the verified `v5.0.0` tag and its matching `v5` branch pointed to the same
commit at verification time.

Dependabot remains enabled for the `github-actions` ecosystem. Pin updates
must verify the proposed SHA belongs to the official repository and update this
table with the reviewed tag.

## Protected manual workflows

The npm release job runs only when the selected ref is the repository default
branch and declares the `npm-production` environment. Configure that
environment with required reviewers, a default-branch deployment rule, and the
`NPM_TOKEN` secret.

The Cloudflare production-smoke job has the same default-branch guard and uses
the `cloudflare-production-smoke` environment. Configure required reviewers,
a default-branch deployment rule, and the narrowly scoped Cloudflare fixture
secrets on that environment.

GitHub stores environment protection rules outside the repository. A workflow
declaration names the boundary, but repository administrators must configure
and periodically audit the rules.
