export type Availability = 'Today' | 'This week' | 'Next week'

export type Interaction = 'Live discussion' | 'Async guidance'

export type OpportunityKind =
  | 'Mentor'
  | 'Peer'
  | 'Sponsor'
  | 'Shadow'
  | 'Cohort'
  | 'Community'

/**
 * The only signals Beacon is permitted to use. Any field that could rank a
 * person's performance or expose private content is intentionally absent.
 */
export interface EmployeeProfile {
  id: string
  name: string
  initials: string
  role: string
  location: string
  timeZone: string
  languages: string[]
  skills: string[]
  certifications: string[]
  availability: Availability
  mentor: boolean
  /** Consent gate. Anyone with optedIn=false is invisible to matching. */
  optedIn: boolean
  community?: string
}

export interface ExpertRequest {
  topic: string
  language?: string
  timeframe: Availability
  interaction: Interaction
}

export interface ExpertMatch {
  matchId: string
  profile: EmployeeProfile
  reasons: string[]
  confidence: 'Strong match' | 'Good match'
  /** Agent-drafted introduction, pending a human to send it. */
  draftOutreach: string
}

export interface Opportunity {
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
  draftOutreach?: string
}

export interface SkillSignal {
  skill: string
  level: number
  note: string
}

export interface AccelerationGoal {
  employeeId: string
  employee: string
  employeeInitials: string
  location: string
  title: string
  horizon: string
  skillSignals: SkillSignal[]
}

export interface AccelerationPlan {
  planId: string
  goal: AccelerationGoal
  opportunities: Opportunity[]
}

export type IntroductionStatus = 'drafted' | 'sent' | 'accepted' | 'declined'

export interface Introduction {
  id: string
  batchId: string
  fromEmployeeId: string
  toEmployeeId: string
  opportunityKind: OpportunityKind | 'Connect'
  message: string
  status: IntroductionStatus
  createdAt: string
}

export interface OutcomeRecord {
  id: string
  introductionId: string
  employeeId: string
  community?: string
  region?: string
  resolved: boolean
  note?: string
  recordedAt: string
}

export interface ConsentRecord {
  employeeId: string
  optedIn: boolean
  shareSkills: boolean
  shareAvailability: boolean
  openToMentoring: boolean
  updatedAt: string
}

export interface ImpactQuery {
  community?: string
  period?: 'last_30_days' | 'last_6_months'
  region?: 'global' | 'americas' | 'emea'
}

export interface ImpactSummary {
  employeesReached: number
  connectionsMade: number
  needsResolvedPct: number
  languagesReached: number
  trend: { month: string; connections: number; resolved: number }[]
  capacity: { domain: string; demand: number; capacity: number }[]
}
