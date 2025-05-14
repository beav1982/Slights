// src/lib/redis.ts (Client-side wrapper for your Next.js API routes)

// This file runs in the browser, so it CANNOT directly access server-side process.env variables.
// It will instead call our Next.js API routes.

export async function clientKvSet(key: string, value: string): Promise<void> {
  console.log(`[client-redis.ts] Calling API to set key: ${key}`);
  const response = await fetch('/api/kv/set', { // Calls your Next.js API route
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value }), // Send key and value to your API route
  });

  if (!response.ok) {
    let errorData = { error: `API error setting key ${key}: ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {
      // If parsing JSON fails, use the generic error
      console.error(`[client-redis.ts] API error (not JSON) setting key ${key}. Status: ${response.status}`);
    }
    console.error(`[client-redis.ts] API error setting key ${key}. Status: ${response.status}`, errorData);
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  // const data = await response.json(); // Assuming your /api/kv/set returns the Upstash response
  // console.log(`[client-redis.ts] API successfully set key: ${key}. Response:`, data);
  return; // Or return data if needed
}

export async function clientKvGet(key: string): Promise<string | null> {
  console.log(`[client-redis.ts] Calling API to get key: ${key}`);
  const response = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`);

  if (!response.ok) {
    let errorData = { error: `API error getting key ${key}: ${response.status}` };
     try {
      errorData = await response.json();
    } catch (e) {
      console.error(`[client-redis.ts] API error (not JSON) getting key ${key}. Status: ${response.status}`);
    }
    console.error(`[client-redis.ts] API error getting key ${key}. Status: ${response.status}`, errorData);
    return null;
  }
  const data = await response.json();
  return data.result ?? null; // Assuming your API returns { result: "the_value" }
}

export async function clientKvDelete(key: string): Promise<void> {
  console.log(`[client-redis.ts] Calling API to delete key: ${key}`);
  const response = await fetch('/api/kv/del', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }), // Send key to your API route
  });

  if (!response.ok) {
    let errorData = { error: `API error deleting key ${key}: ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {
      console.error(`[client-redis.ts] API error (not JSON) deleting key ${key}. Status: ${response.status}`);
    }
    console.error(`[client-redis.ts] API error deleting key ${key}. Status: ${response.status}`, errorData);
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  // const data = await response.json(); // Assuming your /api/kv/del returns something useful
  // console.log(`[client-redis.ts] API successfully deleted key: ${key}. Response:`, data);
}