import type { PrimitiveAtom } from "jotai"
import type { FilterConfig, FilterRule } from "@shared/filter"
import { defaultFilterConfig } from "@shared/filter"
import type { SourceID } from "@shared/types"
import type { Update } from "./types"

function createFilterConfigAtom(
  key: string,
  initialValue: FilterConfig,
): PrimitiveAtom<FilterConfig> {
  const getInitialValue = (): FilterConfig => {
    const item = localStorage.getItem(key)
    try {
      if (item) {
        const stored = JSON.parse(item) as FilterConfig
        // Basic validation
        if (
          typeof stored === "object"
          && Array.isArray(stored.globalRules)
          && typeof stored.sourceRules === "object"
        ) {
          return stored
        }
      }
    } catch { }
    return initialValue
  }

  const baseAtom = atom(getInitialValue())
  const derivedAtom = atom(
    get => get(baseAtom),
    (get, set, update: Update<FilterConfig>) => {
      const nextValue = update instanceof Function ? update(get(baseAtom)) : update
      set(baseAtom, nextValue)
      localStorage.setItem(key, JSON.stringify(nextValue))
    },
  )
  return derivedAtom
}

export const filterConfigAtom = createFilterConfigAtom("newsfilters", defaultFilterConfig)

// Derived atom for global rules
export const globalFilterRulesAtom = atom(
  get => get(filterConfigAtom).globalRules,
  (get, set, update: Update<FilterRule[]>) => {
    const newRules = update instanceof Function ? update(get(filterConfigAtom).globalRules) : update
    set(filterConfigAtom, {
      ...get(filterConfigAtom),
      globalRules: newRules,
      updatedTime: Date.now(),
    })
  },
)

// Derived atom for source-specific rules
export const sourceFilterRulesAtom = atom(
  get => get(filterConfigAtom).sourceRules,
  (get, set, sourceId: SourceID, rules: FilterRule[]) => {
    set(filterConfigAtom, {
      ...get(filterConfigAtom),
      sourceRules: {
        ...get(filterConfigAtom).sourceRules,
        [sourceId]: rules,
      },
      updatedTime: Date.now(),
    })
  },
)

// Modal state - includes optional source filter
export const filterModalStateAtom = atom<{
  open: boolean
  sourceId: SourceID | null // null = show all, SourceID = show only that source
}>({
  open: false,
  sourceId: null,
})
