# Beacon — Submission Copy (Agentic Expert Networking Executive Challenge)

> Link this project to the **Agentic Expert Networking** Executive Challenge — not "Other."

## One-sentence pitch
Beacon is the **human opportunity router**: an agent that turns any employee's goal into the *right people and experiences* — mentors, sponsors, experts, peers, cohorts, and communities — and connects them in one consent-based click.

## Target customer
Every employee whose growth is capped by their network, not their ability — starting with high-potential talent far from headquarters (e.g. a Cloud Solution Architect in Recife), and the C+AI **HOLA** community as the launch pilot. Secondary users: managers, mentors, and the org leaders who need to see where opportunity is — and isn't — flowing.

## The problem
Careers are decided by who you already know. Our current tools tell people *what* skill to build, then leave them alone with a to-do list. The hardest part — reaching the human who opens the next door — is exactly where the tooling stops. Talent is everywhere; access to opportunity is not.

## What we made
A working prototype of the routing experience:
- **Accelerate (hero):** An employee's career goal becomes a live plan — skill signals plus six explainable human opportunities across six kinds (mentor, peer, sponsor, shadow, cohort, community). One **Connect me to all 6** action fans out every introduction, each with a plain-language confirmation, while every recipient keeps the choice to accept.
- **Connect (proof):** The same engine answers the urgent ask — find the right expert this week — with a "Why this match?" explanation and a consent-based introduction.
- **Impact:** A synthetic pilot dashboard showing reach by region and language, mentoring participation, and the expert-capacity gap, with a HOLA filter.

## Novelty
Directories tell you a person *exists*. Beacon is a **router**, not a directory: it reasons from a goal to a *portfolio of relationships and experiences* and starts them all at once — spanning mentorship, sponsorship, expertise, peers, learning cohorts, and community — with the agent doing the reach-out and the human keeping the decision.

## Business value
- **Retention & mobility:** turns stalled goals into moving relationships, especially for underexposed talent.
- **Speed to expertise:** urgent problems reach the right person in days, not weeks.
- **Equity of access:** opportunity stops depending on geography or existing network.
- **Visibility:** leaders finally see where opportunity flows and where the gaps are.

## Feasibility
The prototype runs on deterministic local orchestration behind clean service interfaces (matching, plan assembly, agent intent). Each is a drop-in seam for production: **Microsoft Graph / People Skills** for approved signals, **Azure OpenAI / Copilot Studio** for intent and drafting, **Teams & calendar** for the actions, **Power BI** for impact. Nothing in the demo fakes a live integration — the seams are real and named.

## Responsible AI
- **Consent-first:** only opted-in people appear; recipients can decline.
- **Approved signals only:** declared skills, languages, availability, certifications, mentoring preference, community membership. No private-message analysis.
- **No employee scoring:** Beacon never ranks people, predicts promotions, or infers "potential." It surfaces *relevance*, with the reason shown.
- **Human in control:** the agent drafts; the human sends and accepts.
- **Data minimization:** demo uses labeled synthetic data; only demo-safe outcomes retained.

## Pilot: C+AI HOLA
Launch with the HOLA community — Portuguese/Spanish-speaking technologists — where language, geography, and network gaps hit hardest and where opt-in mentoring culture already exists. The Impact view ships with a HOLA filter to measure reach from day one.

## Next steps
1. Wire Graph/People Skills for live approved signals behind the existing matching seam.
2. Replace the deterministic intent parser with Azure OpenAI / Copilot Studio.
3. Ship real Teams + calendar actions for introductions and shadow bookings.
4. Run the HOLA pilot; measure connections started, accepted, and career moves influenced.

---
*Positioning: People Skills is the intelligence layer; **Beacon is the action layer.** Beacon complements existing investments like Career Hub by converting their recommendations into real human connections and measurable outcomes.*
