// src/pages/api/kv/del.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const BASE_URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

type Data = {
  result?: number; // DEL command returns the number of keys deleted
  error?: string;
  details?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') { // Using POST for delete for consistency with body
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
    // Using the command endpoint style for DEL
    const upstashResponse = await fetch(`${BASE_URL}`, { // Command endpoint is usually the base URL
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(["DEL", key]), // Command format ["DEL", "key1", "key2", ...]
    });

    if (!upstashResponse.ok) {
      const errorText = await upstashResponse.text();
      console.error(`[API /kv/del] Upstash error deleting key ${key}. Status: ${upstashResponse.status}. Response: ${errorText}`);
      try {
        const upstashError = JSON.parse(errorText);
        return res.status(upstashResponse.status).json({ error: `Upstash error: ${upstashError.error || errorText}` });
      } catch (e) {
        return res.status(upstashResponse.status).json({ error: `Upstash error: ${errorText}` });
      }
    }

    const data = await upstashResponse.json(); // DEL returns { "result": <number_of_keys_deleted> }
    console.log(`[API /kv/del] Successfully deleted key: ${key}. Result:`, data.result);
    return res.status(200).json({ result: data.result });

  } catch (error: any) {
    console.error(`[API /kv/del] Internal error deleting key ${key}:`, error);
    return res.status(500).json({ error: 'Failed to delete value from KV store', details: error.message });
  }
}