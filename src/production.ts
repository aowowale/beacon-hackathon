// Production mode: real Microsoft Graph identity + colleagues via delegated
// (user sign-in) auth. This module is imported dynamically only when Production
// mode is active, so Demo and Live stay unaffected and dependency-free at runtime.
// It is strictly read-only and draft-only — it never sends a message to anyone.
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from '@azure/msal-browser'
import type { EmployeeProfile } from './domain'

const CLIENT_ID = import.meta.env.VITE_AAD_CLIENT_ID ?? ''
const TENANT_ID = import.meta.env.VITE_AAD_TENANT_ID ?? 'organizations'
const REDIRECT_URI = import.meta.env.VITE_AAD_REDIRECT_URI ?? window.location.origin

// Delegated, user-consentable scopes: read your own profile and the people you
// work with. No admin consent or org-wide directory read required.
const GRAPH_SCOPES = ['User.Read', 'People.Read']
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

/** True when an app registration client id has been configured at build time. */
export const isProductionConfigured = (): boolean => CLIENT_ID.length > 0

export interface ProductionUser {
  id: string
  name: string
  initials: string
  role: string
  location: string
}

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

let pca: PublicClientApplication | null = null

async function client(): Promise<PublicClientApplication> {
  if (!isProductionConfigured()) {
    throw new Error(
      'Production sign-in is not configured yet. Set VITE_AAD_CLIENT_ID to your Entra app registration to enable it.',
    )
  }
  if (!pca) {
    pca = new PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: REDIRECT_URI,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
    await pca.initialize()
  }
  return pca
}

async function accessToken(): Promise<string> {
  const app = await client()
  let account: AccountInfo | undefined = app.getAllAccounts()[0]
  if (!account) {
    const login = await app.loginPopup({ scopes: GRAPH_SCOPES })
    account = login.account ?? undefined
  }
  try {
    const result = await app.acquireTokenSilent({ scopes: GRAPH_SCOPES, account })
    return result.accessToken
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const result = await app.acquireTokenPopup({ scopes: GRAPH_SCOPES })
      return result.accessToken
    }
    throw error
  }
}

async function graph<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
    }
    throw new Error(
      detail.error?.message ?? `Microsoft Graph request failed (${res.status})`,
    )
  }
  return res.json() as Promise<T>
}

interface GraphMe {
  id: string
  displayName?: string
  jobTitle?: string
  officeLocation?: string
  department?: string
}

interface GraphPerson {
  id: string
  displayName?: string
  jobTitle?: string
  department?: string
  officeLocation?: string
  personType?: { class?: string }
}

/** Sign in (if needed) and return the signed-in user's real profile. */
export async function signIn(): Promise<ProductionUser> {
  const token = await accessToken()
  const me = await graph<GraphMe>(
    '/me?$select=id,displayName,jobTitle,officeLocation,department',
    token,
  )
  const name = me.displayName ?? 'You'
  return {
    id: me.id,
    name,
    initials: initialsFor(name),
    role: me.jobTitle ?? '',
    location: me.officeLocation ?? '',
  }
}

/** Fetch the real people the signed-in user works with, mapped to candidates. */
export async function fetchColleagues(): Promise<EmployeeProfile[]> {
  const token = await accessToken()
  const data = await graph<{ value: GraphPerson[] }>(
    '/me/people?$top=25',
    token,
  )
  return (data.value ?? [])
    .filter((person) => person.displayName && person.personType?.class !== 'Group')
    .map((person) => toCandidate(person))
}

function toCandidate(person: GraphPerson): EmployeeProfile {
  const name = person.displayName ?? 'Unknown'
  return {
    id: person.id,
    name,
    initials: initialsFor(name),
    role: person.jobTitle ?? '',
    location: person.officeLocation ?? '',
    timeZone: '',
    languages: [],
    skills: [],
    certifications: [],
    availability: 'This week',
    mentor: false,
    optedIn: true,
    community: person.department,
  }
}

/** Clear the cached account so the next action prompts a fresh sign-in. */
export async function signOut(): Promise<void> {
  if (pca) await pca.clearCache()
}
