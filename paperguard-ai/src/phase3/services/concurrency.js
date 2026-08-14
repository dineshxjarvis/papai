/**
 * Run async tasks with a concurrency limit.
 */
export async function mapPool(items, concurrency, worker, opts = {}) {
  const list = items || [];
  const results = new Array(list.length);
  let next = 0;
  const n = Math.min(Math.max(1, concurrency), Math.max(1, list.length));

  async function run() {
    while (next < list.length) {
      if (opts.signal?.aborted) break;
      const i = next++;
      try {
        results[i] = await worker(list[i], i);
      } catch (e) {
        results[i] = { __error: e };
      }
    }
  }

  await Promise.all(Array.from({ length: n }, () => run()));
  return results;
}
