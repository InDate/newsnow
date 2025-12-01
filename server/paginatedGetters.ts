import type { SourceID } from "@shared/types"
import type { PaginatedSourceGetter } from "./types"
import { getters } from "./getters"
import { wrapAsNonPaginated } from "./utils/source"

/**
 * Registry of paginated source getters
 * Sources that support pagination should be added here
 * Sources without pagination support will use wrapped standard getters
 */
const paginatedRegistry: Partial<Record<SourceID, PaginatedSourceGetter>> = {
  // Add paginated sources here as they are implemented
  // Example:
  // "sspai": sspaiPaginated,
  // "reddit": redditPaginated,
}

/**
 * Get a paginated getter for a source
 * Falls back to wrapping the standard getter if no paginated version exists
 */
export function getPaginatedGetter(id: SourceID): PaginatedSourceGetter | undefined {
  if (paginatedRegistry[id]) {
    return paginatedRegistry[id]
  }
  if (getters[id]) {
    return wrapAsNonPaginated(getters[id])
  }
  return undefined
}

/**
 * Check if a source has true pagination support
 */
export function hasPaginationSupport(id: SourceID): boolean {
  return !!paginatedRegistry[id]
}

/**
 * Register a paginated getter for a source
 */
export function registerPaginatedGetter(id: SourceID, getter: PaginatedSourceGetter) {
  paginatedRegistry[id] = getter
}
