import { describe, expect, it, vi } from 'vitest'
import { fetchPosts } from '../../src/utils/fetchPosts'
import { makeListing } from '../helpers'

const config = {
  q: 'flair:"Desktop"',
  sort: 'top',
  t: 'year',
  nsfw: false,
} as never

const makeRss = (
  entries: Array<{
    id: string
    title: string
    url: string
    nsfw?: boolean
  }>,
) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
${entries
  .map(
    (entry) => `  <entry>
    <author><name>/u/example</name></author>
    ${entry.nsfw ? '<category term="nsfw"/>' : '<category term="Desktop"/>'}
    <id>t3_${entry.id}</id>
    <link href="https://www.reddit.com/r/Animewallpaper/comments/${entry.id}/some_title/"/>
    <media:content url="${entry.url}" medium="image"/>
    <title>${entry.title}</title>
  </entry>`,
  )
  .join('\n')}
</feed>`

describe('fetchPosts', () => {
  it('builds the query, paginates, and filters image posts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeListing(
            [
              { url: 'https://i.redd.it/1.jpg', thumbnail: 'default' },
              { url: 'https://example.com/skip.jpg', thumbnail: 'default' },
            ],
            'after-1',
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeListing([{ url: 'https://i.redd.it/2.jpg', thumbnail: 'default' }], null),
      })

    vi.stubGlobal('fetch', fetchMock)

    const posts = await fetchPosts(config)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const firstUrl = fetchMock.mock.calls[0]?.[0] as string
    const secondUrl = fetchMock.mock.calls[1]?.[0] as string
    expect(firstUrl).toContain('include_over_18=off')
    expect(firstUrl).not.toContain('after=')
    expect(firstUrl).toContain('restrict_sr=1')
    expect(secondUrl).toContain('after=after-1')

    expect(posts).toEqual([
      { url: 'https://i.redd.it/1.jpg', thumbnail: 'default' },
      { url: 'https://i.redd.it/2.jpg', thumbnail: 'default' },
    ])
  })

  it('filters to nsfw i.redd.it posts when nsfw is enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeListing(
          [
            { url: 'https://i.redd.it/nsfw.jpg', thumbnail: 'nsfw' },
            { url: 'https://i.redd.it/sfw.jpg', thumbnail: 'default' },
            { url: 'https://example.com/nsfw.jpg', thumbnail: 'nsfw' },
          ],
          null,
        ),
    })

    vi.stubGlobal('fetch', fetchMock)

    const posts = await fetchPosts({
      q: 'flair:"Desktop"',
      sort: 'top',
      t: 'year',
      nsfw: true,
    } as never)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0] as string).toContain('include_over_18=on')
    expect(posts).toEqual([{ url: 'https://i.redd.it/nsfw.jpg', thumbnail: 'nsfw' }])
  })

  it('falls back to the RSS feed when the JSON API returns a non-2xx status', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValue({
        ok: true,
        text: async () =>
          makeRss([
            { id: 'abc', title: 'Wallpaper [1920x1080]', url: 'https://i.redd.it/abc.jpg' },
            { id: 'def', title: 'Skip [1024x768]', url: 'https://example.com/def.jpg' },
          ]),
      })

    vi.stubGlobal('fetch', fetchMock)

    const posts = await fetchPosts(config)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]?.[0] as string).toContain('search.rss')
    expect(posts).toEqual([
      {
        id: 'abc',
        title: 'Wallpaper [1920x1080]',
        url: 'https://i.redd.it/abc.jpg',
        thumbnail: 'default',
      },
    ])
    warnSpy.mockRestore()
  })

  it('falls back to the RSS feed when the JSON API returns HTML instead of JSON', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token \'<\', "<body clas" is not valid JSON')
        },
      })
      .mockResolvedValue({
        ok: true,
        text: async () =>
          makeRss([{ id: 'xyz', title: 'Nice [2560x1440]', url: 'https://i.redd.it/xyz.jpg' }]),
      })

    vi.stubGlobal('fetch', fetchMock)

    const posts = await fetchPosts(config)

    expect(posts).toEqual([
      {
        id: 'xyz',
        title: 'Nice [2560x1440]',
        url: 'https://i.redd.it/xyz.jpg',
        thumbnail: 'default',
      },
    ])
    warnSpy.mockRestore()
  })

  it('filters RSS posts by nsfw category when nsfw is enabled', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValue({
        ok: true,
        text: async () =>
          makeRss([
            { id: 'ns', title: 'NSFW [1920x1080]', url: 'https://i.redd.it/ns.jpg', nsfw: true },
            { id: 'sf', title: 'SFW [1920x1080]', url: 'https://i.redd.it/sf.jpg' },
          ]),
      })

    vi.stubGlobal('fetch', fetchMock)

    const posts = await fetchPosts({
      q: 'flair:"Desktop"',
      sort: 'top',
      t: 'year',
      nsfw: true,
    } as never)

    expect(posts).toEqual([
      {
        id: 'ns',
        title: 'NSFW [1920x1080]',
        url: 'https://i.redd.it/ns.jpg',
        thumbnail: 'nsfw',
      },
    ])
    warnSpy.mockRestore()
  })

  it('rejects when both the JSON API and the RSS feed return a non-2xx status', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 403, message: 'Forbidden' }),
      }),
    )

    await expect(fetchPosts(config)).rejects.toThrow('RSS responded with status 403')
    warnSpy.mockRestore()
  })

  it('rejects when the RSS feed returns invalid XML', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
        .mockResolvedValue({ ok: true, text: async () => '<feed><entry></feed>' }),
    )

    await expect(fetchPosts(config)).rejects.toThrow('did not return valid XML')
    warnSpy.mockRestore()
  })
})
