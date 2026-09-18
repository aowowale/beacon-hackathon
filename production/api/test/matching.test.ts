import { describe, expect, it } from 'vitest'
import { scoreProfiles } from '../src/core/matching.js'
import { employees } from '../src/providers/fake/seed.js'
import type { ExpertRequest } from '../src/domain/types.js'

const request: ExpertRequest = {
  topic: 'AI',
  language: 'Portuguese',
  timeframe: 'This week',
  interaction: 'Live discussion',
}

describe('scoreProfiles', () => {
  it('never surfaces a non-opted-in profile', () => {
    const results = scoreProfiles(employees, { ...request, language: undefined })
    expect(results.some((r) => r.profile.optedIn === false)).toBe(false)
    expect(results.some((r) => r.profile.id === 'emp-omar-said')).toBe(false)
  })

  it('honours a language constraint', () => {
    const results = scoreProfiles(employees, request)
    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every((r) => r.profile.languages.includes('Portuguese')),
    ).toBe(true)
  })

  it('ranks declared expertise highest and caps at three', () => {
    const results = scoreProfiles(employees, { ...request, language: undefined })
    expect(results.length).toBeLessThanOrEqual(3)
    expect(results[0]?.reasons[0]).toMatch(/^Declared expertise/)
  })

  it('is deterministic', () => {
    const a = scoreProfiles(employees, request)
    const b = scoreProfiles(employees, request)
    expect(a.map((r) => r.profile.id)).toEqual(b.map((r) => r.profile.id))
  })
})
