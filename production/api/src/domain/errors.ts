export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export const notFound = (message: string) =>
  new DomainError(404, message, 'not_found')

export const badRequest = (message: string) =>
  new DomainError(400, message, 'bad_request')

export const consentRequired = (message: string) =>
  new DomainError(403, message, 'consent_required')
