import type { NewsItem } from "@shared/types"
import type { PaginatedResult, PaginationParams } from "#/types"
import { registerPaginatedGetter } from "#/paginatedGetters"

export default defineSource(async () => {
  const response: any = await myFetch("https://lobste.rs/hottest.json")
  const news: NewsItem[] = []

  for (const item of response.slice(0, 30)) {
    if (item.short_id && item.title) {
      news.push({
        id: item.short_id,
        title: item.title,
        url: item.comments_url,
        extra: {
          info: `${item.score} pts`,
          hover: item.tags?.join(", "),
        },
      })
    }
  }

  return news
})

// Paginated getter using Lobsters' page parameter
async function paginatedGetter(params?: PaginationParams): Promise<PaginatedResult> {
  const page = params?.page ?? 1

  const url = `https://lobste.rs/hottest/page/${page}.json`
  const response: any = await myFetch(url)
  const news: NewsItem[] = []

  for (const item of response) {
    if (item.short_id && item.title) {
      news.push({
        id: item.short_id,
        title: item.title,
        url: item.comments_url,
        extra: {
          info: `${item.score} pts`,
          hover: item.tags?.join(", "),
        },
      })
    }
  }

  return {
    items: news,
    nextPage: news.length > 0 ? page + 1 : undefined,
    hasMore: news.length > 0,
  }
}

registerPaginatedGetter("lobsters", paginatedGetter)
