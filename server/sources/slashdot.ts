import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

export default defineSource(async () => {
  const url = "https://slashdot.org/"
  const html: any = await myFetch(url)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $("article.fhitem").each((_, el) => {
    const $el = $(el)
    const $title = $el.find(".story-title a").first()
    const title = $title.text().trim()
    const href = $title.attr("href")
    const id = $el.attr("data-fhid") || href
    if (title && href) {
      news.push({
        id: id || href,
        title,
        url: href.startsWith("http") ? href : `https://slashdot.org${href}`,
      })
    }
  })

  return news.slice(0, 30)
})
