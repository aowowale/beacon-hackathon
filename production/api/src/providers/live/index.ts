import type { AppConfig } from '../../config.js'
import type {
  ActionProvider,
  ConsentStore,
  DirectoryProvider,
  EventBus,
  OutcomeStore,
} from '../types.js'
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
} from '../../domain/types.js'

export { LiveAgentProvider } from './agent.js'

/**
 * Remaining live provider scaffolding. These classes define the exact
 * integration seam for Azure services still to be wired (Graph directory,
 * Cosmos persistence, Service Bus events). Until those are provisioned each
 * method throws a descriptive error so a misconfigured live deployment fails
 * fast and loudly rather than silently.
 */

const pending = (service: string): never => {
  throw new Error(
    `[live] ${service} integration is not yet provisioned. ` +
      `Provision the Azure resource and install its SDK, or run with PROVIDER_MODE=fake.`,
  )
}

export class LiveDirectoryProvider implements DirectoryProvider {
  constructor(private readonly config: AppConfig) {}
  async searchCandidates(_request: ExpertRequest): Promise<EmployeeProfile[]> {
    return pending(`Microsoft Graph (${this.config.GRAPH_BASE_URL})`)
  }
  async getEmployee(_id: string): Promise<EmployeeProfile | undefined> {
    return pending('Microsoft Graph getEmployee')
  }
  async getGoal(_employeeId: string): Promise<AccelerationGoal | undefined> {
    return pending('Career goal store')
  }
  async listOpportunities(_employeeId: string): Promise<Opportunity[]> {
    return pending('Opportunity store')
  }
}

export class LiveActionProvider implements ActionProvider {
  async sendIntroduction(_intro: Introduction): Promise<Introduction> {
    return pending('Graph / Teams introduction')
  }
  async getBatch(_batchId: string): Promise<Introduction[]> {
    return pending('Introduction batch store')
  }
}

export class LiveOutcomeStore implements OutcomeStore {
  constructor(private readonly config: AppConfig) {}
  async record(_outcome: OutcomeRecord): Promise<OutcomeRecord> {
    return pending(`Cosmos DB (${this.config.COSMOS_DATABASE})`)
  }
  async impact(_query: ImpactQuery): Promise<ImpactSummary> {
    return pending('Cosmos DB impact aggregation')
  }
}

export class LiveEventBus implements EventBus {
  constructor(private readonly config: AppConfig) {}
  async publish(_topic: string, _event: Record<string, unknown>): Promise<void> {
    pending(`Service Bus (${this.config.SERVICE_BUS_NAMESPACE})`)
  }
}

export class LiveConsentStore implements ConsentStore {
  async get(_employeeId: string): Promise<ConsentRecord> {
    return pending('Consent ledger')
  }
  async set(_record: ConsentRecord): Promise<ConsentRecord> {
    return pending('Consent ledger')
  }
}
