import type { AgentProvider, OutreachContext } from '../types.js'
import type { Availability, ExpertRequest, Interaction } from '../../domain/types.js'

const availabilityFor = (text: string): Availability => {
  const t = text.toLocaleLowerCase()
  if (t.includes('today') || t.includes('now') || t.includes('urgent')) return 'Today'
  if (t.includes('next week')) return 'Next week'
  return 'This week'
}

const interactionFor = (text: string): Interaction =>
  /async|message|email|written|documentation/i.test(text)
    ? 'Async guidance'
    : 'Live discussion'

const KNOWN_LANGUAGES = [
  'Portuguese',
  'Spanish',
  'English',
  'Hindi',
  'German',
  'Arabic',
  'French',
]

const languageFor = (text: string): string | undefined =>
  KNOWN_LANGUAGES.find((lang) => text.toLocaleLowerCase().includes(lang.toLocaleLowerCase()))

const STOPWORDS = new Set([
  'i', 'need', 'help', 'with', 'a', 'an', 'the', 'to', 'for', 'someone',
  'who', 'can', 'in', 'on', 'and', 'about', 'me', 'expert', 'find', 'looking',
  'speaks', 'this', 'week', 'today', 'next', 'async', 'live',
])

/**
 * Deterministic rules-based intent parser. In live mode this is replaced by an
 * Azure OpenAI call with a strict JSON schema; the fake keeps tests hermetic.
 */
export class FakeAgentProvider implements AgentProvider {
  async parseIntent(text: string): Promise<ExpertRequest> {
    const language = languageFor(text)
    const topic = text
      .replace(/[.,!?]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word.toLocaleLowerCase()))
      .filter((word) => !KNOWN_LANGUAGES.some((l) => l.toLocaleLowerCase() === word.toLocaleLowerCase()))
      .join(' ')
      .trim()
    const base: ExpertRequest = {
      topic: topic || text.trim(),
      timeframe: availabilityFor(text),
      interaction: interactionFor(text),
    }
    return language ? { ...base, language } : base
  }

  async draftOutreach(context: OutreachContext): Promise<string> {
    const opener = context.interaction === 'Async guidance'
      ? 'Would you be open to a short written exchange'
      : 'Would you be open to a quick conversation'
    return (
      `Hi ${context.toName.split(' ')[0] ?? context.toName}, ` +
      `${context.fromName} here. ${opener} about ${context.topic}? ` +
      `${context.reason} No pressure at all — reply only if it works for you.`
    )
  }
}
