# @beacon/api

The Beacon production API — the human opportunity router. Node 22 + Fastify + TypeScript.

## Provider seam

Everything external lives behind a provider interface (`src/providers/types.ts`). A single
env var switches the whole app between a fully-local deterministic implementation and live
Azure services:

| `PROVIDER_MODE` | Agent | Directory | Actions | Outcomes | Events | Consent |
| --- | --- | --- | --- | --- | --- | --- |
| `fake` (default) | rules-based parser | seeded in-memory graph | in-memory | in-memory + deterministic impact | in-memory | in-memory |
| `live` | Azure OpenAI | Microsoft Graph / People Skills | Graph / Teams | Cosmos DB | Service Bus | consent ledger |

Because `fake` mode needs no cloud, the entire service builds, runs, and tests locally with
no credentials.

## Run it

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:8080/health
npm test               # core + full route/integration suite
npm run build          # tsc → dist/
npm start              # node dist/server.js
```

## Endpoints (v1)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health`, `/ready` | Liveness / readiness |
| POST | `/v1/acceleration/plan` | Goal → ranked, drafted opportunity plan |
| POST | `/v1/acceleration/plan/:planId/connect` | Draft introductions for the whole plan |
| GET | `/v1/acceleration/batch/:batchId` | Batch status |
| POST | `/v1/connect/match` | Natural-language expert finding + drafted outreach |
| POST | `/v1/connect/:matchId/introduce` | Human-authorized send of one introduction |
| POST | `/v1/outcomes` | Record an outcome |
| GET | `/v1/impact` | Impact summary (`community`, `period`, `region` filters) |
| GET/PUT | `/v1/me/consent` | Read / update a consent record |

## Responsible-by-design guarantees (enforced in code)

- **Consent-first** — `scoreProfiles` and `orderOpportunities` filter out anyone/anything
  not opted in *before* scoring. See `test/matching.test.ts` (`emp-omar-said` never appears).
- **Draft-then-send** — the orchestrator only ever produces `status: 'drafted'`. A separate,
  human-triggered call flips it to `sent`.
- **Approved signals only** — the domain model has no field for performance, private content,
  or inferred potential.

## Deploy

Container image via [`Dockerfile`](Dockerfile). Infrastructure in [`../infra`](../infra)
(Bicep + `azd`). CI in [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
