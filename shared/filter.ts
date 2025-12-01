import type { NewsItem, SourceID } from "./types"

/**
 * A single filter rule configured by the user
 */
export interface FilterRule {
  id: string
  pattern: string
  type: "include" | "exclude" | "require"
  scope: "global" | SourceID
  enabled: boolean
  createdAt: number
}

/**
 * Complete filter configuration stored in localStorage
 */
export interface FilterConfig {
  globalRules: FilterRule[]
  sourceRules: Record<string, FilterRule[]>
  updatedTime: number
}

/**
 * Parsed filter expression from DSL syntax
 */
export interface ParsedFilter {
  includes: string[]
  requires: string[]
  excludes: string[]
  limit?: number
}

/**
 * Parse a DSL filter expression into structured form
 *
 * Syntax:
 * - `word` - Include if matches (OR logic among includes)
 * - `+word` - Required context (AND logic, all must match)
 * - `!word` - Exclude if matches (NOT logic)
 * - `@N` - Limit to N items
 *
 * Example: "bitcoin +crypto !sponsored @10"
 */
export function parseFilterExpression(expression: string): ParsedFilter {
  const tokens = expression.trim().split(/\s+/).filter(Boolean)
  const result: ParsedFilter = {
    includes: [],
    requires: [],
    excludes: [],
  }

  for (const token of tokens) {
    if (token.startsWith("+")) {
      const value = token.slice(1).trim()
      if (value) result.requires.push(value.toLowerCase())
    } else if (token.startsWith("!")) {
      const value = token.slice(1).trim()
      if (value) result.excludes.push(value.toLowerCase())
    } else if (token.startsWith("@")) {
      const limit = Number.parseInt(token.slice(1), 10)
      if (!Number.isNaN(limit) && limit > 0) {
        result.limit = limit
      }
    } else {
      result.includes.push(token.toLowerCase())
    }
  }

  return result
}

/**
 * Check if a news item matches a parsed filter
 */
export function matchesFilter(item: NewsItem, filter: ParsedFilter): boolean {
  const text = `${item.title} ${item.extra?.hover ?? ""}`.toLowerCase()

  // Check exclusions first (fail fast)
  for (const exc of filter.excludes) {
    if (text.includes(exc)) {
      return false
    }
  }

  // Check required terms (all must match)
  for (const req of filter.requires) {
    if (!text.includes(req)) {
      return false
    }
  }

  // Check includes (any must match, or pass if empty)
  if (filter.includes.length > 0) {
    return filter.includes.some(inc => text.includes(inc))
  }

  return true
}

/**
 * Convert FilterRule[] to ParsedFilter for matching
 */
export function rulesToParsedFilter(rules: FilterRule[]): ParsedFilter {
  const result: ParsedFilter = {
    includes: [],
    requires: [],
    excludes: [],
  }

  for (const rule of rules) {
    if (!rule.enabled) continue

    const pattern = rule.pattern.toLowerCase()
    switch (rule.type) {
      case "include":
        result.includes.push(pattern)
        break
      case "require":
        result.requires.push(pattern)
        break
      case "exclude":
        result.excludes.push(pattern)
        break
    }
  }

  return result
}

/**
 * Apply filter rules to a list of news items
 */
export function applyFilters(items: NewsItem[], rules: FilterRule[]): NewsItem[] {
  const enabledRules = rules.filter(r => r.enabled)
  if (enabledRules.length === 0) {
    return items
  }

  // Separate exclude rules from include/require rules
  const excludeRules = enabledRules.filter(r => r.type === "exclude")
  const includeRules = enabledRules.filter(r => r.type === "include")
  const requireRules = enabledRules.filter(r => r.type === "require")

  return items.filter((item) => {
    const text = `${item.title} ${item.extra?.hover ?? ""}`.toLowerCase()

    // Check exclusions (any match = hide)
    for (const rule of excludeRules) {
      if (text.includes(rule.pattern.toLowerCase())) {
        return false
      }
    }

    // Check requirements (all must match)
    for (const rule of requireRules) {
      if (!text.includes(rule.pattern.toLowerCase())) {
        return false
      }
    }

    // Check includes (any must match, or pass if none defined)
    if (includeRules.length > 0) {
      return includeRules.some(rule => text.includes(rule.pattern.toLowerCase()))
    }

    return true
  })
}

/**
 * Apply a parsed filter expression to items (for server-side use)
 */
export function applyParsedFilter(items: NewsItem[], filter: ParsedFilter): NewsItem[] {
  let filtered = items.filter(item => matchesFilter(item, filter))

  if (filter.limit !== undefined && filter.limit > 0) {
    filtered = filtered.slice(0, filter.limit)
  }

  return filtered
}

/**
 * Generate a unique ID for a filter rule
 */
export function generateFilterId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a new filter rule with defaults
 */
export function createFilterRule(
  pattern: string,
  type: FilterRule["type"] = "exclude",
  scope: FilterRule["scope"] = "global",
): FilterRule {
  return {
    id: generateFilterId(),
    pattern,
    type,
    scope,
    enabled: true,
    createdAt: Date.now(),
  }
}

/**
 * Default empty filter configuration
 */
export const defaultFilterConfig: FilterConfig = {
  globalRules: [],
  sourceRules: {},
  updatedTime: 0,
}
