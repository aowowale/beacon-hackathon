import type { ActionProvider } from '../types.js'
import type { Introduction } from '../../domain/types.js'
import { notFound } from '../../domain/errors.js'

/** In-memory action store. In live mode this posts to Graph / Teams / email. */
export class FakeActionProvider implements ActionProvider {
  private readonly batches = new Map<string, Introduction[]>()

  registerBatch(batchId: string, intros: Introduction[]): void {
    this.batches.set(batchId, intros)
  }

  async sendIntroduction(intro: Introduction): Promise<Introduction> {
    const sent: Introduction = { ...intro, status: 'sent' }
    const existing = this.batches.get(intro.batchId) ?? []
    const next = existing.filter((item) => item.id !== intro.id)
    next.push(sent)
    this.batches.set(intro.batchId, next)
    return sent
  }

  async getBatch(batchId: string): Promise<Introduction[]> {
    const batch = this.batches.get(batchId)
    if (!batch) throw notFound(`Batch ${batchId} not found`)
    return batch
  }
}
