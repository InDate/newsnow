import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"
import type { PaginatedResult, PaginationParams } from "#/types"
import { registerPaginatedGetter } from "#/paginatedGetters"

const baseURL = "https://news.ycombinator.com"

function parseHNPage(html: string): NewsItem[] {
  const $ = cheerio.load(html)
  const $main = $(".athing")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find(".titleline a").first()
    const title = a.text()
    const id = $(el).attr("id")
    const score = $(`#score_${id}`).text()
    const url = `${baseURL}/item?id=${id}`
    if (url && id && title) {
      news.push({
        url,
        title,
        id,
        extra: {
          info: score,
        },
      })
    }
  })
  return news
}

export default defineSource(async () => {
  const html: any = await myFetch(baseURL)
  return parseHNPage(html)
})

// Paginated getter using HackerNews' page parameter
async function paginatedGetter(params?: PaginationParams): Promise<PaginatedResult> {
  const page = params?.page ?? 1

  const url = page === 1 ? baseURL : `${baseURL}/news?p=${page}`
  const html: any = await myFetch(url)
  const news = parseHNPage(html)

  return {
    items: news,
    nextPage: news.length > 0 ? page + 1 : undefined,
    hasMore: news.length > 0,
  }
}

registerPaginatedGetter("hackernews", paginatedGetter)
