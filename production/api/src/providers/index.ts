import type { AppConfig } from '../config.js'
import type { Providers } from './types.js'
import { FakeAgentProvider } from './fake/agent.js'
import { FakeDirectoryProvider } from './fake/directory.js'
import { FakeActionProvider } from './fake/action.js'
import { FakeOutcomeStore } from './fake/outcomeStore.js'
import { FakeEventBus } from './fake/eventBus.js'
import { FakeConsentStore } from './fake/consentStore.js'
import { LiveAgentProvider } from './live/index.js'

export function createProviders(config: AppConfig): Providers {
  // Hybrid live mode: the agentic brain (intent + outreach) runs on Azure
  // OpenAI while the directory, consent, and outcome stores stay on the seeded
  // in-memory implementations. Real Graph/Cosmos/Service Bus wiring lands later.
  const agent = config.PROVIDER_MODE === 'live'
    ? new LiveAgentProvider(config)
    : new FakeAgentProvider()
  return {
    agent,
    directory: new FakeDirectoryProvider(),
    action: new FakeActionProvider(),
    outcomes: new FakeOutcomeStore(),
    events: new FakeEventBus(),
    consent: new FakeConsentStore(),
  }
}

export type { Providers } from './types.js'
