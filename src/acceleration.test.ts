import { describe, expect, it } from 'vitest'
import { assembleAccelerationPlan } from './acceleration'
import { accelerationGoal, accelerationOpportunities } from './data'

describe('assembleAccelerationPlan', () => {
  it('returns opted-in opportunities across every acceleration lever in order', () => {
    const plan = assembleAccelerationPlan(
      accelerationGoal,
      accelerationOpportunities,
    )

    expect(plan.opportunities.map((opportunity) => opportunity.kind)).toEqual([
      'Mentor',
      'Peer',
      'Sponsor',
      'Shadow',
      'Cohort',
      'Community',
    ])
    expect(
      plan.opportunities.every((opportunity) => opportunity.optedIn),
    ).toBe(true)
    expect(
      plan.opportunities.every(
        (opportunity) => opportunity.reason.length > 0,
      ),
    ).toBe(true)
  })
})
