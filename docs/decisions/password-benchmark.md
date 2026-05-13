# Password Benchmark

The benchmark script measures the configured password profile with three warmup hashes and ten measured hashes. It defaults to `workers-balanced`, matching generated production-ready config.

Run on May 13, 2026 with Node v26.0.0:

```json
{
  "profile": "workers-balanced",
  "p50Ms": 50,
  "p95Ms": 58
}
```

Run it locally after changing password parameters:

```bash
pnpm benchmark:password
pnpm benchmark:password -- --profile development-fast
```

Production deployments should use `workers-balanced` unless they have measured CPU budget and latency headroom for a higher-cost profile.
