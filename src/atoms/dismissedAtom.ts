import type { SourceID } from "@shared/types"

// Key format: "sourceId:itemId"
type DismissedKey = `${SourceID}:${string | number}`

interface DismissedState {
  dismissed: DismissedKey[]
  updatedTime: number
}

const STORAGE_KEY = "dismissed-articles"
const MAX_DISMISSED = 500 // Limit to prevent localStorage bloat

function getInitialValue(): DismissedState {
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    if (item) {
      const parsed = JSON.parse(item) as DismissedState
      return parsed
    }
  } catch {}
  return { dismissed: [], updatedTime: 0 }
}

const baseAtom = atom<DismissedState>(getInitialValue())

export const dismissedArticlesAtom = atom(
  get => new Set(get(baseAtom).dismissed),
  (get, set, action: { type: "dismiss", sourceId: SourceID, itemId: string | number } | { type: "restore", sourceId: SourceID, itemId: string | number } | { type: "clear" }) => {
    const current = get(baseAtom)
    let newDismissed: DismissedKey[]

    if (action.type === "dismiss") {
      const key: DismissedKey = `${action.sourceId}:${action.itemId}`
      if (current.dismissed.includes(key)) return
      newDismissed = [...current.dismissed, key]
      // Trim old entries if exceeding limit
      if (newDismissed.length > MAX_DISMISSED) {
        newDismissed = newDismissed.slice(-MAX_DISMISSED)
      }
    } else if (action.type === "restore") {
      const key: DismissedKey = `${action.sourceId}:${action.itemId}`
      newDismissed = current.dismissed.filter(k => k !== key)
    } else {
      newDismissed = []
    }

    const newState = { dismissed: newDismissed, updatedTime: Date.now() }
    set(baseAtom, newState)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
  },
)

// Helper to check if a specific item is dismissed
export function isDismissedKey(sourceId: SourceID, itemId: string | number): DismissedKey {
  return `${sourceId}:${itemId}`
}
