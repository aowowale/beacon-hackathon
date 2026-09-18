import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { ImpactQuery } from '../domain/types.js'

const ImpactQuerySchema = z.object({
  community: z.string().optional(),
  period: z.enum(['last_30_days', 'last_6_months']).optional(),
  region: z.enum(['global', 'americas', 'emea']).optional(),
})

export async function registerImpactRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request) => {
    const parsed = ImpactQuerySchema.safeParse(request.query)
    const query: ImpactQuery = parsed.success ? parsed.data : {}
    return app.orchestrator.impact(query)
  })
}
