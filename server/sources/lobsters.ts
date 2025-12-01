import type { NewsItem } from "@shared/types"

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
