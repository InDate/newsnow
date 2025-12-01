import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

export default defineSource(async () => {
  const data = await rss2json("https://www.producthunt.com/feed")
  if (!data?.items.length) throw new Error("Cannot fetch ProductHunt feed")

  return data.items.map((item) => {
    // Extract tagline from HTML content (first <p> tag)
    let tagline = ""
    if (item.content) {
      const $ = cheerio.load(item.content)
      tagline = $("p").first().text().trim()
    }

    return {
      id: item.id,
      title: tagline ? `${item.title}: ${tagline}` : item.title,
      url: item.link,
      pubDate: item.created,
    } as NewsItem
  })
})
