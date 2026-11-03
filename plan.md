# EdgeGate project plan and context

This file is the single source of context for anyone (human or coding agent) continuing the project. Read it fully before changing code.

## 1. Assignment

Course: Advanced Cloud System Software Design, Continuous Assessment 1 (micro project). Teams of at most 2.

Selected case study: **Group 12, Edge-Based Distributed Rate Limiting Middleware**.

| Field | Value from the brief |
| --- | --- |
| Underlying cloud primitives | Edge workers / cloud functions, in-memory key-value store |
| System design layer built on top | Sliding-window token bucket engine with global sync batching |
| Required scope | Implement a system design abstraction layer on top of raw cloud primitives that provides specialised guarantees such as linearizability, fault tolerance or multi-tenant security |

Stack chosen by the team: MERN (MongoDB, Express, React, Node), JavaScript, ES modules.

Deliverables:

- Phase 1 (architecture diagram and data-flow specification): an architecture diagram showing the abstraction layer above the primitives; client read/write paths, background worker tasks and network boundaries; explicit failure and edge-case strategy covering component crashes, network partitions and data recovery. This is `docs/architecture.md`.
- Phase 2 (date to be announced): full code, fault-injection tests and benchmarks. These are `server/`, `server/test` and `server/bench`.

Evaluation is by a professor reading the design and watching a demo. The project must look like deliberately engineered systems work, small and consistent, not a pile of generated code.

## 2. What the system does

EdgeGate sits in front of a public API (the "origin"). Several edge nodes, one per simulated region, each admit or reject requests using only local memory. A coordinator backed by MongoDB keeps the global limit correct across edges.

Use case in one line: an API provider with free and pro customers wants to enforce each plan's quota, and limit login attempts per IP, from several regions without adding a network round trip to every request.

Demo origin endpoints: `POST /auth/login`, `GET /api/orders`, `GET /api/weather`, `GET /health`. Seed API keys: `key-free-acme` (free plan), `key-pro-globex` (pro plan).

Default rules (`server/src/rules/defaults.js`): login 5 per 60 s per IP; public API per tenant: free 20, pro 200, anonymous or unknown 10, each per 60 s, with a token-bucket burst.

## 3. Core design

### Algorithms (`server/src/engine`)

- **Token bucket** bounds bursts. Capacity is the tier's `burst`, refill rate is `limit / windowSec`.
- **Sliding-window counter**: `current + previous * (1 - elapsed / window)` over two fixed buckets. Used by the coordinator for global usage and by an edge for its local fallback.
- **Lease allocation**: `min(available, ceil(available * weight))` with `weight = (demand_node + 1) / (sum demand + max(known nodes, peers))`.

A request is admitted only if the quota check passes and the token bucket has a token. The bucket is charged only for requests the quota would admit.

### Leases (the central idea)

A lease is a number of requests the coordinator has reserved for one edge and one key. The edge decrements it locally. The coordinator grants a lease as `available = limit - slidingUsage - sum(leases held by other nodes)`, split by recent demand. A node's new lease replaces its old one. Therefore while the coordinator is reachable, usage plus outstanding leases never exceeds the limit at the time of each grant.

Timing, for sync interval `T` reported by the edge in each batch:

- edge honours a lease for `2T` after receiving it
- coordinator holds a lease for `3T` after granting it (longer, so skew cannot double-spend)
- leases of crashed nodes are reclaimed after they expire

First contact: when a request maps to a key with no live lease and the coordinator looks reachable, the edge syncs once before deciding (`edge/admission.js`). Without this, unsynced local admissions would break the invariant. Cost: one network wait per key on first contact and after lease expiry.

### Sync protocol

Edge to coordinator, `POST /sync`:

```json
{
  "nodeId": "edge-mumbai", "epoch": "boot-id", "seq": 12,
  "intervalMs": 1000, "peers": 3, "rulesVersion": 1,
  "reports": [{ "key": "public-api|tenant:acme", "ruleId": "public-api", "tier": "free", "admitted": 7, "denied": 31 }]
}
```

Coordinator reply: `{ grants: [{key, size}], leaseTtlMs, serverTime, rulesVersion, rules? }` where `rules` is present only if the edge's version is stale.

Properties:

- idempotent: `(nodeId, epoch, seq)` is claimed once; replays do not add usage but still return fresh grants
- an unacknowledged batch is kept and re-sent with the same `seq` (`SyncClient.inflight`); new usage accumulates separately
- `epoch` is a per-boot id so a restarted node reusing `seq` 0 is not mistaken for a replay
- coordinator assigns window buckets from its own clock on receipt, so edge clock skew does not affect global counts
- after applying a response the edge subtracts admissions made since the batch was drained

### Failure modes (`EDGE_FAIL_MODE`)

When a key has no live lease and the coordinator is unreachable:

- `bounded` (default): enforce a static share `max(1, floor(limit / peers))` with a local sliding window
- `open`: admit
- `closed`: reject

Measured and tested bounds are listed in section 7.

## 4. Repository layout and module rules

Modular monolith: one codebase, several runtime roles (edge, coordinator, origin) started from `server/bin`. Each module in `server/src` exposes only its `index.js`.

```
server/src/
  shared/       clock, logger, config, http helpers
  engine/       token-bucket, sliding-window, allocation        (no dependencies)
  kv/           bounded LRU store with idle expiry              (no dependencies)
  rules/        schema validation, request resolution, defaults (no dependencies)
  chaos/        FaultInjector for the edge-to-coordinator link  (no dependencies)
  store/        MongoDB persistence                              (shared)
  coordinator/  sync-service, keyed-mutex, batch validation, app (engine, rules, shared)
  edge/         enforcer, key-state, sync-client, admission, proxy, middleware, app, node
                                                                (engine, kv, rules, chaos, shared)
  origin/       demo API                                        (none)
server/bin/     origin.js, coordinator.js, edge.js, dev.js (supervisor that restarts crashed processes)
server/harness/ in-process cluster with a manual clock, used by tests and benchmarks
server/test/    unit, integration, HTTP, architecture
server/bench/   accuracy.js, latency.js
client/         React + Vite dashboard (plain CSS, no UI library)
docs/           architecture.md
```

The allowed dependency map is enforced by `server/test/architecture/boundaries.test.js`. Cross-module imports must target `<module>/index.js`. If you add a module or dependency, update the map in that test.

Ports: origin 4100, coordinator 4000, edges 4201 (Mumbai), 4202 (Frankfurt), 4203 (Virginia), dashboard 5173.

Edge control plane (not rate limited): `GET /_edge/state`, `PUT /_edge/faults` (`partitioned`, `lostResponseRate`, `latencyMs`), `POST /_edge/crash`.
Coordinator: `POST /sync`, `GET /rules`, `PUT /admin/rules`, `GET /admin/usage?key=`, `POST /admin/crash`, `GET /health`.

Configuration is environment based, see `.env.example` and `server/src/shared/config.js`.

## 5. Commands

```bash
npm install
npm test                 # node:test, no external services needed
npm run bench            # accuracy (virtual time) and latency (real time) benchmarks
npm run db:up            # MongoDB 7 via docker compose
npm run dev              # origin, coordinator (Mongo), 3 edges
npm run dev              # origin, coordinator (Mongo), 3 edges
npm run dashboard        # React dashboard on :5173
```

## 6. Demo script

1. `npm run db:up`, `npm run dev`, and `npm run dashboard`.
2. Traffic panel: free plan, all edges, 60 requests. Global budget bar fills to 20 and never beyond; every edge shows `leased` mode.
3. Send to Mumbai only. Idle edges' leases shrink and Mumbai receives the freed budget on the next syncs.
4. Rules panel: lower the free limit to 5 and publish. Edges move to the new version within one sync interval.
5. Partition Frankfurt. Its keys switch to `local` mode and it keeps serving its static share; heal it and watch usage reconcile.
6. Enable "Lose replies" on one edge and send traffic: usage in the coordinator still matches what was admitted.
7. Crash an edge: the supervisor restarts it and it rejoins with a new epoch. Crash the coordinator: edges keep deciding from leases.
8. Run `npm run bench` and walk through the sync interval trade-off table.

## 7. Verification status

Run in the build environment (Node 22):

- `npm test`: 47 tests passing. They cover the engine, KV, rules, coordinator idempotency and lease reclamation, concurrent syncs, partitions, lost replies, restarts, fail modes, hot rule reload, module boundaries and the real HTTP path (edge, coordinator, origin as actual servers).
- A multi-process smoke test of the MongoDB-backed stack was done with curl: limiting across three edges, coordinator usage endpoint, CORS preflight for the dashboard, edge crash and automatic restart, live rule change.
- `npm run build -w client` succeeds.

Not verified:

- **`MongoStore` has not been run against a real MongoDB** (none was available in the build environment). It uses `updateOne` with `$inc` and upsert, `replaceOne` upserts, a unique `_id` for batch claims and TTL indexes. Run the stack with `npm run dev` and re-run the smoke test before relying on it. A good next step is a test that runs the same contract tests against both stores.
- The dashboard was loaded in a real browser (Chromium) against live backends at desktop and phone widths, including a traffic run and a tooltip hover. Fault buttons, rule changes and crash buttons were not clicked through in the browser; the endpoints behind them were exercised with curl.

Observed behaviour (virtual time, limit 20 per 60 s unless noted):

| Scenario | Result |
| --- | --- |
| All three edges hammered for 20 s | 20 admitted |
| One busy edge, two idle, 30 s | 19 admitted |
| One edge partitioned for 10 s | 26 admitted, equal to limit plus one local share (6) |
| Edge crashes with 7 admissions not yet synced | the 7 are never counted; survivors admit exactly 20 |
| Lost sync reply | usage counted once |

Benchmark highlights (limit 100, 3 edges): without sync, 216 admitted on a skewed load (116% over); leased sync stays at 100 with 0% overshoot. Premature rejects grow with the sync interval (10 at 100 ms, 86 at 1 s, 552 at 5 s) while coordinator calls fall (1582, 155, 30) versus 3134 for a call per request. Local decision cost is about 0.5 us p50 and 1.2 us p99, roughly 1.8 million decisions per second on one thread (batch-mean timing, see `bench/latency.js`).

## 8. Known limitations (be honest about these in the viva)

- One active coordinator. The per-key mutex is in process; multiple replicas would need compare-and-set or transactions on lease documents.
- The sliding window is the two-bucket approximation, not an exact log.
- Fail mode `bounded` can exceed the global limit during a partition by up to one local share per partitioned edge. A crash loses unreported usage (at most the lease held).
- Cold start is conservative: with limit 20 and 3 edges, the first round of leases leaves budget unallocated, producing a few premature rejects until demand-based reallocation.
- Lease safety assumes a round trip shorter than the sync interval.
- Client identity is the socket address or an API key; there is no authentication of keys beyond the rule set lookup.
- Edges are Node processes standing in for edge workers. The engine and enforcer have no Node-specific dependencies, so porting to a worker runtime means replacing `edge/app.js`, `proxy.js` and `http-transport.js`. This has not been done.

## 9. Conventions for further work

- Plain JavaScript, ES modules, no TypeScript, no extra frameworks. Prefer the standard library (`node:test`, `fetch`).
- Keep comments rare and about why, never what. No decorative banners, emojis or badges anywhere, including the UI and docs.
- Business logic stays in pure classes with injected clock and transport so it can be tested with `ManualClock` and the in-process harness.
- Every behavioural claim in the docs must be backed by a test or benchmark in this repo.
- Dashboard copy is plain English for a developer who has not seen the project. Say "Blocked", "Quota held", "Disconnect", not internal terms. Any term that is new to a reader gets a small info button (`client/src/components/InfoTip.jsx`) with a one or two sentence explanation. The only icon in the app is the lucide `Info` icon; no emojis, pills or badges. Status is a coloured dot plus a word.
- Keep modules small. If a file passes about 150 lines, check whether it is doing two jobs.

## 10. Possible polish (in rough priority order)

1. MongoDB-backed store contract test, plus a compose-based smoke test.
2. Export the Mermaid diagram in `docs/architecture.md` to an image for the Phase 1 submission and slides.
3. Per-key lease history chart on the dashboard (leases are already returned by `/admin/usage`).
4. A Workers-style adapter for the edge to show portability.
5. Persist coordinator demand estimates (currently carried on lease documents, so already durable) and add lease revocation on rule tightening.
6. Short report: problem, design, guarantees and bounds, results table, limitations.
