// Secrets are set with `wrangler secret put` and never live in wrangler.jsonc, so they are declared here
declare namespace Cloudflare {
  interface Env {
    TURNSTILE_SECRET_KEY?: string;
  }
}

declare namespace App {
  interface Locals {
    // Email of the logged-in admin, set by src/middleware.ts on /admin and /api/admin routes
    adminEmail?: string;
  }
}
