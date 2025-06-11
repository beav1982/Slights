import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  runtime: 'nodejs',
};

const BASE_URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!BASE_URL || !TOKEN) {
    console.error("[API /kv/set] Upstash URL or Token is missing from server environment variables!");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { key, value } = req.body;

  if (!key || typeof value === 'undefined') {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  try {
    console.log(`[API /kv/set] Setting key: ${key}`);
    const upstashResponse = await fetch(`${BASE_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
      body: value,
    });

    if (!upstashResponse.ok) {
      const errorText = await upstashResponse.text();
      console.error(`[API /kv/set] Upstash error setting key ${key}. Status: ${upstashResponse.status}. Response: ${errorText}`);
      return res.status(upstashResponse.status).json({ error: `Upstash error: ${errorText}` });
    }

    const data = await upstashResponse.json();
    console.log(`[API /kv/set] Successfully set key: ${key}. Upstash response:`, data);
    return res.status(200).json(data);

  } catch (error: unknown) {
    console.error(`[API /kv/set] Error setting key ${key}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to set value in KV store';
    return res.status(500).json({ error: message, details: String(error) });
  }
}
