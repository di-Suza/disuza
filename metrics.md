# Disuza Local Metrics

This file is the source of truth for resume/project metrics. Use only measurements that were run locally and can be repeated. Prefer the median of 3 runs before moving a metric to the resume.

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

### Concurrent Load

Pending.

- Candidate tools: k6 or Artillery.
- Candidate routes: health, feed, search, profile/dashboard read APIs.
- Record virtual users, p95 latency, requests/second, and error rate.
- Skip OTP, AI generation, code execution, and uploads.
