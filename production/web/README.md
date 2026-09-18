# @beacon/web

The Beacon production web app. It reuses the demo's React UI and Clawpilot theme
(in the repository root `src/`) but replaces the in-browser deterministic core with
live calls to the production API via a typed client.

## What is here today

- [`src/beaconClient.ts`](src/beaconClient.ts) — a typed, auth-aware client for the
  v1 API (`/v1/acceleration/plan`, `/v1/connect/match`, `/v1/impact`, …). It accepts a
  `getToken()` callback so an MSAL/Entra ID token is attached to every request.

## Wiring it to the UI

1. Copy the three surfaces from the root demo (`../../src/App.tsx`, `App.css`, `index.css`).
2. Replace direct calls to the local `matching`/`acceleration` modules with `BeaconClient`
   methods, keeping the exact same view models.
3. Add MSAL (`@azure/msal-browser`) sign-in and pass `getToken` into `BeaconClient`.

## Environment

```bash
VITE_API_BASE_URL=https://<api-fqdn>     # from `azd env get-values` / infra output
VITE_ENTRA_CLIENT_ID=<spa-app-registration>
VITE_ENTRA_TENANT_ID=<tenant-id>
```

Because the demo already renders every surface against the same view models, this layer is
intentionally thin — the deterministic core in the demo and the live core in the API produce
the same shapes.
