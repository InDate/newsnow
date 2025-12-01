import { describe, expect, it } from "vitest"

const ENGLISH_SOURCES = [
  // Previously added
  { id: "reddit", name: "Reddit" },
  { id: "bbc", name: "BBC News" },
  // Tech
  { id: "theverge", name: "The Verge" },
  { id: "arstechnica", name: "Ars Technica" },
  { id: "techcrunch", name: "TechCrunch" },
  { id: "wired", name: "Wired" },
  { id: "slashdot", name: "Slashdot" },
  { id: "lobsters", name: "Lobsters" },
  // News
  { id: "reuters", name: "Reuters" },
  { id: "apnews", name: "AP News" },
  { id: "npr", name: "NPR" },
  { id: "theguardian", name: "The Guardian" },
  { id: "cnn", name: "CNN" },
  { id: "aljazeera", name: "Al Jazeera" },
  // Finance
  { id: "yahoofinance", name: "Yahoo Finance" },
  { id: "marketwatch", name: "MarketWatch" },
  // Sports
  { id: "espn", name: "ESPN" },
  // Tech/Startup
  { id: "producthunt", name: "Product Hunt" },
]

describe("english Sources", () => {
  for (const source of ENGLISH_SOURCES) {
    it(`${source.name} (${source.id}) should return news items`, async () => {
      const baseUrl = "http://localhost:5173"
      const response = await fetch(`${baseUrl}/api/s?id=${source.id}`)

      expect(response.ok, `HTTP request failed for ${source.id}`).toBe(true)

      const data = await response.json()

      // Should have items array
      expect(data.items, `${source.id} should have items array`).toBeDefined()
      expect(Array.isArray(data.items), `${source.id} items should be an array`).toBe(true)
      expect(data.items.length, `${source.id} should have at least 1 item`).toBeGreaterThan(0)

      // Each item should have required fields
      const firstItem = data.items[0]
      expect(firstItem.id, `${source.id} item should have id`).toBeDefined()
      expect(firstItem.title, `${source.id} item should have title`).toBeDefined()
      expect(firstItem.url, `${source.id} item should have url`).toBeDefined()

      // Title should be non-empty string
      expect(typeof firstItem.title).toBe("string")
      expect(firstItem.title.length, `${source.id} title should not be empty`).toBeGreaterThan(0)

      console.log(`✓ ${source.name}: ${data.items.length} items, first: "${firstItem.title.substring(0, 50)}..."`)
    }, 30000) // 30 second timeout per source
  }
})
