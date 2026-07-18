// Saved-accounts store: lets one browser hold multiple logged-in sessions
// (e.g. an admin account + a personal client account) and switch instantly.
// Tokens for the *active* account always live in authToken/refreshToken;
// this list is only authoritative for the accounts you're switched away from.

const STORAGE_KEY = 'savedAccounts'
const MAX_ACCOUNTS = 5

export interface SavedAccount {
  id: string
  email: string
  name: string
  role: string
  token: string
  refreshToken: string
  savedAt: string
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)))
}

export function getSavedAccount(id: string): SavedAccount | undefined {
  return getSavedAccounts().find((a) => a.id === String(id))
}

export function upsertSavedAccount(account: Omit<SavedAccount, 'savedAt'>) {
  const entry: SavedAccount = { ...account, id: String(account.id), savedAt: new Date().toISOString() }
  const rest = getSavedAccounts().filter((a) => a.id !== entry.id)
  persist([entry, ...rest])
}

export function removeSavedAccount(id: string) {
  persist(getSavedAccounts().filter((a) => a.id !== String(id)))
}
