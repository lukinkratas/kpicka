import { sources } from '../src/data'

type Env = { DATA: { put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> } }

// Daily cron: copy every source (and ČSÚ metadata) into R2 under host + path + query, the key the Pages Function serves.
export default {
  async scheduled(_controller: unknown, env: Env) {
    const urls = Object.values(sources).map(source => new URL(source))
      .flatMap(url => url.host === 'data.csu.gov.cz' ? [url, new URL(url.origin + url.pathname)] : [url])
    // A failed source keeps its previous copy; the others are still refreshed.
    const results = await Promise.allSettled(urls.map(async url => {
      // A hung source must not hold the whole run until the Worker limit.
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
      // Outage pages may come with 200; none of the sources serve HTML.
      if (response.headers.get('content-type')?.includes('text/html')) throw new Error(`${url}: HTML instead of data`)
      // R2 needs a known length, so buffer instead of streaming the body.
      await env.DATA.put(url.host + url.pathname + url.search, await response.arrayBuffer(), {
        httpMetadata: { contentType: response.headers.get('content-type') ?? undefined },
      })
    }))
    const errors = results.flatMap(result => result.status === 'rejected' ? [result.reason] : [])
    // Throwing marks the cron run as failed in the Cloudflare dashboard.
    if (errors.length) throw new AggregateError(errors, `${errors.length} sources failed`)
  },
}
