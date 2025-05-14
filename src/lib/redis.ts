const BASE_URL = process.env.KV_REST_API_URL!;
const TOKEN = process.env.KV_REST_API_TOKEN!;

export async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/get/${key}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.result ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await fetch(`${BASE_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
}

export async function kvDelete(key: string): Promise<void> {
  await fetch(`${BASE_URL}/del/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
}
