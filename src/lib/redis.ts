// src/lib/redis.ts (now a client-side wrapper for your API routes)

export async function clientKvSet(key: string, value: string): Promise<void> {
  console.log(`[clientKvSet] Calling API to set key: ${key}`);
  const response = await fetch('/api/kv/set', { // Calls your Next.js API route
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to set value, unknown API error" }));
    console.error(`[clientKvSet] API error setting key ${key}. Status: ${response.status}`, errorData);
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  // const data = await response.json(); // If your API returns something useful on set
  // console.log(`[clientKvSet] API successfully set key: ${key}`, data);
}

// Similar functions for clientKvGet and clientKvDelete will be needed
// For clientKvGet:
export async function clientKvGet(key: string): Promise<string | null> {
  console.log(`[clientKvGet] Calling API to get key: ${key}`);
  // You'll need to create /api/kv/get.ts
  // It would take `key` as a query parameter, e.g., /api/kv/get?key=mykey
  const response = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`);
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({ error: "Failed to get value, unknown API error" }));
    console.error(`[clientKvGet] API error getting key ${key}. Status: ${response.status}`, errorData);
    return null; // Or throw error
  }
  const data = await response.json(); // Assuming your API returns { result: "the_value" }
  return data.result ?? null;
}

export async function clientKvDelete(key: string): Promise<void> {
  console.log(`[clientKvDelete] Calling API to delete key: ${key}`);
  // You'll need to create /api/kv/del.ts
  const response = await fetch('/api/kv/del', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
   if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to delete value, unknown API error" }));
    console.error(`[clientKvDelete] API error deleting key ${key}. Status: ${response.status}`, errorData);
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
}