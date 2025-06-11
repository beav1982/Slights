import https from 'node:https';

// Re-create these for each call so values from the environment are read at runtime
// rather than during module initialization.


const agent = new https.Agent({ family: 4 });

export async function callUpstash(body: unknown[]): Promise<Response> {
  const BASE_URL = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(agent ? { agent } : {} as any),
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

