import { createRemoteJWKSet, jwtVerify } from 'jose';

let cachedKeys: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedTeamDomain = '';

// Cloudflare Access puts a signed JWT in this header after the admin logs in with the email code.
// Verifying it here keeps /admin closed even if the Access application is removed by mistake.
export async function isAccessAuthorized(request: Request, teamDomain: string, audience: string): Promise<boolean> {
  if (!teamDomain || !audience) return false;

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return false;

  if (!cachedKeys || cachedTeamDomain !== teamDomain) {
    cachedKeys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    cachedTeamDomain = teamDomain;
  }

  try {
    await jwtVerify(token, cachedKeys, { issuer: `https://${teamDomain}`, audience });
    return true;
  } catch {
    return false;
  }
}
