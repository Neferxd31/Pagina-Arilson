const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare's official test secret: always passes. Only used by `npm run dev`
export const DEV_TEST_SECRET = '1x0000000000000000000000000000000AA';

// Asks Cloudflare whether the checkout token came from a real person. Any failure counts as "not verified"
export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || !secret) return false;

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (remoteIp) form.append('remoteip', remoteIp);

  try {
    const response = await fetchFn(VERIFY_URL, { method: 'POST', body: form });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
