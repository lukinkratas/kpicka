type Env = { BUCKET: R2Bucket };

// Serves the raw source copies stored by the cron worker (worker/cron.ts) from R2.
// Last-Modified carries the time of the last successful download from the source.
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const object = await env.BUCKET.get([params.path ?? []].flat().join("/"));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: { "Last-Modified": object.uploaded.toUTCString() },
  });
};
