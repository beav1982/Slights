import { Agent } from 'undici';
import dns from 'node:dns';

// Re-create these for each call so values from the environment are read at runtime
// rather than during module initialization.


// Use an Undici agent so Node's fetch prefers IPv4 when dispatching requests
const dispatcher = new Agent({
  connect: {
    lookup: (hostname, opts, cb) => dns.lookup(hostname, { family: 4 }, cb),
  },
});

export async function callUpstash(body: unknown[]): Promise<Response> {
  const BASE_URL =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!BASE_URL || !TOKEN) {
    throw new Error('Upstash URL or token missing');
  }
  try {
    return await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      // Prefer IPv4 to avoid potential IPv6 routing issues
      dispatcher,
      body: JSON.stringify(body),
    } as RequestInit);
  } catch (error) {
    console.error('[lib/upstash] fetch failed:', error);
    const message =
      error instanceof Error
        ? `Network request failed: ${error.message}`
        : 'Network request failed';
    throw new Error(message, { cause: error instanceof Error ? error : undefined });
  }
}

