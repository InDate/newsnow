import type { NewsItem, SourceID } from "@shared/types"
import { applyFilters } from "@shared/filter"
import { filterConfigAtom } from "~/atoms/filterAtom"

export function useFilteredItems(items: NewsItem[] | undefined, sourceId: SourceID): NewsItem[] | undefined {
  const config = useAtomValue(filterConfigAtom)

  return useMemo(() => {
    if (!items || items.length === 0) return items

    const globalRules = config.globalRules.filter(r => r.enabled)
    const sourceRules = (config.sourceRules[sourceId] ?? []).filter(r => r.enabled)
    const allRules = [...globalRules, ...sourceRules]

    if (allRules.length === 0) return items

    return applyFilters(items, allRules)
  }, [items, config, sourceId])
}
