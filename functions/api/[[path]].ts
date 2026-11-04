type Env = {
  DATA: { get(key: string): Promise<{ body: ReadableStream; uploaded: Date; httpMetadata?: { contentType?: string } } | null> }
}

// Serves the copy the daily cron stored in R2: /api/<host><path>?<query> → key <host><path>?<query>.
export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const url = new URL(request.url)
  const object = await env.DATA.get(url.pathname.slice('/api/'.length) + url.search)
  if (!object) return new Response('Not found', { status: 404 })
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'last-modified': object.uploaded.toUTCString(),
    },
  })
}
