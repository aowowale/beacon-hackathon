import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { badRequest } from '../domain/errors.js'

const PlanBody = z.object({ employeeId: z.string().min(1) })

export async function registerAccelerationRoutes(app: FastifyInstance): Promise<void> {
  // Goal → ranked, drafted acceleration plan.
  app.post('/plan', async (request) => {
    const parsed = PlanBody.safeParse(request.body)
    if (!parsed.success) throw badRequest('employeeId is required')
    return app.orchestrator.buildPlan(parsed.data.employeeId)
  })

  // Draft introductions for every opportunity in the plan (no send).
  app.post<{ Params: { planId: string } }>('/plan/:planId/connect', async (request) => {
    return app.orchestrator.draftPlanIntroductions(request.params.planId)
  })

  // Batch status.
  app.get<{ Params: { batchId: string } }>('/batch/:batchId', async (request) => {
    const introductions = await app.orchestrator.getBatch(request.params.batchId)
    return { batchId: request.params.batchId, introductions }
  })
}
