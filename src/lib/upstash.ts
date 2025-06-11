export const BASE_URL = process.env.KV_REST_API_URL;
export const TOKEN = process.env.KV_REST_API_TOKEN;

export async function callUpstash(body: unknown[]): Promise<Response> {
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
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('[lib/upstash] fetch failed:', error);
    const message =
      error instanceof Error
        ? `Network request failed: ${error.message}`
        : 'Network request failed';
    throw new Error(message, { cause: error instanceof Error ? error : undefined });
  }
}

