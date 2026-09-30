# PREDICTION BD v1.6 — Reliability & Verification Status

## Completed in this pass

- Version bumped to **1.6.0** across Node and Python entry points.
- Preserved all existing v1.5 functionality, including 30S / 1M / 3M / 5M modes, history, 1000P, 5-hour analysis, authentication, Python signal engine, admin controls and export flow.
- Added **custom DNS fallback** for the Node live upstream client. If the host OS resolver cannot resolve the upstream hostname, the server can retry resolution through configurable recursive DNS servers (`UPSTREAM_DNS_SERVERS`).
- HTTPS still validates the original hostname via TLS SNI/certificate verification while connecting to the resolved IP.
- Added DNS result caching to avoid resolving the upstream hostname on every request.
- Added `/api/upstream/diagnostics` DNS diagnostics showing resolution source and resolved address without pretending that DNS success equals API verification.
- Fixed the diagnostics endpoint so each configured gateway is reported independently instead of accidentally testing the entire failover chain multiple times.
- Live mode remains fail-closed: no fabricated period, result, countdown, or signal is produced when the real source is unavailable.
- Existing authorized-gateway failover and bounded retries remain enabled.

## Verification performed in this environment

- Python automated tests: **13/13 passed**.
- Python compile check: **PASS**.
- TypeScript/TSX transpile syntax checks: **23/23 passed**.
- JSON/config validation: **PASS**.
- A production Vite build was not run because project dependencies are not installed in this isolated environment.

## Live-source verification

The configured primary source remains:

`https://api.hgnicepayapi.com/api/webapi`

with origin:

`https://hgnice.org`

The current execution environment still cannot make an outbound network connection to arbitrary DNS resolvers, so the new DNS fallback cannot be exercised here. This means the HGNICE API is **still not independently verified from this environment**.

On a deployed host, the Node server now tries normal DNS first and, when enabled, the configured DNS servers before declaring the gateway unreachable. After deployment, run:

`python3 scripts/verify_hgnice.py`

and also inspect:

`GET /api/upstream/diagnostics`

The source should only be called verified after an actual successful `GetGameIssue` and `GetNoaverageEmerdList` response has been observed for all four modes.

## Signal accuracy

The Python engine remains deterministic and historical-data based. It reports walk-forward validation separately and does not fabricate 99.99%/100% accuracy or guaranteed profitability.
