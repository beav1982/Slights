const DEBUG = true;

type KVSuccessResponse = { success?: boolean; result?: string; [key: string]: unknown };
type KVErrorResponse = { success?: false; error: string; [key: string]: unknown };

export async function clientKvSet(key: string, value: string): Promise<void> {
  const response = await fetch('/api/kv/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    let errorData: KVErrorResponse = { error: `API error setting key ${key}: ${response.status} ${response.statusText}` };
    try { errorData = await response.json(); } catch (_e) { /* ignore parse errors */ }
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  if (DEBUG) console.log(`[client-redis.ts] Set key ${key} success`);
}

export async function clientKvGet(key: string): Promise<string | null> {
  if (DEBUG) console.log(`[client-redis.ts] Calling API to get key: ${key}`);
  const response = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`);

  if (!response.ok) {
    let errorData: KVErrorResponse = { error: `API error getting key ${key}: ${response.status} ${response.statusText}` };
    try { errorData = await response.json(); } catch (_e) { /* ignore parse errors */ }
    if (DEBUG) console.error(`[client-redis.ts] Error:`, errorData);
    return null;
  }
  const data: KVSuccessResponse = await response.json();
  return data.result && typeof data.result === 'string' ? data.result : null;
}

export async function clientKvDelete(key: string): Promise<void> {
  if (DEBUG) console.log(`[client-redis.ts] Calling API to delete key: ${key}`);
  const response = await fetch('/api/kv/del', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    let errorData: KVErrorResponse = { error: `API error deleting key ${key}: ${response.status} ${response.statusText}` };
    try { errorData = await response.json(); } catch (_e) { /* ignore parse errors */ }
    if (DEBUG) console.error(`[client-redis.ts] Error:`, errorData);
    throw new Error(errorData.error);
  }
  if (DEBUG) console.log(`[client-redis.ts] Deleted key ${key} success`);
}
