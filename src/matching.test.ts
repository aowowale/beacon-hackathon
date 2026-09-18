import { describe, expect, it } from 'vitest'
import { employeeProfiles } from './data'
import { findExpertMatches } from './matching'

describe('findExpertMatches', () => {
  const request = {
    topic: 'Dataverse DLP',
    language: 'Portuguese',
    timeframe: 'This week' as const,
    interaction: 'Live discussion' as const,
  }

  it('returns the three opted-in, qualified Portuguese experts', () => {
    const matches = findExpertMatches(employeeProfiles, request)

    expect(matches.map((match) => match.profile.id)).toEqual([
      'mariana-santos',
      'luciana-rocha',
      'tiago-costa',
    ])
    expect(matches.every((match) => match.reasons.length >= 3)).toBe(true)
    expect(matches.some((match) => match.profile.id === 'rafael-private')).toBe(
      false,
    )
  })
})
