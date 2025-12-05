
import { fetchUserStatsCached } from './trophies.js';
import { fetchUserCoverageCached } from './geojson.js';

async function runLimited(items, limit, worker) {
  const results = [];
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        results.push(await worker(item));
      } catch (err) {
        results.push({ error: err.message, name: item.name, id: item.id });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export async function statsForUsers(users, ttlMs = 60_000, concurrency = 4) {
  return runLimited(users, concurrency, (u) => fetchUserStatsCached(u, ttlMs));
}

export async function coverageForUsers(users, ttlMs = 60_000, concurrency = 2) {
  return runLimited(users, concurrency, (u) => fetchUserCoverageCached(u, ttlMs));
}
