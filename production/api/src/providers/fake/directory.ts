import type { DirectoryProvider } from '../types.js'
import type {
  AccelerationGoal,
  EmployeeProfile,
  ExpertRequest,
  Opportunity,
} from '../../domain/types.js'
import { employees, goals, opportunities } from './seed.js'

export class FakeDirectoryProvider implements DirectoryProvider {
  async searchCandidates(_request: ExpertRequest): Promise<EmployeeProfile[]> {
    // The core scorer applies topic/language/consent filters; the directory
    // simply returns the searchable population.
    return employees.slice()
  }

  async getEmployee(id: string): Promise<EmployeeProfile | undefined> {
    return employees.find((employee) => employee.id === id)
  }

  async getGoal(employeeId: string): Promise<AccelerationGoal | undefined> {
    return goals[employeeId]
  }

  async listOpportunities(employeeId: string): Promise<Opportunity[]> {
    return opportunities[employeeId] ?? []
  }
}
