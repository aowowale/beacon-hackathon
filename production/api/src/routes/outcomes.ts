import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { badRequest } from '../domain/errors.js'

const OutcomeBody = z.object({
  introductionId: z.string().min(1),
  employeeId: z.string().min(1),
  community: z.string().optional(),
  region: z.string().optional(),
  resolved: z.boolean(),
  note: z.string().optional(),
})

export async function registerOutcomeRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', async (request, reply) => {
    const parsed = OutcomeBody.safeParse(request.body)
    if (!parsed.success) throw badRequest('introductionId, employeeId and resolved are required')
    const stored = await app.orchestrator.recordOutcome({
      id: randomUUID(),
      recordedAt: new Date().toISOString(),
      ...parsed.data,
    })
    return reply.status(201).send({ outcome: stored })
  })
}
