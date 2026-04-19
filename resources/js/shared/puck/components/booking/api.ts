export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/public/booking${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Request failed'), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/public/booking${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.message ?? 'Request failed'), { status: res.status, body });
  }
  return body as T;
}
