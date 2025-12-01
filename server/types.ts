import type { NewsItem, SourceID } from "@shared/types"

export interface RSSInfo {
  title: string
  description: string
  link: string
  image: string
  updatedTime: string
  items: RSSItem[]
}
export interface RSSItem {
  title: string
  description: string
  link: string
  created?: string
}

export interface CacheInfo {
  id: SourceID
  items: NewsItem[]
  updated: number
}

export interface CacheRow {
  id: SourceID
  data: string
  updated: number
}

export interface RSSHubInfo {
  title: string
  home_page_url: string
  description: string
  items: RSSHubItem[]
}

export interface RSSHubItem {
  id: string
  url: string
  title: string
  content_html: string
  date_published: string
}

export interface UserInfo {
  id: string
  email: string
  type: "github"
  data: string
  created: number
  updated: number
}

export interface RSSHubOption {
  // default: true
  sorted?: boolean
  // default: 20
  limit?: number
}

export interface SourceOption {
  // default: false
  hiddenDate?: boolean
}

export type SourceGetter = () => Promise<NewsItem[]>

export interface PaginationParams {
  page?: number
  offset?: number
  cursor?: string
  limit?: number
}

export interface PaginatedResult {
  items: NewsItem[]
  nextPage?: number
  nextOffset?: number
  nextCursor?: string
  hasMore: boolean
}

export type PaginatedSourceGetter = (params?: PaginationParams) => Promise<PaginatedResult>

export interface SourceGetterConfig {
  /** Standard getter for backwards compatibility */
  getter?: SourceGetter
  /** Paginated getter for filter support */
  paginatedGetter?: PaginatedSourceGetter
  /** Default items per page */
  pageSize?: number
}
