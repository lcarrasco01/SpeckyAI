export type ApiError = {
  message: string;
  code?: string;
};

export async function apiFetch<TResponse>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `API ${response.status} ${response.statusText}${text ? `: ${text}` : ""}`
    );
  }

  return (await response.json()) as TResponse;
}

