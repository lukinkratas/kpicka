import { metadataUrl, sources, type Metric } from "../src/data";

type Env = { BUCKET: R2Bucket };

async function download(url: string) {
  const response = await fetch(url).catch((error) => {
    throw new Error(`${url}: ${error}`);
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

// Raw source responses are stored unchanged; parsing stays in the frontend.
// A failed source keeps its previous object, so the page shows the last valid download.
async function refresh(env: Env) {
  const jobs = (Object.keys(sources) as Metric[]).flatMap((id) => {
    const meta = metadataUrl(id);
    return [
      { key: `data/${id}`, url: sources[id] },
      ...(meta ? [{ key: `metadata/${id}`, url: meta }] : []),
    ];
  });
  const results = await Promise.allSettled(
    jobs.map(async ({ key, url }) => env.BUCKET.put(key, await download(url))),
  );
  const failed = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
  if (failed.length) throw new Error(`Failed sources:\n${failed.join("\n")}`);
}

export default {
  scheduled: (_controller, env) => refresh(env),
} satisfies ExportedHandler<Env>;
