// Secrets are set with `wrangler secret put` and never live in wrangler.jsonc, so they are declared here
declare namespace Cloudflare {
  interface Env {
    TURNSTILE_SECRET_KEY?: string;
  }
}
