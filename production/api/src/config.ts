import { z } from 'zod'

const EnvSchema = z.object({
  PROVIDER_MODE: z.enum(['fake', 'live']).default('fake'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  AUTH_MODE: z.enum(['disabled', 'entra']).default('disabled'),
  ENTRA_TENANT_ID: z.string().optional(),
  ENTRA_AUDIENCE: z.string().optional(),

  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-08-01-preview'),
  GRAPH_BASE_URL: z.string().default('https://graph.microsoft.com/v1.0'),
  COSMOS_ENDPOINT: z.string().optional(),
  COSMOS_DATABASE: z.string().default('beacon'),
  COSMOS_CONTAINER: z.string().default('outcomes'),
  SERVICE_BUS_NAMESPACE: z.string().optional(),
  SERVICE_BUS_TOPIC: z.string().default('beacon-events'),
  KEY_VAULT_URI: z.string().optional(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
})

export type AppConfig = z.infer<typeof EnvSchema> & {
  corsOrigins: string[]
}

let cached: AppConfig | undefined

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached
  const parsed = EnvSchema.parse(env)
  if (parsed.PROVIDER_MODE === 'live') {
    // Hybrid live mode only needs Azure OpenAI; directory/outcome/event stores
    // still run on the seeded in-memory providers.
    const missing = [
      ['AZURE_OPENAI_ENDPOINT', parsed.AZURE_OPENAI_ENDPOINT],
      ['AZURE_OPENAI_DEPLOYMENT', parsed.AZURE_OPENAI_DEPLOYMENT],
    ].filter(([, value]) => !value)
    if (missing.length > 0) {
      throw new Error(
        `PROVIDER_MODE=live requires: ${missing.map(([key]) => key).join(', ')}`,
      )
    }
  }
  cached = { ...parsed, corsOrigins: parsed.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) }
  return cached
}

/** Test helper — clears the memoized config. */
export function resetConfig(): void {
  cached = undefined
}
