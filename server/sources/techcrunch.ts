import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

export default defineSource(async () => {
  const url = "https://techcrunch.com/"
  const html: any = await myFetch(url)
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $(".loop-card__title a, .post-block__title a").each((_, el) => {
    const $el = $(el)
    const title = $el.text().trim()
    const href = $el.attr("href")
    if (title && href && title.length > 5) {
      const id = href.split("/").filter(Boolean).pop() || href
      if (!news.find(n => n.id === id)) {
        news.push({
          id,
          title,
          url: href,
        })
      }
    }
  })

  return news.slice(0, 30)
})
