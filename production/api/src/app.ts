import Fastify, { type FastifyInstance, type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, type AppConfig } from './config.js'
import { createProviders, type Providers } from './providers/index.js'
import { Orchestrator } from './orchestrator.js'
import { DomainError } from './domain/errors.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerAccelerationRoutes } from './routes/acceleration.js'
import { registerConnectRoutes } from './routes/connect.js'
import { registerOutcomeRoutes } from './routes/outcomes.js'
import { registerImpactRoutes } from './routes/impact.js'
import { registerConsentRoutes } from './routes/consent.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
    providers: Providers
    orchestrator: Orchestrator
  }
}

export async function buildApp(configOverride?: AppConfig): Promise<FastifyInstance> {
  const config = configOverride ?? loadConfig()
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
  })

  const providers = createProviders(config)
  const orchestrator = new Orchestrator(providers)
  app.decorate('config', config)
  app.decorate('providers', providers)
  app.decorate('orchestrator', orchestrator)

  await app.register(sensible)
  await app.register(cors, { origin: config.corsOrigins.length ? config.corsOrigins : true })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({ error: error.code, message: error.message })
    }
    if (error.validation) {
      return reply.status(400).send({ error: 'bad_request', message: error.message })
    }
    request.log.error(error)
    return reply.status(500).send({ error: 'internal_error', message: 'Unexpected error' })
  })

  await app.register(registerHealthRoutes)
  await app.register(registerAccelerationRoutes, { prefix: '/v1/acceleration' })
  await app.register(registerConnectRoutes, { prefix: '/v1/connect' })
  await app.register(registerOutcomeRoutes, { prefix: '/v1/outcomes' })
  await app.register(registerImpactRoutes, { prefix: '/v1/impact' })
  await app.register(registerConsentRoutes, { prefix: '/v1/me/consent' })

  // Serve the built single-page app when bundled alongside the API (dist/app.js -> ../public).
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
  if (existsSync(join(publicDir, 'index.html'))) {
    await app.register(fastifyStatic, { root: publicDir })
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || request.url.startsWith('/v1') || request.url.startsWith('/health') || request.url.startsWith('/ready')) {
        return reply.status(404).send({ error: 'not_found', message: 'Route not found' })
      }
      return reply.sendFile('index.html')
    })
  }

  return app
}
