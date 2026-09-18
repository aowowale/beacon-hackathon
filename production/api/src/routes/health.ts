import type { FastifyInstance } from 'fastify'

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    providerMode: app.config.PROVIDER_MODE,
    time: new Date().toISOString(),
  }))

  app.get('/ready', async () => ({ status: 'ready' }))
}
