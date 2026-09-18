import { AzureOpenAI } from 'openai'
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity'
import type { AppConfig } from '../../config.js'
import type { AgentProvider, OutreachContext } from '../types.js'
import type { Availability, ExpertRequest, Interaction } from '../../domain/types.js'
import { FakeAgentProvider } from '../fake/agent.js'

const COGNITIVE_SCOPE = 'https://cognitiveservices.azure.com/.default'

const AVAILABILITIES: Availability[] = ['Today', 'This week', 'Next week']
const INTERACTIONS: Interaction[] = ['Live discussion', 'Async guidance']

const INTENT_SYSTEM = [
  'You extract structured search intent from an employee describing who they need to reach inside their company.',
  'Return ONLY a JSON object with these keys:',
  '- "topic": string, the core skill/subject they need help with (concise, no filler words).',
  '- "timeframe": one of "Today", "This week", "Next week".',
  '- "interaction": one of "Live discussion", "Async guidance".',
  '- "language": optional string, only if they explicitly ask for a specific spoken language.',
  'Infer timeframe from urgency cues (urgent/now/today => "Today"). Prefer "Async guidance" when they ask for docs, email, or written help; otherwise "Live discussion".',
].join('\n')

const OUTREACH_SYSTEM = [
  'You draft a short, warm, consent-respecting internal outreach message on behalf of one employee to another.',
  'Constraints: 2 sentences max, under 55 words, first-person, no subject line, no markdown.',
  'Always make it optional to decline. Never invent facts beyond the provided context.',
  'You receive a JSON context with fromName, toName, topic, reason, and optional interaction. Return only the message text.',
].join('\n')

const coerce = <T,>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/**
 * Live agent backed by Azure OpenAI (managed-identity auth, keyless).
 * Falls back to the deterministic parser/drafter if a call fails so a live
 * endpoint stays responsive during transient model or quota issues.
 */
export class LiveAgentProvider implements AgentProvider {
  private readonly client: AzureOpenAI
  private readonly deployment: string
  private readonly fallback = new FakeAgentProvider()

  constructor(config: AppConfig) {
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      COGNITIVE_SCOPE,
    )
    this.client = new AzureOpenAI({
      endpoint: config.AZURE_OPENAI_ENDPOINT,
      apiVersion: config.AZURE_OPENAI_API_VERSION,
      azureADTokenProvider,
    })
    this.deployment = config.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini'
  }

  async parseIntent(text: string): Promise<ExpertRequest> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.deployment,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: INTENT_SYSTEM },
          { role: 'user', content: text },
        ],
      })
      const raw = completion.choices[0]?.message?.content
      if (!raw) throw new Error('empty completion')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const topic = typeof parsed.topic === 'string' && parsed.topic.trim()
        ? parsed.topic.trim()
        : text.trim()
      const request: ExpertRequest = {
        topic,
        timeframe: coerce(parsed.timeframe, AVAILABILITIES, 'This week'),
        interaction: coerce(parsed.interaction, INTERACTIONS, 'Live discussion'),
      }
      if (typeof parsed.language === 'string' && parsed.language.trim()) {
        return { ...request, language: parsed.language.trim() }
      }
      return request
    } catch (error) {
      console.warn('[live] parseIntent fell back to deterministic parser:', (error as Error).message)
      return this.fallback.parseIntent(text)
    }
  }

  async draftOutreach(context: OutreachContext): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.deployment,
        temperature: 0.6,
        messages: [
          { role: 'system', content: OUTREACH_SYSTEM },
          { role: 'user', content: JSON.stringify(context) },
        ],
      })
      const message = completion.choices[0]?.message?.content?.trim()
      return message && message.length > 0 ? message : this.fallback.draftOutreach(context)
    } catch (error) {
      console.warn('[live] draftOutreach fell back to deterministic drafter:', (error as Error).message)
      return this.fallback.draftOutreach(context)
    }
  }
}
