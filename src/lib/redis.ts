// src/lib/redis.ts
const BASE_URL = process.env.KV_REST_API_URL; // Removed '!' for initial check
const TOKEN = process.env.KV_REST_API_TOKEN; // Removed '!' for initial check

if (!BASE_URL || !TOKEN) {
  console.error("FATAL: Upstash URL or Token is missing from environment variables!");
  // Consider throwing an error in dev to stop execution if these are missing
  // throw new Error("FATAL: Upstash URL or Token is missing!");
} else {
  console.log("[redis.ts] Initialized with BASE_URL:", BASE_URL.substring(0, 20) + "..."); // Log a portion for privacy
}

export async function kvGet(key: string): Promise<string | null> {
  if (!BASE_URL || !TOKEN) {
    console.error("[redis.ts] kvGet: Upstash config missing at call time.");
    return null; // Or throw new Error("Upstash config missing");
  }
  console.log(`[redis.ts] kvGet: Fetching key: ${key}`);
  const res = await fetch(`${BASE_URL}/get/${key}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[redis.ts] kvGet: Error fetching key ${key}. Status: ${res.status}. Response: ${errorText}`);
    return null;
  }
  const data = await res.json();
  return data.result ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (!BASE_URL || !TOKEN) {
    console.error("[redis.ts] kvSet: Upstash config missing at call time.");
    throw new Error("Upstash config missing");
  }
  console.log(`[redis.ts] kvSet: Setting key: ${key}`);
  // 'value' is ALREADY a string here, often JSON.stringified by the caller.
  // Upstash /set endpoint expects the raw value.
  const res = await fetch(`${BASE_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      // 'Content-Type': 'text/plain', // Or application/json if value is always a JSON string
    },
    body: value,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[redis.ts] kvSet: Error setting key ${key}. Status: ${res.status}. Response: ${errorText}`);
    throw new Error(`Upstash kvSet failed for key ${key}: ${res.status}`);
  }
  console.log(`[redis.ts] kvSet: Successfully set key: ${key}`);
}

export async function kvDelete(key: string): Promise<void> {
  if (!BASE_URL || !TOKEN) {
    console.error("[redis.ts] kvDelete: Upstash config missing at call time.");
    throw new Error("Upstash config missing");
  }
  console.log(`[redis.ts] kvDelete: Deleting key: ${key}`);
  // Using the command endpoint style for DEL
  const res = await fetch(`${BASE_URL}`, { // Command endpoint is usually the base URL
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(["DEL", key]), // Command format ["DEL", "key1", "key2", ...]
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[redis.ts] kvDelete: Error deleting key ${key}. Status: ${res.status}. Response: ${errorText}`);
    throw new Error(`Upstash kvDelete failed for key ${key}: ${res.status}`);
  }
  console.log(`[redis.ts] kvDelete: Successfully deleted key: ${key}`);
}