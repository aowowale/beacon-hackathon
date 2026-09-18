import { describe, expect, it } from 'vitest'
import { orderOpportunities } from '../src/core/acceleration.js'
import { MARIA_ID, opportunities } from '../src/providers/fake/seed.js'

describe('orderOpportunities', () => {
  it('returns every opted-in lever in canonical order', () => {
    const ordered = orderOpportunities(opportunities[MARIA_ID] ?? [])
    expect(ordered.map((o) => o.kind)).toEqual([
      'Mentor',
      'Peer',
      'Sponsor',
      'Shadow',
      'Cohort',
      'Community',
    ])
    expect(ordered.every((o) => o.optedIn)).toBe(true)
    expect(ordered.every((o) => o.reason.length > 0)).toBe(true)
  })

  it('drops non-opted-in opportunities', () => {
    const withOptOut = [
      ...(opportunities[MARIA_ID] ?? []),
      {
        ...(opportunities[MARIA_ID]?.[0] ?? ({} as never)),
        id: 'opp-optout',
        optedIn: false,
      },
    ]
    const ordered = orderOpportunities(withOptOut)
    expect(ordered.some((o) => o.id === 'opp-optout')).toBe(false)
  })
})
