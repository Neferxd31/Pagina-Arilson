import { createRemoteJWKSet, jwtVerify } from 'jose';

let cachedKeys: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedTeamDomain = '';

// Cloudflare Access puts a signed JWT in this header after the admin logs in with the email code.
// Verifying it here keeps /admin closed even if the Access application is removed by mistake.
// Returns the logged-in email, or null when the token is missing or invalid.
export async function getAccessEmail(request: Request, teamDomain: string, audience: string): Promise<string | null> {
  if (!teamDomain || !audience) return null;

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return null;

  if (!cachedKeys || cachedTeamDomain !== teamDomain) {
    cachedKeys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    cachedTeamDomain = teamDomain;
  }

  try {
    const { payload } = await jwtVerify(token, cachedKeys, { issuer: `https://${teamDomain}`, audience });
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

// ADMIN_EMAILS en wrangler.jsonc: correos separados por coma. Vacío = nadie entra al admin
export function parseAdminEmails(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes('@'));
}

export function isAllowedAdmin(email: string | null, allowedEmails: string[]): boolean {
  if (!email) return false;
  return allowedEmails.includes(email.trim().toLowerCase());
}
