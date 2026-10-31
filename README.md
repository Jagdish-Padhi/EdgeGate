# EdgeGate

EdgeGate is an edge-based distributed rate-limiting middleware prototype.
Regional edge nodes make admission decisions from local memory, while a
coordinator distributes leases from one shared global quota and reconciles
usage in batches.

It demonstrates the core distributed-systems trade-off:

> Keep the request path local and fast without turning each region into an
> independent, globally inaccurate rate limiter.

This repository is the Group 12 CA1 SSD micro-project implementation.

## What it demonstrates

- Multiple regional edge nodes in front of one protected origin API.
- Token-bucket burst control and a two-bucket sliding-window approximation.
- Demand-aware quota leases allocated by a coordinator.
- Batched, idempotent usage synchronization.
- In-memory per-edge state with bounded LRU eviction.
- MongoDB-backed coordinator state, including MongoDB Atlas support.
- Fault simulation for partitions, latency, jitter, lost replies, and crashes.
- A React landing page and live operator console.

The edge nodes are simulated as separate Node.js processes. The rate-limiting
engine and admission logic are runtime-independent; the Node HTTP process is
the local edge-worker adapter used for this project.

## Architecture

```text
Clients
   |
   v
Regional edge nodes  ---- admitted requests ---->  Origin API
   |
   | batched usage reports and quota leases
   v
Coordinator  ------------------------------->  MongoDB
```

The request path is local once an edge holds a lease. The coordinator is used
for synchronization, global usage accounting, lease allocation, and rule
distribution rather than for every request.

Read the complete design, data flow, failure handling, and guarantees in
[docs/architecture.md](docs/architecture.md).

## Requirements

- Node.js 20 or newer
- npm
- Docker only if using local MongoDB
- MongoDB Atlas or local MongoDB for durable mode

## Install

```bash
npm install
```

The root workspace installs dependencies for both `server/` and `client/`.

## Run locally

### Fast demo without MongoDB

This mode uses the in-memory coordinator store. State is lost if the
coordinator restarts.

```bash
npm run dev:memory
```

### Durable demo with local MongoDB

```bash
npm run db:up
npm run dev
```

### Durable demo with MongoDB Atlas

Copy the server environment template:

```bash
copy .env.example .env
```

Set the Atlas connection string in `.env`:

```env
STORE=mongo
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=edgegate
```

Then start the stack:

```bash
npm run dev
```

Do not run `npm run db:up` when using Atlas.

The server supervisor starts:

| Service | Address | Purpose |
|---|---:|---|
| Origin API | `4100` | Protected demo API |
| Coordinator | `4000` | Global usage and lease allocation |
| Mumbai edge | `4201` | Regional admission node |
| Frankfurt edge | `4202` | Regional admission node |
| Virginia edge | `4203` | Regional admission node |

The supervisor restarts a child process after a crash.

## Run the dashboard

In a second terminal:

```bash
npm run dashboard
```

Open [http://localhost:5173](http://localhost:5173).

The landing page explains the product. Select **Open live console** to:

- Send traffic through one or all edge nodes.
- Inspect shared usage and regional leases.
- Change the free-tier limit.
- Adjust synchronization latency, jitter, loss, and interval.
- Simulate a partition, dropped replies, slow links, and crashes.

## Environment configuration

The server template is [.env.example](.env.example). Important values:

| Variable | Default | Description |
|---|---:|---|
| `STORE` | `mongo` | `mongo` or `memory` |
| `MONGO_URI` | local Mongo URI | MongoDB or Atlas connection string |
| `MONGO_DB` | `edgegate` | Database name |
| `ORIGIN_PORT` | `4100` | Origin API port |
| `COORDINATOR_PORT` | `4000` | Coordinator port |
| `EDGE_SYNC_INTERVAL_MS` | `1000` | Normal edge synchronization interval |
| `EDGE_SYNC_LATENCY_MS` | `0` | Base edge-to-coordinator delay |
| `EDGE_SYNC_JITTER_MS` | `0` | Random delay variation |
| `EDGE_SYNC_LOSS_RATE` | `0` | Lost coordinator reply rate from `0` to `1` |
| `EDGE_FAIL_MODE` | `bounded` | `bounded`, `open`, or `closed` |

Synchronization conditions can also be changed live from the dashboard
Settings panel. They affect the control path only; local admission remains
local while a lease is available.

For a realistic but controlled presentation profile:

```env
EDGE_SYNC_LATENCY_MS=40
EDGE_SYNC_JITTER_MS=20
EDGE_SYNC_LOSS_RATE=0.02
```

## Frontend deployment configuration

The frontend template is [client/.env.example](client/.env.example).
For a Vercel deployment, configure:

```env
VITE_COORDINATOR_URL=https://your-coordinator.onrender.com
VITE_EDGE_MUMBAI_URL=https://your-edge-mumbai.onrender.com
VITE_EDGE_FRANKFURT_URL=https://your-edge-frankfurt.onrender.com
VITE_EDGE_VIRGINIA_URL=https://your-edge-virginia.onrender.com
```

The frontend sends browser traffic directly to the configured edge services.
Configure CORS and HTTPS at the deployed services before presenting the live
version.

## Example request

Send a request directly to the Mumbai edge:

```bash
curl -i -H "x-api-key: key-free-acme" http://localhost:4201/api/orders
```

The response includes rate-limit headers. Once the quota is exhausted, the
edge returns `429 Too Many Requests` with `Retry-After`.

Demo origin routes:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Origin health check |
| `GET` | `/api/orders` | Protected orders API |
| `GET` | `/api/weather` | Anonymous/public API example |
| `POST` | `/auth/login` | Per-IP login limit example |

Seed API keys:

| Key | Plan |
|---|---|
| `key-free-acme` | Free |
| `key-pro-globex` | Pro |

## Recommended professor demo

1. Start `npm run dev:memory` and `npm run dashboard`.
2. Open the landing page and explain the local request path and shared quota.
3. Open the live console.
4. Send 60 free-plan requests across all three edges.
5. Show the global budget reaching the free limit rather than multiplying by
   the number of edges.
6. Send traffic to Mumbai only and show demand-based lease redistribution.
7. Disconnect Frankfurt and show bounded local fallback.
8. Heal Frankfurt and show usage reconciliation.
9. Enable dropped replies and show retry idempotency.
10. Change the free limit and show version propagation to the edges.
11. Run the benchmark and explain the latency, coordination, and overshoot
    trade-offs.

The detailed presentation sequence is also described in [plan.md](plan.md).

## Test and benchmark

Run the server test suite:

```bash
npm test
```

Run accuracy and latency benchmarks:

```bash
npm run bench
```

Build the production dashboard:

```bash
npm run build -w client
```

The test suite covers:

- Token buckets and sliding windows
- Lease allocation and reclamation
- Global quota behavior across edges
- Concurrent synchronization
- Batch replay protection
- Lost replies and restart epochs
- Network partitions and fail modes
- Rule propagation
- HTTP edge, coordinator, and origin behavior
- Module dependency boundaries
- In-memory KV eviction and expiry

## Repository layout

```text
server/
  src/
    engine/       token bucket, sliding window, lease allocation
    kv/           bounded in-memory key-value store
    rules/        rule schema, defaults, and request-key resolution
    edge/         admission, leases, sync client, proxy, HTTP app
    coordinator/  batch processing, allocation, rule distribution
    store/        memory and MongoDB persistence
    chaos/        controlled network fault injection
    origin/       protected demo API
  bin/            runtime entry points and process supervisor
  harness/        in-process cluster for tests and benchmarks
  test/           unit, integration, HTTP, and architecture tests
  bench/          accuracy and latency benchmarks
client/
  src/            React landing page and live operator console
docs/
  architecture.md system design and failure strategy
```

## Guarantees and limitations

When synchronization is healthy:

- Each request is decided locally after a lease is available.
- Usage plus outstanding leases stays within the configured global limit at
  lease-grant time.
- Replayed synchronization batches are counted once.
- Rules are versioned and propagated during synchronization.

Important limitations:

- The sliding window is a two-bucket approximation.
- One active coordinator is assumed.
- `bounded` fallback can temporarily exceed the global limit by a known local
  share during a partition.
- An edge crash can lose usage that had not yet been reported.
- Node processes simulate edge workers; deployment to a cloud-worker runtime
  would require a runtime-specific HTTP adapter.
- MongoDB Atlas mode should be smoke-tested with the deployment's own
  connection string before the final presentation.

These boundaries are part of the design and are documented in detail in
[docs/architecture.md](docs/architecture.md).
