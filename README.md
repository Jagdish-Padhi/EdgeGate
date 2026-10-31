# EdgeGate

Edge-based distributed rate limiting for the CA1 SSD micro project, Group 12. Admission decisions are made in memory at each edge node, and a coordinator keeps the global limit correct by leasing budget to the nodes in batched syncs.

The design is documented in [docs/architecture.md](docs/architecture.md). Project context and working notes are in [plan.md](plan.md).

## Requirements

Node.js 20 or newer. Docker is optional and only needed for MongoDB.

## Run

```bash
npm install

# Without MongoDB (usage is lost if the coordinator restarts)
npm run dev:memory

# With local MongoDB
npm run db:up
npm run dev
```

`STORE=mongo` is the default. The coordinator persists usage windows, leases,
batch idempotency records, and the active rule set in the configured MongoDB
database. For MongoDB Atlas, copy `.env.example` to `.env`, set `MONGO_URI` to
your Atlas connection string, and run `npm run dev` without `npm run db:up`.
For a local-only demo, use `npm run dev:memory`.

To demonstrate a realistic but controlled coordinator link, set these in `.env`
before starting the stack:

```env
EDGE_SYNC_LATENCY_MS=40
EDGE_SYNC_JITTER_MS=20
EDGE_SYNC_LOSS_RATE=0.02
```

These affect synchronization only; request admission remains a local edge
decision once a lease is available.

This starts the origin API (4100), the coordinator (4000) and three edge nodes (4201 to 4203), and restarts any process that crashes. In a second terminal start the dashboard:

```bash
npm run dashboard
```

Open http://localhost:5173.

Try a request directly:

```bash
curl -i -H 'x-api-key: key-free-acme' http://localhost:4201/api/orders
```

## Test and benchmark

```bash
npm test
npm run bench
```

## Layout

```
server/
  src/        modules: engine, kv, rules, edge, coordinator, store, chaos, origin, shared
  bin/        process entry points and the dev supervisor
  harness/    in-process cluster used by tests and benchmarks
  test/       unit, integration, HTTP and architecture tests
  bench/      accuracy and latency benchmarks
client/       React dashboard
docs/         architecture
```
