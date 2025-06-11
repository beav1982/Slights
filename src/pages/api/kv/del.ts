// src/pages/api/kv/del.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  runtime: 'nodejs',
};

const BASE_URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

type Data = {
  result?: number;
  error?: string;
  details?: string; // Keep details for structured error
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!BASE_URL || !TOKEN) {
    console.error("[API /kv/del] Upstash URL or Token is missing from server environment variables!");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { key } = req.body;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Key is required in the request body and must be a string' });
  }

  try {
    console.log(`[API /kv/del] Attempting to delete key: ${key}`);
    const upstashResponse = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(["DEL", key]),
    });

    if (!upstashResponse.ok) {
      const errorText = await upstashResponse.text();
      console.error(`[API /kv/del] Upstash error deleting key ${key}. Status: ${upstashResponse.status}. Response: ${errorText}`);
      try {
        const upstashError = JSON.parse(errorText);
        return res.status(upstashResponse.status).json({ error: `Upstash error: ${upstashError.error || errorText}` });
      } catch (_e) { // Changed 'e' to '_e'
        return res.status(upstashResponse.status).json({ error: `Upstash error: ${errorText}` });
      }
    }

    const data = await upstashResponse.json();
    console.log(`[API /kv/del] Successfully deleted key: ${key}. Result:`, data.result);
    return res.status(200).json({ result: data.result });

  } catch (error: unknown) { // Changed 'error: any' to 'error: unknown'
    console.error(`[API /kv/del] Internal error deleting key ${key}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to delete value from KV store';
    return res.status(500).json({ error: message, details: String(error) });
  }
}