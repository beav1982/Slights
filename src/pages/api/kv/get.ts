import type { NextApiRequest, NextApiResponse } from 'next';
import { callUpstash } from '../../../lib/upstash';

export const config = {
  runtime: 'nodejs',
};


type Data = {
  result?: string | null;
  error?: string;
  details?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }


  const { key } = req.query;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Key query parameter is required and must be a string' });
  }

  try {
    console.log(`[API /kv/get] Attempting to get key: ${key}`);
    const upstashResponse = await callUpstash(['GET', key]);

    if (!upstashResponse.ok) {
      const errorText = await upstashResponse.text();
      console.error(`[API /kv/get] Upstash error getting key ${key}. Status: ${upstashResponse.status}. Response: ${errorText}`);
      try {
        const upstashError = JSON.parse(errorText);
        return res.status(upstashResponse.status).json({ error: `Upstash error: ${upstashError.error || errorText}` });
      } catch (_e) {
        return res.status(upstashResponse.status).json({ error: `Upstash error: ${errorText}` });
      }
    }

    const data = await upstashResponse.json();
    console.log(`[API /kv/get] Successfully got key: ${key}. Value:`, data.result ? String(data.result).substring(0,50) + '...' : null);
    return res.status(200).json({ result: data.result ?? null });

  } catch (error: unknown) {
    console.error(`[API /kv/get] Internal error getting key ${key}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to get value from KV store';
    return res.status(500).json({ error: message, details: String(error) });
  }
}
