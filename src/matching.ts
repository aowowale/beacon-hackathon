import type { EmployeeProfile, ExpertMatch, ExpertRequest } from './domain'

const availabilityWeight = {
  Today: 3,
  'This week': 2,
  'Next week': 1,
} as const

const normalize = (value: string) => value.trim().toLocaleLowerCase()

export function findExpertMatches(
  profiles: EmployeeProfile[],
  request: ExpertRequest,
): ExpertMatch[] {
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

      const confidence: ExpertMatch['confidence'] =
        score >= 14 ? 'Strong match' : 'Good match'

      return {
        profile,
        reasons,
        confidence,
        score,
      }
    })
    .filter((match) => match.score >= 10)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ score: _score, ...match }) => match)
}
