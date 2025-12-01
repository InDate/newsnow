import type { NewsItem } from "@shared/types"

export default defineSource(async () => {
  const url = "https://www.reddit.com/r/popular.json?limit=30"
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
