import type { ConfigState } from '../stores/ConfigStore'
import type { RedditPost } from '../stores/HistoryStore'

type RedditSearchResponse = {
  data: {
    after: string | null
    children: Array<{ data: RedditPost & { thumbnail?: string } }>
  }
}

const buildQuery = (config: ConfigState, after: string | null) => {
  const query = new URLSearchParams({
    q: config.q.toString(),
    sort: config.sort.toString(),
    t: config.t.toString(),
    show: 'all',
    restrict_sr: '1',
    include_over_18: config.nsfw ? 'on' : 'off',
  })
  if (after) query.set('after', after)
  return query
}

const filterImagePosts = <T extends { url: string; thumbnail?: string }>(
  posts: T[],
  config: ConfigState,
) => {
  let filtered = posts
  // Filter by NSFW if enabled
  if (config.nsfw) filtered = filtered.filter((e) => e.thumbnail === 'nsfw')
  return filtered.filter((e) => e.url.includes('i.redd.it'))
}

const fetchPostsFromJson = async (config: ConfigState) => {
  let posts: Array<RedditPost & { thumbnail?: string }> = []
  let after: string | null = null

  while (posts.length < 200) {
    const query = buildQuery(config, after)

    const res = await fetch(`https://www.reddit.com/r/Animewallpaper/search.json?${query}`)

    if (!res.ok) {
      throw new Error(`Reddit API responded with status ${res.status}`)
    }

    let json: RedditSearchResponse
    try {
      json = (await res.json()) as RedditSearchResponse
    } catch {
      throw new Error('Reddit API did not return a JSON response')
    }

    if (!json.data) {
      throw new Error('Reddit API returned an invalid response')
    }

    posts = posts.concat(json.data.children.map((child) => child.data))
    after = json.data.after
    if (!after) break
  }

  return filterImagePosts(posts, config)
}

const parseRssEntry = (entry: Element): RedditPost & { thumbnail?: string } => {
  const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() || ''
  const permalink =
    Array.from(entry.getElementsByTagName('link'))
      .find((el) => el.getAttribute('href')?.includes('/comments/'))
      ?.getAttribute('href') || ''

  const atomId = entry.getElementsByTagName('id')[0]?.textContent?.trim() || ''
  const id = atomId.replace(/^t3_/, '') || permalink.match(/\/comments\/([a-z0-9]+)/)?.[1] || ''

  const url =
    Array.from(entry.getElementsByTagNameNS('*', 'content'))
      .find((el) => el.getAttribute('medium') === 'image')
      ?.getAttribute('url') || ''

  const categories = Array.from(entry.getElementsByTagName('category')).map((el) =>
    el.getAttribute('term'),
  )

  return {
    id,
    title,
    url,
    thumbnail: categories.includes('nsfw') ? 'nsfw' : 'default',
  }
}

const fetchPostsFromRss = async (config: ConfigState) => {
  const posts: Array<RedditPost & { thumbnail?: string }> = []
  const seen = new Set<string>()
  let after: string | null = null

  while (posts.length < 200) {
    const query = buildQuery(config, after)

    const res = await fetch(`https://www.reddit.com/r/Animewallpaper/search.rss?${query}`)

    if (!res.ok) {
      throw new Error(`Reddit RSS responded with status ${res.status}`)
    }

    let xml: string
    try {
      xml = await res.text()
    } catch {
      throw new Error('Reddit RSS did not return a response')
    }

    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('Reddit RSS did not return valid XML')
    }

    const entries = Array.from(doc.getElementsByTagName('entry'))
    const newPosts = entries.map(parseRssEntry).filter((post) => !seen.has(post.id))
    newPosts.forEach((post) => seen.add(post.id))
    posts.push(...newPosts)

    const lastId = entries[entries.length - 1]?.getElementsByTagName('id')[0]?.textContent?.trim()
    if (!lastId || lastId === after) break
    after = lastId
  }

  return filterImagePosts(posts, config)
}

export async function fetchPosts(config: ConfigState) {
  try {
    return await fetchPostsFromJson(config)
  } catch (error) {
    console.warn('[i] Reddit JSON API unavailable, falling back to RSS:', error)
    return fetchPostsFromRss(config)
  }
}
