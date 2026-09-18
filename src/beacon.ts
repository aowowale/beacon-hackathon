// Live-mode data layer: calls the deployed Beacon API and maps responses to the
// demo's domain shapes so the same views render both demo (local seed) and live data.
import type {
  AccelerationPlan, Availability, EmployeeProfile, ExpertMatch, OpportunityKind,
} from './domain'

// Same-origin when the SPA is served by the API container; override for local dev.
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const MARIA_ID = 'emp-maria-oliveira'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

interface ApiSkillSignal { skill: string; level: number; note: string }
interface ApiGoal {
  employee: string
  employeeInitials: string
  location: string
  title: string
  horizon: string
  skillSignals: ApiSkillSignal[]
}
interface ApiOpportunity {
  id: string
  kind: OpportunityKind
  title: string
  owner: string
  ownerInitials: string
  detail: string
  reason: string
  timeframe: string
  action: string
  confirmation: string
  optedIn: boolean
}
interface ApiPlan { planId: string; goal: ApiGoal; opportunities: ApiOpportunity[] }

interface ApiProfile {
  id: string
  name: string
  initials: string
  role: string
  location: string
  timeZone?: string
  languages?: string[]
  skills?: string[]
  certifications?: string[]
  availability?: Availability
  mentor?: boolean
  optedIn?: boolean
  community?: string
}
interface ApiMatch {
  matchId: string
  profile: ApiProfile
  reasons: string[]
  confidence: 'Strong match' | 'Good match'
  draftOutreach?: string
}
interface ApiMatchResponse { matches: ApiMatch[] }

export interface ApiImpact {
  employeesReached: number
  connectionsMade: number
  needsResolvedPct: number
  languagesReached: number
  trend: { month: string; connections: number; resolved: number }[]
  capacity: { domain: string; demand: number; capacity: number }[]
}

export interface ImpactQuery {
  period?: string
  region?: string
  community?: string
}

// API expresses skill level 1–5; the demo UI renders it as a percentage bar.
const toPercent = (level: number): number => (level <= 5 ? Math.round(level * 20) : Math.round(level))

export async function fetchLivePlan(): Promise<AccelerationPlan> {
  const raw = await api<ApiPlan>('/v1/acceleration/plan', {
    method: 'POST',
    body: JSON.stringify({ employeeId: MARIA_ID }),
  })
  return {
    goal: {
      employee: raw.goal.employee,
      employeeInitials: raw.goal.employeeInitials,
      location: raw.goal.location,
      title: raw.goal.title,
      horizon: raw.goal.horizon,
      skillSignals: raw.goal.skillSignals.map((s) => ({
        skill: s.skill, level: toPercent(s.level), note: s.note,
      })),
    },
    opportunities: raw.opportunities.map((o) => ({
      id: o.id, kind: o.kind, title: o.title, owner: o.owner, ownerInitials: o.ownerInitials,
      detail: o.detail, reason: o.reason, timeframe: o.timeframe, action: o.action,
      confirmation: o.confirmation, optedIn: o.optedIn,
    })),
  }
}

export async function fetchLiveMatches(
  description: string,
  options: { candidates?: EmployeeProfile[]; requesterName?: string } = {},
): Promise<ExpertMatch[]> {
  const body: Record<string, unknown> = { description }
  if (options.requesterName) body.requesterName = options.requesterName
  if (options.candidates && options.candidates.length > 0) {
    body.candidates = options.candidates
  }
  const raw = await api<ApiMatchResponse>('/v1/connect/match', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return raw.matches.map((m) => ({
    profile: normalizeProfile(m.profile),
    reasons: m.reasons,
    confidence: m.confidence,
    draftOutreach: m.draftOutreach,
  }))
}

export async function fetchLiveImpact(query: ImpactQuery = {}): Promise<ApiImpact> {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString()
  return api<ApiImpact>(`/v1/impact${params ? `?${params}` : ''}`)
}

function normalizeProfile(p: ApiProfile): EmployeeProfile {
  return {
    id: p.id,
    name: p.name,
    initials: p.initials,
    role: p.role,
    location: p.location,
    timeZone: p.timeZone ?? '',
    languages: p.languages ?? [],
    skills: p.skills ?? [],
    certifications: p.certifications ?? [],
    availability: p.availability ?? 'This week',
    mentor: p.mentor ?? false,
    optedIn: p.optedIn ?? true,
    community: p.community,
  }
}
