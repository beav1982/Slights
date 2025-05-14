// src/lib/redis.ts (Client-side wrapper for your Next.js API routes)

// This file runs in the browser.
// It will call our Next.js API routes.
// DO NOT attempt to access process.env.KV_REST_API_URL or TOKEN here.

export async function clientKvSet(key: string, value: string): Promise<void> {
  console.log(`[client-redis.ts] Calling API to set key: ${key}`);
  const response = await fetch('/api/kv/set', { // Ensure this path is correct
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    let errorData = { error: `API error setting key ${key}: ${response.status} ${response.statusText}` };
    try {
      errorData = await response.json(); // Try to get more specific error from API response
    } catch (_e) {
      console.error(`[client-redis.ts] API error (could not parse JSON response) setting key ${key}. Status: ${response.status}`);
    }
    console.error(`[client-redis.ts] API error setting key ${key}. Full Response Status: ${response.status} ${response.statusText}`, errorData);
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  // If you expect a JSON response from your /api/kv/set on success:
  // const data = await response.json();
  // console.log(`[client-redis.ts] API successfully set key: ${key}. Response:`, data);
  console.log(`[client-redis.ts] API call to set key ${key} was successful (status ${response.status}).`);
}

export async function clientKvGet(key: string): Promise<string | null> {
  console.log(`[client-redis.ts] Calling API to get key: ${key}`);
  const response = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`); // Ensure this path is correct

  if (!response.ok) {
    let errorData = { error: `API error getting key ${key}: ${response.status} ${response.statusText}` };
     try {
      errorData = await response.json();
    } catch (_e) {
      console.error(`[client-redis.ts] API error (could not parse JSON response) getting key ${key}. Status: ${response.status}`);
    }
    console.error(`[client-redis.ts] API error getting key ${key}. Full Response Status: ${response.status} ${response.statusText}`, errorData);
    return null;
  }
  const data = await response.json();
  return data.result ?? null;
}

export async function clientKvDelete(key: string): Promise<void> {
  console.log(`[client-redis.ts] Calling API to delete key: ${key}`);
  const response = await fetch('/api/kv/del', { // Ensure this path is correct
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

   if (!response.ok) {
    let errorData = { error: `API error deleting key ${key}: ${response.status} ${response.statusText}` };
    try {
      errorData = await response.json();
    } catch (_e) {
      console.error(`[client-redis.ts] API error (could not parse JSON response) deleting key ${key}. Status: ${response.status}`);
    }
    console.error(`[client-redis.ts] API error deleting key ${key}. Full Response Status: ${response.status} ${response.statusText}`, errorData);
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  // console.log(`[client-redis.ts] API call to delete key ${key} was successful.`);
}