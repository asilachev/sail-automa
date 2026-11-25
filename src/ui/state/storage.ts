/** The browser's localStorage, or null where it is missing or blocked (private modes, tests). */
export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
