import { randomUUID } from 'node:crypto'
import type { Providers } from './providers/types.js'
import { rankSuppliedCandidates, scoreProfiles } from './core/matching.js'
import { orderOpportunities } from './core/acceleration.js'
import { badRequest, notFound } from './domain/errors.js'
import type {
  AccelerationPlan,
  EmployeeProfile,
  ExpertMatch,
  ExpertRequest,
  ImpactQuery,
  ImpactSummary,
  Introduction,
  OutcomeRecord,
} from './domain/types.js'
import type { FakeActionProvider } from './providers/fake/action.js'

const planIdFor = (employeeId: string) => `plan-${employeeId}`
const employeeIdFromPlan = (planId: string) =>
  planId.startsWith('plan-') ? planId.slice('plan-'.length) : planId

/**
 * The Beacon orchestrator. Every path enforces consent before drafting, and
 * the agent only ever *drafts* — a human action is always required to send.
 */
export class Orchestrator {
  constructor(private readonly providers: Providers) {}

  /**
   * Natural-language expert finding. In Demo/Live the seeded directory supplies
   * candidates; in Production the caller passes real people (e.g. Microsoft
   * Graph colleagues) plus their own name so outreach is drafted in first person.
   */
  async findExperts(
    text: string,
    options: { candidates?: EmployeeProfile[]; requesterName?: string } = {},
  ): Promise<{ request: ExpertRequest; matches: ExpertMatch[] }> {
    if (!text.trim()) throw badRequest('A request description is required')
    const { agent, directory } = this.providers
    const request = await agent.parseIntent(text)
    const fromName = options.requesterName?.trim() || 'Maria Oliveira'
    const scored =
      options.candidates && options.candidates.length > 0
        ? rankSuppliedCandidates(options.candidates, request)
        : scoreProfiles(await directory.searchCandidates(request), request)
    const matches: ExpertMatch[] = []
    for (const item of scored) {
      const draftOutreach = await agent.draftOutreach({
        fromName,
        toName: item.profile.name,
        topic: request.topic,
        reason: item.reasons[0] ?? 'Relevant expertise',
        interaction: request.interaction,
      })
      matches.push({
        matchId: `match-${item.profile.id}`,
        profile: item.profile,
        reasons: item.reasons,
        confidence: item.confidence,
        draftOutreach,
      })
    }
    return { request, matches }
  }

  /** Goal → ordered, consent-filtered, agent-drafted opportunity plan. */
  async buildPlan(employeeId: string): Promise<AccelerationPlan> {
    const { directory, agent } = this.providers
    const goal = await directory.getGoal(employeeId)
    if (!goal) throw notFound(`No goal found for ${employeeId}`)
    const ordered = orderOpportunities(await directory.listOpportunities(employeeId))
    const opportunities = []
    for (const opportunity of ordered) {
      const draftOutreach = await agent.draftOutreach({
        fromName: goal.employee,
        toName: opportunity.owner,
        topic: opportunity.title,
        reason: opportunity.reason,
      })
      opportunities.push({ ...opportunity, draftOutreach })
    }
    return { planId: planIdFor(employeeId), goal, opportunities }
  }

  /** Draft introductions for every opportunity in a plan (no send yet). */
  async draftPlanIntroductions(planId: string): Promise<{ batchId: string; introductions: Introduction[] }> {
    const employeeId = employeeIdFromPlan(planId)
    const plan = await this.buildPlan(employeeId)
    const batchId = randomUUID()
    const now = new Date().toISOString()
    const introductions: Introduction[] = plan.opportunities.map((opportunity) => ({
      id: randomUUID(),
      batchId,
      fromEmployeeId: employeeId,
      toEmployeeId: opportunity.id,
      opportunityKind: opportunity.kind,
      message: opportunity.draftOutreach ?? opportunity.reason,
      status: 'drafted',
      createdAt: now,
    }))
    this.registerBatch(batchId, introductions)
    await this.providers.events.publish('beacon.plan.drafted', { planId, batchId, count: introductions.length })
    return { batchId, introductions }
  }

  async getBatch(batchId: string): Promise<Introduction[]> {
    return this.providers.action.getBatch(batchId)
  }

  /** Human-authorized send of a single introduction. */
  async sendIntroduction(input: {
    matchId: string
    fromEmployeeId: string
    toEmployeeId: string
    message: string
    opportunityKind?: Introduction['opportunityKind']
  }): Promise<Introduction> {
    const intro: Introduction = {
      id: randomUUID(),
      batchId: input.matchId,
      fromEmployeeId: input.fromEmployeeId,
      toEmployeeId: input.toEmployeeId,
      opportunityKind: input.opportunityKind ?? 'Connect',
      message: input.message,
      status: 'drafted',
      createdAt: new Date().toISOString(),
    }
    this.registerBatch(intro.batchId, [intro])
    const sent = await this.providers.action.sendIntroduction(intro)
    await this.providers.events.publish('beacon.introduction.sent', {
      introductionId: sent.id,
      toEmployeeId: sent.toEmployeeId,
    })
    return sent
  }

  async recordOutcome(outcome: OutcomeRecord): Promise<OutcomeRecord> {
    const stored = await this.providers.outcomes.record(outcome)
    await this.providers.events.publish('beacon.outcome.recorded', { id: stored.id, resolved: stored.resolved })
    return stored
  }

  async impact(query: ImpactQuery): Promise<ImpactSummary> {
    return this.providers.outcomes.impact(query)
  }

  private registerBatch(batchId: string, intros: Introduction[]): void {
    const action = this.providers.action as Partial<FakeActionProvider>
    action.registerBatch?.(batchId, intros)
  }
}
