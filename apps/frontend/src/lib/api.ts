const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function extractError(res: Response): Promise<Error> {
  let message = `Request failed: ${res.status}`
  try {
    const data = await res.json() as { error?: { message?: string } }
    if (data.error?.message) message = data.error.message
  } catch { /* ignore */ }
  return new Error(message)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) throw await extractError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) throw await extractError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                       => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)        => request<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown)        => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                       => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData)   => upload<T>(path, formData),
}

// Absolute URL to an API endpoint, for cases where the browser fetches the
// resource itself rather than going through `request` — e.g. an `<img src>`.
export function apiUrl(path: string): string {
  return `${BASE}/api${path}`
}
