export type Availability = 'Today' | 'This week' | 'Next week'

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
  optedIn: boolean
  community?: string
}

export interface ExpertRequest {
  topic: string
  language?: string
  timeframe: Availability
  interaction: 'Live discussion' | 'Async guidance'
}

export interface ExpertMatch {
  profile: EmployeeProfile
  reasons: string[]
  confidence: 'Strong match' | 'Good match'
  draftOutreach?: string
}

export type OpportunityKind =
  | 'Mentor'
  | 'Peer'
  | 'Sponsor'
  | 'Shadow'
  | 'Cohort'
  | 'Community'

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
}

export interface SkillSignal {
  skill: string
  level: number
  note: string
}

export interface AccelerationGoal {
  employee: string
  employeeInitials: string
  location: string
  title: string
  horizon: string
  skillSignals: SkillSignal[]
}

export interface AccelerationPlan {
  goal: AccelerationGoal
  opportunities: Opportunity[]
}
