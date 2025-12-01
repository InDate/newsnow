import type { NewsItem, SourceID, SourceResponse } from "@shared/types"
import type { FilterRule } from "@shared/filter"
import { applyFilters } from "@shared/filter"
import { getters } from "#/getters"
import { getPaginatedGetter, hasPaginationSupport } from "#/paginatedGetters"
import { getCacheTable } from "#/database/cache"
import type { CacheInfo, PaginationParams } from "#/types"

const MAX_PAGES = 5 // Maximum pages to fetch when filtering
const TARGET_ITEMS = 30 // Target number of filtered items

/**
 * Parse filter rules from query parameter
 * Expects JSON-encoded array of FilterRule objects
 */
function parseFilterRules(filterParam: string | undefined): FilterRule[] {
  if (!filterParam) return []
  try {
    const parsed = JSON.parse(filterParam)
    if (Array.isArray(parsed)) {
      return parsed.filter(r =>
        r && typeof r.pattern === "string" && r.enabled !== false,
      )
    }
  } catch {
    // Invalid JSON, ignore
  }
  return []
}

/**
 * Fetch items with filtering, paginating as needed to reach target count
 */
async function fetchWithFilter(
  id: SourceID,
  filterRules: FilterRule[],
): Promise<{ items: NewsItem[], fromPagination: boolean }> {
  const paginatedGetter = getPaginatedGetter(id)
  if (!paginatedGetter) {
    throw new Error(`No getter for source: ${id}`)
  }

  // If no filters or source doesn't support pagination, use simple fetch
  if (filterRules.length === 0 || !hasPaginationSupport(id)) {
    const result = await paginatedGetter()
    const items = filterRules.length > 0
      ? applyFilters(result.items, filterRules).slice(0, TARGET_ITEMS)
      : result.items.slice(0, TARGET_ITEMS)
    return { items, fromPagination: false }
  }

  // Paginated fetch with filtering
  const collectedItems: NewsItem[] = []
  const seenIds = new Set<string | number>()
  let paginationParams: PaginationParams = {}
  let pageCount = 0

  while (collectedItems.length < TARGET_ITEMS && pageCount < MAX_PAGES) {
    const result = await paginatedGetter(paginationParams)
    pageCount++

    // Filter the fetched items
    const filteredBatch = applyFilters(result.items, filterRules)

    // Add unique items to collection
    for (const item of filteredBatch) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        collectedItems.push(item)
        if (collectedItems.length >= TARGET_ITEMS) break
      }
    }

    // Check if we can continue paginating
    if (!result.hasMore) break

    // Update pagination params for next request
    if (result.nextPage !== undefined) {
      paginationParams = { page: result.nextPage }
    } else if (result.nextOffset !== undefined) {
      paginationParams = { offset: result.nextOffset }
    } else if (result.nextCursor !== undefined) {
      paginationParams = { cursor: result.nextCursor }
    } else {
      break
    }
  }

  logger.info(`Filtered fetch for ${id}: ${pageCount} pages, ${collectedItems.length} items`)
  return { items: collectedItems, fromPagination: true }
}

export default defineEventHandler(async (event): Promise<SourceResponse> => {
  try {
    const query = getQuery(event)
    const latest = query.latest !== undefined && query.latest !== "false"
    let id = query.id as SourceID
    const filterParam = query.filter as string | undefined
    const filterRules = parseFilterRules(filterParam)
    const hasFilters = filterRules.length > 0

    const isValid = (id: SourceID) => !id || !sources[id] || !getters[id]

    if (isValid(id)) {
      const redirectID = sources?.[id]?.redirect
      if (redirectID) id = redirectID
      if (isValid(id)) throw new Error("Invalid source id")
    }

    const cacheTable = await getCacheTable()
    const now = Date.now()
    let cache: CacheInfo | undefined

    // When filtering with pagination support, skip cache and fetch fresh
    // This ensures we can paginate through to get enough filtered results
    const skipCacheForFilter = hasFilters && hasPaginationSupport(id)

    if (cacheTable && !skipCacheForFilter) {
      cache = await cacheTable.get(id)
      if (cache) {
        if (now - cache.updated < sources[id].interval) {
          const items = hasFilters
            ? applyFilters(cache.items, filterRules).slice(0, TARGET_ITEMS)
            : cache.items
          return {
            status: "success",
            id,
            updatedTime: now,
            items,
          }
        }

        if (now - cache.updated < TTL) {
          if (!latest || (!event.context.disabledLogin && !event.context.user)) {
            const items = hasFilters
              ? applyFilters(cache.items, filterRules).slice(0, TARGET_ITEMS)
              : cache.items
            return {
              status: "cache",
              id,
              updatedTime: cache.updated,
              items,
            }
          }
        }
      }
    }

    try {
      let newData: NewsItem[]
      let fromPagination = false

      if (hasFilters) {
        const result = await fetchWithFilter(id, filterRules)
        newData = result.items
        fromPagination = result.fromPagination
      } else {
        newData = (await getters[id]()).slice(0, TARGET_ITEMS)
      }

      // Only cache unfiltered results or results from non-paginated sources
      if (cacheTable && newData.length && !fromPagination) {
        if (event.context.waitUntil) event.context.waitUntil(cacheTable.set(id, newData))
        else await cacheTable.set(id, newData)
      }

      logger.success(`fetch ${id} latest${hasFilters ? " (filtered)" : ""}`)
      return {
        status: "success",
        id,
        updatedTime: now,
        items: newData,
      }
    } catch (e) {
      if (cache!) {
        const items = hasFilters
          ? applyFilters(cache.items, filterRules).slice(0, TARGET_ITEMS)
          : cache.items
        return {
          status: "cache",
          id,
          updatedTime: cache.updated,
          items,
        }
      } else {
        throw e
      }
    }
  } catch (e: any) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
