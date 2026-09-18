import type { EventBus } from '../types.js'

export interface CapturedEvent {
  topic: string
  event: Record<string, unknown>
  at: string
}

/** Records events in memory. In live mode this publishes to Service Bus. */
export class FakeEventBus implements EventBus {
  readonly captured: CapturedEvent[] = []

  async publish(topic: string, event: Record<string, unknown>): Promise<void> {
    this.captured.push({ topic, event, at: new Date().toISOString() })
  }
}
