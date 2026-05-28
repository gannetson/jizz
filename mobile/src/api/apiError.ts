/** Extract a user-visible message from a failed API response body. */
export function formatApiDetail(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail)) {
    return d.detail.map((x) => String(x)).join(' ');
  }
  if (typeof d.error === 'string') return d.error;
  if (typeof d.message === 'string') return d.message;
  return null;
}

export async function readApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  if (response.status === 404) {
    return (
      'Checklist is not available on this server (404). ' +
      'Deploy the latest API or set EXPO_PUBLIC_API_URL to your dev backend.'
    );
  }
  if (response.status === 401) {
    return 'Session expired. Please sign in again.';
  }
  const data = await response.json().catch(() => null);
  return formatApiDetail(data) ?? `${fallback} (${response.status})`;
}
