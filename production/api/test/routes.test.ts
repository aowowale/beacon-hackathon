import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { loadConfig, resetConfig } from '../src/config.js'
import { MARIA_ID } from '../src/providers/fake/seed.js'

let app: FastifyInstance

beforeAll(async () => {
  resetConfig()
  const config = loadConfig({ PROVIDER_MODE: 'fake', NODE_ENV: 'test', LOG_LEVEL: 'silent' } as NodeJS.ProcessEnv)
  app = await buildApp(config)
  await app.ready()
})

afterAll(async () => {
  await app.close()
  resetConfig()
})

describe('health', () => {
  it('reports ok and provider mode', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', providerMode: 'fake' })
  })
})

describe('acceleration flow', () => {
  it('builds a plan, drafts a batch, and reports batch status', async () => {
    const planRes = await app.inject({
      method: 'POST',
      url: '/v1/acceleration/plan',
      payload: { employeeId: MARIA_ID },
    })
    expect(planRes.statusCode).toBe(200)
    const plan = planRes.json()
    expect(plan.opportunities).toHaveLength(6)
    expect(plan.opportunities[0].draftOutreach).toBeTruthy()

    const connectRes = await app.inject({
      method: 'POST',
      url: `/v1/acceleration/plan/${plan.planId}/connect`,
      payload: {},
    })
    expect(connectRes.statusCode).toBe(200)
    const { batchId, introductions } = connectRes.json()
    expect(introductions).toHaveLength(6)
    expect(introductions.every((i: { status: string }) => i.status === 'drafted')).toBe(true)

    const batchRes = await app.inject({ method: 'GET', url: `/v1/acceleration/batch/${batchId}` })
    expect(batchRes.statusCode).toBe(200)
    expect(batchRes.json().introductions).toHaveLength(6)
  })
})

describe('connect flow', () => {
  it('finds experts with drafted outreach and never returns opted-out people', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/connect/match',
      payload: { description: 'I need help with AI who speaks Portuguese this week' },
    })
    expect(res.statusCode).toBe(200)
    const { request, matches } = res.json()
    expect(request.language).toBe('Portuguese')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((m: { profile: { optedIn: boolean } }) => m.profile.optedIn)).toBe(true)
    expect(matches.every((m: { draftOutreach: string }) => m.draftOutreach.length > 0)).toBe(true)
  })

  it('sends an introduction only when a human posts it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/connect/match-emp-diego-fernandez/introduce',
      payload: {
        fromEmployeeId: MARIA_ID,
        toEmployeeId: 'emp-diego-fernandez',
        message: 'Hi Diego, could we chat about Azure OpenAI patterns?',
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().introduction.status).toBe('sent')
  })
})

describe('outcomes and impact', () => {
  it('records an outcome', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/outcomes',
      payload: { introductionId: 'intro-1', employeeId: MARIA_ID, resolved: true },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().outcome.resolved).toBe(true)
  })

  it('scales impact by region and period', async () => {
    const global = await app.inject({ method: 'GET', url: '/v1/impact?region=global&period=last_6_months' })
    const americas = await app.inject({ method: 'GET', url: '/v1/impact?region=americas&period=last_30_days' })
    expect(global.json().connectionsMade).toBeGreaterThan(americas.json().connectionsMade)
  })
})

describe('consent', () => {
  it('reads and updates a consent record', async () => {
    const get = await app.inject({ method: 'GET', url: `/v1/me/consent?employeeId=${MARIA_ID}` })
    expect(get.statusCode).toBe(200)

    const put = await app.inject({
      method: 'PUT',
      url: '/v1/me/consent',
      payload: {
        employeeId: MARIA_ID,
        optedIn: false,
        shareSkills: false,
        shareAvailability: false,
        openToMentoring: false,
      },
    })
    expect(put.statusCode).toBe(200)
    expect(put.json().optedIn).toBe(false)
  })
})
