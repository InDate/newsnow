import type { NewsItem } from "@shared/types"
import type { PaginatedResult, PaginationParams } from "#/types"
import { registerPaginatedGetter } from "#/paginatedGetters"

const DEFAULT_LIMIT = 30

export default defineSource(async () => {
  const url = `https://www.reddit.com/r/popular.json?limit=${DEFAULT_LIMIT}`
  const response: any = await myFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsNow/1.0)",
    },
  })

  const news: NewsItem[] = []
  const posts = response?.data?.children || []

  for (const post of posts) {
    const data = post.data
    if (data.id && data.title) {
      news.push({
        id: data.id,
        title: data.title,
        url: `https://www.reddit.com${data.permalink}`,
        extra: {
          info: `↑ ${data.score}`,
          hover: data.subreddit_name_prefixed,
        },
      })
    }
  }

  return news
})

// Paginated getter using Reddit's cursor-based "after" parameter
async function paginatedGetter(params?: PaginationParams): Promise<PaginatedResult> {
  const limit = params?.limit ?? DEFAULT_LIMIT
  const cursor = params?.cursor

  let url = `https://www.reddit.com/r/popular.json?limit=${limit}`
  if (cursor) {
    url += `&after=${cursor}`
  }

  const response: any = await myFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsNow/1.0)",
    },
  })

  const news: NewsItem[] = []
  const posts = response?.data?.children || []

  for (const post of posts) {
    const data = post.data
    if (data.id && data.title) {
      news.push({
        id: data.id,
        title: data.title,
        url: `https://www.reddit.com${data.permalink}`,
        extra: {
          info: `↑ ${data.score}`,
          hover: data.subreddit_name_prefixed,
        },
      })
    }
  }

  const nextCursor = response?.data?.after

  return {
    items: news,
    nextCursor,
    hasMore: !!nextCursor,
  }
}

registerPaginatedGetter("reddit", paginatedGetter)
