import type {
  EmployeeProfile,
  ExpertRequest,
} from '../domain/types.js'

export const availabilityWeight = {
  Today: 3,
  'This week': 2,
  'Next week': 1,
} as const

export const normalize = (value: string): string =>
  value.trim().toLocaleLowerCase()

export interface ScoredProfile {
  profile: EmployeeProfile
  reasons: string[]
  confidence: 'Strong match' | 'Good match'
  score: number
}

/**
 * Deterministic, signal-based ranking. Consent is enforced first: anyone with
 * optedIn=false is excluded before scoring. No profile is ever scored on
 * performance — only relevance signals the employee agreed to share.
 */
export function scoreProfiles(
  profiles: EmployeeProfile[],
  request: ExpertRequest,
): ScoredProfile[] {
  const topic = normalize(request.topic)
  const language = request.language ? normalize(request.language) : undefined

  return profiles
    .filter((profile) => profile.optedIn)
    .filter((profile) =>
      language
        ? profile.languages.some((item) => normalize(item) === language)
        : true,
    )
    .map((profile) => {
      const exactSkills = profile.skills.filter((skill) =>
        normalize(skill).includes(topic),
      )
      const relatedSkills = profile.skills.filter(
        (skill) =>
          !exactSkills.includes(skill) &&
          topic.split(' ').some((term) => normalize(skill).includes(term)),
      )
      const score =
        exactSkills.length * 10 +
        relatedSkills.length * 3 +
        availabilityWeight[profile.availability] +
        (profile.mentor ? 1 : 0)
      const reasons = [
        exactSkills.length > 0
          ? `Declared expertise in ${exactSkills.join(', ')}`
          : `Related experience in ${relatedSkills.join(', ')}`,
        language ? `${request.language} language match` : undefined,
        `${profile.availability} availability`,
        profile.mentor ? 'Open to mentoring and expert requests' : undefined,
      ].filter((reason): reason is string => Boolean(reason))

      const confidence: ScoredProfile['confidence'] =
        score >= 14 ? 'Strong match' : 'Good match'

      return { profile, reasons, confidence, score }
    })
    .filter((match) => match.score >= 10)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
}

/**
 * Ranks caller-supplied candidates (e.g. real people from Microsoft Graph, who
 * usually have no declared `skills`). Unlike scoreProfiles this never hard-drops
 * a person for lacking a skill match — the requester is searching their own
 * network — it only orders by whatever relevance signals are available.
 */
export function rankSuppliedCandidates(
  profiles: EmployeeProfile[],
  request: ExpertRequest,
): ScoredProfile[] {
  const topic = normalize(request.topic)
  const terms = topic.split(' ').filter((term) => term.length > 2)

  return profiles
    .filter((profile) => profile.optedIn)
    .map((profile) => {
      const haystack = normalize(
        [profile.role, profile.community ?? '', ...profile.skills].join(' '),
      )
      const skillHits = profile.skills.filter((skill) =>
        terms.some((term) => normalize(skill).includes(term)),
      )
      const roleHit = terms.some((term) => haystack.includes(term))
      const score =
        skillHits.length * 5 +
        (roleHit ? 2 : 0) +
        availabilityWeight[profile.availability] +
        (profile.mentor ? 1 : 0)
      const reasons = [
        skillHits.length > 0
          ? `Related to ${skillHits.join(', ')}`
          : 'In your working network',
        profile.role || undefined,
        `${profile.availability} availability`,
      ].filter((reason): reason is string => Boolean(reason))
      const confidence: ScoredProfile['confidence'] =
        score >= 8 ? 'Strong match' : 'Good match'

      return { profile, reasons, confidence, score }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
}
