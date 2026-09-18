import type { OutcomeStore } from '../types.js'
import type {
  ImpactQuery,
  ImpactSummary,
  OutcomeRecord,
} from '../../domain/types.js'

const BASE = {
  all: { reached: 2847, connections: 1214, languages: 38, rate: 84 },
  hola: { reached: 486, connections: 214, languages: 8, rate: 87 },
}

const regionFactor = (region: ImpactQuery['region']): number =>
  region === 'americas' ? 0.42 : region === 'emea' ? 0.33 : 1

const periodFactor = (period: ImpactQuery['period']): number =>
  period === 'last_30_days' ? 0.2 : 1

const TREND = [
  { month: 'Apr', connections: 120, resolved: 96 },
  { month: 'May', connections: 180, resolved: 150 },
  { month: 'Jun', connections: 260, resolved: 220 },
  { month: 'Jul', connections: 360, resolved: 310 },
  { month: 'Aug', connections: 520, resolved: 450 },
  { month: 'Sep', connections: 700, resolved: 610 },
]

const CAPACITY = [
  { domain: 'Power Platform', demand: 100, capacity: 63 },
  { domain: 'Azure AI', demand: 92, capacity: 78 },
  { domain: 'Data', demand: 74, capacity: 66 },
  { domain: 'Security', demand: 60, capacity: 58 },
]

export class FakeOutcomeStore implements OutcomeStore {
  private readonly records: OutcomeRecord[] = []

  async record(outcome: OutcomeRecord): Promise<OutcomeRecord> {
    this.records.push(outcome)
    return outcome
  }

  async impact(query: ImpactQuery): Promise<ImpactSummary> {
    const hola = query.community?.toLocaleLowerCase().includes('hola')
    const base = hola ? BASE.hola : BASE.all
    const scale = regionFactor(query.region) * periodFactor(query.period)
    const round = (n: number) => Math.max(1, Math.round(n))
    return {
      employeesReached: round(base.reached * scale),
      connectionsMade: round(base.connections * scale),
      needsResolvedPct: base.rate,
      languagesReached: round(Math.max(4, base.languages * regionFactor(query.region))),
      trend: TREND.map((m) => ({
        month: m.month,
        connections: round(m.connections * scale),
        resolved: round(m.resolved * scale),
      })),
      capacity: CAPACITY.map((d) => ({
        domain: d.domain,
        demand: round(d.demand * scale),
        capacity: round(d.capacity * scale),
      })),
    }
  }
}
