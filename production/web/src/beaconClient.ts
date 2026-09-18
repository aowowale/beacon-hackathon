/**
 * Typed client for the Beacon production API. The web app (or any consumer)
 * uses this instead of hand-rolling fetch calls. It mirrors the v1 contract in
 * `../../api/src/routes`.
 */

export interface EmployeeProfile {
  id: string
  name: string
  initials: string
  role: string
  location: string
  languages: string[]
  skills: string[]
  availability: string
  mentor: boolean
  optedIn: boolean
  community?: string
}

export interface ExpertMatch {
  matchId: string
  profile: EmployeeProfile
  reasons: string[]
  confidence: 'Strong match' | 'Good match'
  draftOutreach: string
}

export interface Opportunity {
  id: string
  kind: string
  title: string
  owner: string
  reason: string
  timeframe: string
  draftOutreach?: string
}

export interface AccelerationPlan {
  planId: string
  goal: { employee: string; title: string; horizon: string }
  opportunities: Opportunity[]
}

export interface ImpactSummary {
  employeesReached: number
  connectionsMade: number
  needsResolvedPct: number
  languagesReached: number
  trend: { month: string; connections: number; resolved: number }[]
  capacity: { domain: string; demand: number; capacity: number }[]
}

export interface BeaconClientOptions {
  baseUrl: string
  /** Returns a bearer token (Entra ID access token) for the current user. */
  getToken?: () => Promise<string | undefined>
}

export class BeaconClient {
  constructor(private readonly options: BeaconClientOptions) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.options.getToken?.()
    const res = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(body.message ?? `Request failed: ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  buildPlan(employeeId: string): Promise<AccelerationPlan> {
    return this.request('/v1/acceleration/plan', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    })
  }

  findExperts(description: string): Promise<{ matches: ExpertMatch[] }> {
    return this.request('/v1/connect/match', {
      method: 'POST',
      body: JSON.stringify({ description }),
    })
  }

  impact(query: { community?: string; period?: string; region?: string } = {}): Promise<ImpactSummary> {
    const params = new URLSearchParams(query as Record<string, string>).toString()
    return this.request(`/v1/impact${params ? `?${params}` : ''}`)
  }
}
