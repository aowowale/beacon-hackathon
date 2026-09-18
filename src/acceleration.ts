import type {
  AccelerationGoal,
  AccelerationPlan,
  Opportunity,
  OpportunityKind,
} from './domain'

const kindOrder: OpportunityKind[] = [
  'Mentor',
  'Peer',
  'Sponsor',
  'Shadow',
  'Cohort',
  'Community',
]

export function assembleAccelerationPlan(
  goal: AccelerationGoal,
  opportunities: Opportunity[],
): AccelerationPlan {
  const ordered = opportunities
    .filter((opportunity) => opportunity.optedIn)
    .slice()
    .sort(
      (left, right) =>
        kindOrder.indexOf(left.kind) - kindOrder.indexOf(right.kind),
    )

  return { goal, opportunities: ordered }
}
