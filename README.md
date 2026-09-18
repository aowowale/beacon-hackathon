# Beacon — the human opportunity router

**Beacon is an agentic layer that turns a career goal into the right people, experiences, and introductions — and starts every one of them for you.**

Most talent tools tell you *what* to do. Beacon connects you to the *who* and the *how*: the mentor who has walked your path, the peer solving the same problem, the sponsor who can open a door, the community where your language and context are already understood. An agent gathers approved signals, ranks relevance transparently, drafts the outreach, and waits for a human to press send.

> Submitted to the **Agentic Expert Networking Executive Challenge**.

---

## Why it matters

Expertise inside a large organization is abundant but invisible. People stall not because help doesn't exist, but because they can't find the right human at the right moment. Beacon makes that connection routable — consent-first, signal-based, and human-controlled.

## The three surfaces

| Surface | What it does |
| --- | --- |
| **Accelerate** | Takes your goal and returns a ranked set of opportunities (mentor, peer, sponsor, shadow, cohort, community), each with a plain-language reason. One click drafts the introductions. |
| **Connect** | Natural-language expert finding — describe a need, get matched people with the *why*, and an agent-drafted intro ready to send. |
| **Impact** | Reach, connection quality, and expert-capacity gaps, filterable by community, period, and region. |

## Responsible by design

Beacon is built on four non-negotiables (surfaced in-app under **Trust & transparency**):

- **Consent-first** — only opted-in people appear; every recipient can decline; nothing is sent without a human.
- **Approved signals only** — skills, languages, availability, certifications, mentoring preference, community membership. Never private content or inferred potential.
- **No employee scoring** — Beacon surfaces relevance and shows the reason; it never ranks people or predicts performance.
- **Human in control** — the agent drafts and proposes; humans decide what to send and what to accept.

---

## This repository

This repo contains two things:

### 1. `/` — the interactive demo (this folder)

A self-contained React + TypeScript + Vite prototype with a deterministic matching and acceleration core, styled with the Clawpilot theme (light/dark). No backend required — it runs entirely in the browser on synthetic data.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm test         # deterministic core (matching + acceleration)
npm run lint
npm run build    # tsc -b && vite build
```

Key modules:

- `src/domain.ts` — types and the protagonist's world (Maria Oliveira, Cloud Solution Architect, Recife).
- `src/data.ts` — synthetic experts, opportunities, and impact data.
- `src/matching.ts` / `src/matching.test.ts` — signal-based expert ranking.
- `src/acceleration.ts` / `src/acceleration.test.ts` — goal to opportunity plan.
- `src/App.tsx` — the three surfaces plus the Trust & transparency modal.

### 2. `production/` — the production-scale system

A separate, deployable implementation of the same product on Azure — Node 22 + Fastify + TypeScript, a provider seam that runs fully local with fakes (`PROVIDER_MODE=fake`) or against live Azure services (`PROVIDER_MODE=live`), infrastructure as Bicep + `azd`, and CI. See [`production/README.md`](production/README.md) and [`docs/production-implementation-plan.md`](docs/production-implementation-plan.md).

## Docs

- [`docs/production-implementation-plan.md`](docs/production-implementation-plan.md) — full architecture, data model, security/RAI, milestones.
- [`docs/video-script.md`](docs/video-script.md) — 120-second walkthrough.
- [`docs/submission-copy.md`](docs/submission-copy.md) — rubric-mapped submission text.
