# Beacon — production system

The deployable, Azure-native implementation of Beacon (the human opportunity router).
The interactive demo lives in the repository root; this folder is the real system behind it.

```
production/
├── api/            Node 22 + Fastify + TypeScript service (fully working, tested)
├── web/            React app + typed API client (thin layer over api/)
├── infra/          Bicep (Container Apps, OpenAI, Cosmos, Service Bus, Key Vault, …)
└── azure.yaml      Azure Developer CLI (azd) manifest
```

## Design principle: the provider seam

The whole system runs locally with **zero cloud dependencies** and flips to Azure with one
env var. Every external dependency sits behind an interface in
[`api/src/providers/types.ts`](api/src/providers/types.ts):

| Capability | `PROVIDER_MODE=fake` | `PROVIDER_MODE=live` |
| --- | --- | --- |
| Reasoning / drafting | deterministic rules | Azure OpenAI |
| People + opportunities | seeded graph | Microsoft Graph / People Skills |
| Actions (send intro) | in-memory | Graph / Teams |
| Outcomes + impact | in-memory + deterministic | Cosmos DB |
| Events | in-memory | Service Bus |
| Consent ledger | in-memory | consent store |

This is what makes the system testable and demoable end-to-end without provisioning anything.

## Responsible by design — enforced in code, not just docs

- **Consent-first** — non-opted-in people/opportunities are filtered *before* scoring
  (`api/src/core/matching.ts`, `acceleration.ts`; proven by `api/test/matching.test.ts`).
- **Draft-then-send** — the orchestrator only ever emits `drafted`; a separate human action
  produces `sent`.
- **No employee scoring** — the domain model has no performance/private/inferred fields.

## Quick start (local, no cloud)

```bash
cd api
npm install
npm run build
npm test          # 13 tests: core + full route/integration suite
npm run dev       # http://localhost:8080/health
```

## Deploy to Azure

Commercial Azure (AzureCloud) from any desktop:

```bash
az login
azd up            # provisions infra/ and deploys the api container
```

The container runs with `PROVIDER_MODE=live`, a system-assigned managed identity, and
`disableLocalAuth` on Cosmos / Service Bus / OpenAI (Entra-only, no keys).

See the full design in [`../docs/production-implementation-plan.md`](../docs/production-implementation-plan.md).
