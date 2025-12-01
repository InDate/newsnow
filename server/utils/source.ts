import process from "node:process"
import type { AllSourceID } from "@shared/types"
import defu from "defu"
import type { PaginatedResult, PaginatedSourceGetter, PaginationParams, RSSHubOption, RSSHubInfo as RSSHubResponse, SourceGetter, SourceOption } from "#/types"

type R = Partial<Record<AllSourceID, SourceGetter>>
type PR = Partial<Record<AllSourceID, PaginatedSourceGetter>>
export function defineSource(source: SourceGetter): SourceGetter
export function defineSource(source: R): R
export function defineSource(source: SourceGetter | R): SourceGetter | R {
  return source
}

export function defineRSSSource(url: string, option?: SourceOption): SourceGetter {
  return async () => {
    const data = await rss2json(url)
    if (!data?.items.length) throw new Error("Cannot fetch rss data")
    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      id: item.link,
      pubDate: !option?.hiddenDate ? item.created : undefined,
    }))
  }
}

export function defineRSSHubSource(route: string, RSSHubOptions?: RSSHubOption, sourceOption?: SourceOption): SourceGetter {
  return async () => {
    // "https://rsshub.pseudoyu.com"
    const RSSHubBase = "https://rsshub.rssforever.com"
    const url = new URL(route, RSSHubBase)
    url.searchParams.set("format", "json")
    RSSHubOptions = defu<RSSHubOption, RSSHubOption[]>(RSSHubOptions, {
      sorted: true,
    })

    Object.entries(RSSHubOptions).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString())
    })
    const data: RSSHubResponse = await myFetch(url)
    return data.items.map(item => ({
      title: item.title,
      url: item.url,
      id: item.id ?? item.url,
      pubDate: !sourceOption?.hiddenDate ? item.date_published : undefined,
    }))
  }
}

export function proxySource(proxyUrl: string, source: SourceGetter) {
  return process.env.CF_PAGES
    ? defineSource(async () => {
        const data = await myFetch(proxyUrl)
        return data.items
      })
    : source
}

/**
 * Define a paginated source that supports fetching multiple pages
 */
export function definePaginatedSource(source: PaginatedSourceGetter): PaginatedSourceGetter
export function definePaginatedSource(source: PR): PR
export function definePaginatedSource(source: PaginatedSourceGetter | PR): PaginatedSourceGetter | PR {
  return source
}

/**
 * Helper to create a paginated source from offset-based API
 */
export function defineOffsetPaginatedSource(
  fetcher: (offset: number, limit: number) => Promise<{ items: any[], hasMore?: boolean }>,
  mapper: (item: any) => { title: string, url: string, id: string | number, pubDate?: string | number, extra?: any },
  defaultLimit = 30,
): PaginatedSourceGetter {
  return async (params?: PaginationParams): Promise<PaginatedResult> => {
    const offset = params?.offset ?? 0
    const limit = params?.limit ?? defaultLimit
    const result = await fetcher(offset, limit)
    const items = result.items.map(mapper)
    const hasMore = result.hasMore ?? items.length >= limit
    return {
      items,
      nextOffset: hasMore ? offset + limit : undefined,
      hasMore,
    }
  }
}

/**
 * Helper to create a paginated source from page-based API
 */
export function definePagePaginatedSource(
  fetcher: (page: number, limit: number) => Promise<{ items: any[], hasMore?: boolean }>,
  mapper: (item: any) => { title: string, url: string, id: string | number, pubDate?: string | number, extra?: any },
  defaultLimit = 30,
): PaginatedSourceGetter {
  return async (params?: PaginationParams): Promise<PaginatedResult> => {
    const page = params?.page ?? 1
    const limit = params?.limit ?? defaultLimit
    const result = await fetcher(page, limit)
    const items = result.items.map(mapper)
    const hasMore = result.hasMore ?? items.length >= limit
    return {
      items,
      nextPage: hasMore ? page + 1 : undefined,
      hasMore,
    }
  }
}

/**
 * Helper to create a paginated source from cursor-based API
 */
export function defineCursorPaginatedSource(
  fetcher: (cursor: string | undefined, limit: number) => Promise<{ items: any[], nextCursor?: string }>,
  mapper: (item: any) => { title: string, url: string, id: string | number, pubDate?: string | number, extra?: any },
  defaultLimit = 30,
): PaginatedSourceGetter {
  return async (params?: PaginationParams): Promise<PaginatedResult> => {
    const cursor = params?.cursor
    const limit = params?.limit ?? defaultLimit
    const result = await fetcher(cursor, limit)
    const items = result.items.map(mapper)
    return {
      items,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor,
    }
  }
}

/**
 * Wrap a standard SourceGetter as a non-paginated PaginatedSourceGetter
 * Used for backward compatibility
 */
export function wrapAsNonPaginated(getter: SourceGetter): PaginatedSourceGetter {
  return async (): Promise<PaginatedResult> => {
    const items = await getter()
    return {
      items,
      hasMore: false,
    }
  }
}
