import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { badRequest } from '../domain/errors.js'
import type { EmployeeProfile } from '../domain/types.js'

const CandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  initials: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  availability: z.enum(['Today', 'This week', 'Next week']).optional(),
  mentor: z.boolean().optional(),
  community: z.string().optional(),
})

const MatchBody = z.object({
  description: z.string().min(1),
  requesterName: z.string().min(1).optional(),
  candidates: z.array(CandidateSchema).max(50).optional(),
})

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

const toProfile = (
  candidate: z.infer<typeof CandidateSchema>,
): EmployeeProfile => ({
  id: candidate.id,
  name: candidate.name,
  initials: candidate.initials?.trim() || initialsFor(candidate.name),
  role: candidate.role ?? '',
  location: candidate.location ?? '',
  timeZone: candidate.timeZone ?? '',
  languages: candidate.languages ?? [],
  skills: candidate.skills ?? [],
  certifications: candidate.certifications ?? [],
  availability: candidate.availability ?? 'This week',
  mentor: candidate.mentor ?? false,
  // Caller-supplied people are surfaced only to the requester who searched their
  // own network; outreach is drafted, never sent, so they are treated as visible.
  optedIn: true,
  community: candidate.community,
})

const IntroduceBody = z.object({
  fromEmployeeId: z.string().min(1),
  toEmployeeId: z.string().min(1),
  message: z.string().min(1),
})

export async function registerConnectRoutes(app: FastifyInstance): Promise<void> {
  // Natural-language expert finding with drafted outreach.
  app.post('/match', async (request) => {
    const parsed = MatchBody.safeParse(request.body)
    if (!parsed.success) throw badRequest('description is required')
    const { description, requesterName, candidates } = parsed.data
    return app.orchestrator.findExperts(description, {
      requesterName,
      candidates: candidates?.map(toProfile),
    })
  })

  // Human-authorized send of a single introduction.
  app.post<{ Params: { matchId: string } }>('/:matchId/introduce', async (request) => {
    const parsed = IntroduceBody.safeParse(request.body)
    if (!parsed.success) throw badRequest('fromEmployeeId, toEmployeeId and message are required')
    const intro = await app.orchestrator.sendIntroduction({
      matchId: request.params.matchId,
      ...parsed.data,
    })
    return { introduction: intro }
  })
}
