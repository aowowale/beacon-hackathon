import type {
  AccelerationGoal,
  ConsentRecord,
  EmployeeProfile,
  ExpertRequest,
  ImpactQuery,
  ImpactSummary,
  Introduction,
  Opportunity,
  OutcomeRecord,
} from '../domain/types.js'

/** Context handed to the agent when drafting outreach. */
export interface OutreachContext {
  fromName: string
  toName: string
  topic: string
  reason: string
  interaction?: string
}

/** LLM-backed reasoning (Azure OpenAI in live mode). */
export interface AgentProvider {
  parseIntent(text: string): Promise<ExpertRequest>
  draftOutreach(context: OutreachContext): Promise<string>
}

/** People + opportunity graph (MS Graph / People Skills in live mode). */
export interface DirectoryProvider {
  searchCandidates(request: ExpertRequest): Promise<EmployeeProfile[]>
  getEmployee(id: string): Promise<EmployeeProfile | undefined>
  getGoal(employeeId: string): Promise<AccelerationGoal | undefined>
  listOpportunities(employeeId: string): Promise<Opportunity[]>
}

/** Side-effecting actions a human authorizes (send an intro, etc.). */
export interface ActionProvider {
  sendIntroduction(intro: Introduction): Promise<Introduction>
  getBatch(batchId: string): Promise<Introduction[]>
}

/** Durable record of outcomes + impact aggregation (Cosmos DB in live mode). */
export interface OutcomeStore {
  record(outcome: OutcomeRecord): Promise<OutcomeRecord>
  impact(query: ImpactQuery): Promise<ImpactSummary>
}

/** Async fan-out for workers (Service Bus in live mode). */
export interface EventBus {
  publish(topic: string, event: Record<string, unknown>): Promise<void>
}

/** Consent ledger — the source of truth for who is visible. */
export interface ConsentStore {
  get(employeeId: string): Promise<ConsentRecord>
  set(record: ConsentRecord): Promise<ConsentRecord>
}

export interface Providers {
  agent: AgentProvider
  directory: DirectoryProvider
  action: ActionProvider
  outcomes: OutcomeStore
  events: EventBus
  consent: ConsentStore
}
