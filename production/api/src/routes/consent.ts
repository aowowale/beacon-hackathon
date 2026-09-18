import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { badRequest } from '../domain/errors.js'

const ConsentBody = z.object({
  employeeId: z.string().min(1),
  optedIn: z.boolean(),
  shareSkills: z.boolean(),
  shareAvailability: z.boolean(),
  openToMentoring: z.boolean(),
})

export async function registerConsentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { employeeId?: string } }>('/', async (request) => {
    const employeeId = request.query.employeeId
    if (!employeeId) throw badRequest('employeeId query parameter is required')
    return app.providers.consent.get(employeeId)
  })

  app.put('/', async (request) => {
    const parsed = ConsentBody.safeParse(request.body)
    if (!parsed.success) throw badRequest('A complete consent record is required')
    return app.providers.consent.set({
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })
  })
}
