export async function fetchJSON<T>(
  resource: RequestInfo,
  init?: RequestInit | undefined
): Promise<T> {
  const response = await fetch(resource, init);
  const data = (await response.json()) as T & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed with ${response.status}`
    );
  }

  return data;
}
