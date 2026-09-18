import type { Opportunity, OpportunityKind } from '../domain/types.js'

export const kindOrder: OpportunityKind[] = [
  'Mentor',
  'Peer',
  'Sponsor',
  'Shadow',
  'Cohort',
  'Community',
]

/**
 * Orders opted-in opportunities across every acceleration lever. Consent is
 * enforced here too — non-opted-in opportunities never surface.
 */
export function orderOpportunities(
  opportunities: Opportunity[],
): Opportunity[] {
  return opportunities
    .filter((opportunity) => opportunity.optedIn)
    .slice()
    .sort(
      (left, right) =>
        kindOrder.indexOf(left.kind) - kindOrder.indexOf(right.kind),
    )
}
