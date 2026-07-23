# Disuza Project Metrics

This file is the source of truth for resume/project metrics. Use only measurements that were run locally or against the deployed demo and can be repeated. Prefer the median of 3 runs before moving a metric to the resume.

## Environment

- Date: 2026-07-23
- Machine: local Windows development machine
- Project root: `<repo-root>`
- Notes:
  - AI problem generation depends on Gemini free tier.
  - Code execution depends on the free/public Piston-compatible runner.
  - OTP/email depends on Resend and may not work without provider configuration.
  - These external-provider flows should not be used for local performance claims.

## Setup Time

### Manual Local Setup

Command measured:

```powershell
Measure-Command {
  npm --prefix api install
  npm --prefix web install
  npm --prefix api run build
  npm --prefix web run build
}
```

Result:

- Install + build time: `34.844s`
- Backend dev server ready: `~4-5s`
- Frontend dev server ready: `~3-4s`
- Approx total manual ready time: `~42-44s`

### Docker Cold Setup

Command measured:

```powershell
docker compose down -v
docker system prune -f
Measure-Command { docker compose up --build -d }
```

Result:

- Cold Docker setup time: `239.916s` (`~3m 59.9s`)
- Includes first-run Mongo image pull and Docker build/cache setup.
- Observed container startup after build:
  - Redis container: `~10.0s`
  - Mongo container: `~9.9s`
  - API container: `~7.6s`
  - Web container: `~6.8s`

### Docker Repeat Setup

Command measured without pruning images/cache:

```powershell
docker compose down
Measure-Command { docker compose up --build -d }
```

Result:

- Run 1: `21.139s`
- Run 2: `17.744s`
- Run 3: `2.809s`
- Sorted results: `2.809s`, `17.744s`, `21.139s`
- Median repeat setup time: `17.744s`

Interpretation:

- These runs are not cold installs. They reuse Docker images, layers, volumes, and local build cache.
- Run 1 was slower because Docker still had more startup/build-cache work to settle.
- Run 3 is effectively a warm-cache container restart/build check and should not be presented as a full setup time.
- Resume-safe wording should avoid claiming Docker is faster than manual cold setup.
- Stronger wording: Docker standardized the full-stack environment into a reproducible Compose workflow, with warm local restarts reaching a median of `~17.7s` after the initial image/build setup.

## Automated Test Count / Pass Rate

Commands measured:

```powershell
npm --prefix api test
npm --prefix web test
```

Result:

- Backend API tests: `91/91` passing across `29` suites (`100%` pass rate).
- Frontend tests: `26/26` passing across `8` suites (`100%` pass rate).
- Combined tracked automated tests: `117/117` passing (`100%` pass rate).

Interpretation:

- This is a test count and pass-rate metric, not a line/branch coverage percentage.
- Backend test run emitted existing Mongoose duplicate-index warnings, but all tests passed.
- Resume-safe wording: validated core backend and frontend flows with `117` automated tests passing locally at `100%` pass rate.

## Deployed Browser Performance

Flow measured:

- Live frontend: `https://disuza.vercel.app/`
- Live API discovered from frontend bundle: `https://disuza-y7fe.onrender.com/api`
- Tooling: local headless Chrome controlled through Chrome DevTools Protocol.
- Cache disabled for the browser run.
- Protected pages were measured through same-session SPA navigation using a short-lived access token.
- Measurement date: `2026-07-23`.

### Public Landing Hard Load

Result:

- DOMContentLoaded: `1688.4ms`
- Load event: `1688.5ms`
- Response end: `395.9ms`
- First Contentful Paint: `1716ms`
- Largest Contentful Paint: `3184ms`
- Cumulative Layout Shift: `0.0003`
- DOM nodes: `178`
- JS heap used: `4.04MB`

Interpretation:

- This is a browser Performance API measurement, not a Lighthouse score.
- Landing can be hard-reloaded safely because it is public.
- Resume-safe wording: deployed landing page measured `~1.7s` FCP, `~3.2s` LCP, and near-zero CLS (`0.0003`) in a local headless Chrome test.

### Protected Route Same-Session Navigation

Protected routes cannot be reliably Lighthouse-tested by hard reload until refresh cookies work across the deployed frontend/API domains. These measurements keep one authenticated browser session open and navigate between routes without reload.

Result:

| Route | SPA settle time | Requests | API requests | Failed requests | Transfer | DOM nodes | JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Feed `/home` | `4063.3ms` | `16` | `4` | `0` | `168.21KB` | `576` | `7.05MB` |
| Dashboard `/dashboard` | `1841.4ms` | `0` | `0` | `0` | `0KB` | `493` | `7.96MB` |
| Messages `/messages` | `1999.5ms` | `9` | `0` | `0` | `23.96KB` | `202` | `8.64MB` |
| Notifications `/notifications` | `2319.2ms` | `6` | `0` | `0` | `45.77KB` | `327` | `8.02MB` |
| Search `/search` | `4688.9ms` | `16` | `2` | `0` | `144.99KB` | `414` | `8.05MB` |

Aggregate:

- Protected route sample size: `5` routes.
- Average same-session SPA settle time: `2982.5ms`.
- Median same-session SPA settle time: `2319.2ms`.
- Range: `1841.4ms` to `4688.9ms`.
- Failed requests during measured route transitions: `0`.

Interpretation:

- Route timing includes React route change, lazy chunk loading, API/network activity, and a small settle buffer.
- These are deployed-demo measurements, so Render free-tier latency and cold/warm backend state can affect results.
- Resume-safe wording: measured five protected deployed app routes through same-session SPA navigation with `0` failed requests and a median route settle time of `~2.3s`.

## Deployed Concurrent Load Test

Flow measured:

- Live API: `https://disuza-y7fe.onrender.com/api`
- Endpoint: `GET /post/getAllPosts?page=1&limit=10`
- Tooling: local Node.js load script using concurrent `fetch` bursts.
- Auth: short-lived access token supplied at runtime through an environment variable.
- Mode: one concurrent request per virtual user per stage.
- Measurement date: `2026-07-23`.
- Total requests across all stages: `225`.
- The run was intentionally bounded below the deployed API rate limit of `300 requests / 15 minutes`.

Result:

| Virtual users | Requests | Success | Failed | Error rate | Avg latency | Median | p95 | Max | Approx RPS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `10` | `10` | `10` | `0` | `0%` | `1294.32ms` | `1187.19ms` | `1463.55ms` | `1463.55ms` | `6.47` |
| `20` | `20` | `20` | `0` | `0%` | `1278.04ms` | `1127.15ms` | `1611.62ms` | `1684.44ms` | `11.84` |
| `30` | `30` | `30` | `0` | `0%` | `1383.77ms` | `1259.26ms` | `2807.72ms` | `2815.43ms` | `10.65` |
| `40` | `40` | `40` | `0` | `0%` | `1488.08ms` | `1309.68ms` | `2270.83ms` | `3301.61ms` | `12.11` |
| `50` | `50` | `50` | `0` | `0%` | `1432.95ms` | `1398.83ms` | `1635.04ms` | `2880.89ms` | `17.34` |
| `75` | `75` | `50` | `25` | `33.33%` | `4487.73ms` | `1539.09ms` | `10567.34ms` | `10570.86ms` | `7.09` |

Interpretation:

- Maximum zero-error burst stage: `50` concurrent virtual users.
- The `75` VU probe produced `25/75` failed requests, so it should be treated as beyond the stable demo threshold for this endpoint on the current free-tier deployment.
- The best resume-safe claim from this run is: deployed feed API handled `50` concurrent virtual-user read requests with `0%` errors, `~1.43s` average latency, and `~1.64s` p95 latency in a bounded burst test.
- This is a burst-concurrency test, not a long-duration soak test.
- Results are affected by Render/free-tier hosting, network distance, backend warm state, MongoDB free-tier behavior, and the global API rate limiter.

## Planned Metrics

### Redis Cache Before/After

Pending.

- Candidate routes: feed/search/dashboard analytics/recommendations.
- Record Redis-off average latency and Redis-on average latency across at least 20 requests.
- Avoid AI generation, code execution, OTP/email, and uploads for this metric.

### Realtime Chat Latency

Flow measured:

- Two local browser sessions/accounts on `localhost`.
- Sender console captured `send-start` and `send-ack`.
- Receiver console captured `socket-received` and `rendered-latest`.
- Sample size: `20` direct chat text messages.
- Measurement date: `2026-07-23`.

Result:

- Sender submit to API acknowledgement average: `434.85ms`.
- Sender submit to receiver socket event average: `434.10ms`.
- Receiver socket event to rendered message average: `32.85ms`.
- Sender submit to receiver rendered message average: `466.95ms`.
- Sender submit to receiver rendered message range: `423ms` to `797ms`.

Interpretation:

- This is a localhost development measurement, not an internet/production latency claim.
- The metric includes local API persistence, Socket.IO delivery, RTK Query cache update, and React render time.
- Resume-safe wording: local two-session testing showed chat messages reaching the receiving UI in `~467ms` on average across `20` samples.

