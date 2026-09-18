import type { ConsentStore } from '../types.js'
import type { ConsentRecord } from '../../domain/types.js'
import { employees } from './seed.js'

const defaultConsent = (employeeId: string): ConsentRecord => {
  const employee = employees.find((e) => e.id === employeeId)
  return {
    employeeId,
    optedIn: employee?.optedIn ?? false,
    shareSkills: true,
    shareAvailability: true,
    openToMentoring: employee?.mentor ?? false,
    updatedAt: new Date().toISOString(),
  }
}

export class FakeConsentStore implements ConsentStore {
  private readonly store = new Map<string, ConsentRecord>()

  async get(employeeId: string): Promise<ConsentRecord> {
    return this.store.get(employeeId) ?? defaultConsent(employeeId)
  }

  async set(record: ConsentRecord): Promise<ConsentRecord> {
    const next = { ...record, updatedAt: new Date().toISOString() }
    this.store.set(record.employeeId, next)
    return next
  }
}
