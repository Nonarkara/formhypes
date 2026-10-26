// The credential wrangler keeps, and whether a deploy can proceed with it.
//
// Wrangler stores OAuth credentials in its user config directory. A refresh
// token lets Wrangler attempt renewal; it can still be revoked or rejected.
//
// A deploy fails when the access token is dead and no refresh token came
// with it. That failure arrives from inside wrangler as an error about a
// request, so the operator reads it as a network problem and goes looking for
// the wrong thing. This module reads the credential and says, before a single
// byte is staged, whether the deploy can run — and names the way to fix it.
import {readFile} from 'node:fs/promises';
import {existsSync,statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

// Match Wrangler's legacy-directory preference and platform config fallback.
// WRANGLER_CONFIG names a project config, not an OAuth credential file.
export function credentialPath({env = process.env, home = homedir(), platform = process.platform, isDirectory = path => {
  try { return existsSync(path) && statSync(path).isDirectory(); } catch { return false; }
}} = {}) {
  const legacy = join(home, '.wrangler');
  const base = isDirectory(legacy) ? legacy : join(env.XDG_CONFIG_HOME ||
    (platform === 'darwin' ? join(home, 'Library', 'Preferences') :
      platform === 'win32' ? join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'xdg.config') : join(home, '.config')), '.wrangler');
  return join(base, 'config', 'default.toml');
}

// Wrangler writes JSON-quoted TOML strings.
function scalar(text, key) {
  const m = text.match(new RegExp('^[ \\t]*' + key + '[ \\t]*=[ \\t]*(.*)$', 'm'));
  if (!m) return '';
  const v = m[1].trim();
  const quoted = v.match(/^("(?:\\.|[^"\\])*")\s*(?:#.*)?$/);
  if (quoted) {
    try { return JSON.parse(quoted[1]); } catch { return ''; }
  }
  const literal = v.match(/^'([^'\r\n]*)'\s*(?:#.*)?$/);
  return literal ? literal[1] : '';
}

export function parseCredential(text = '') {
  const token = scalar(text, 'oauth_token');
  const refresh = scalar(text, 'refresh_token');
  const expiry = scalar(text, 'expiration_time');
  return {
    hasApiToken: !!scalar(text, 'api_token').trim(),
    hasToken: !!token.trim(),
    hasRefresh: !!refresh.trim(),
    expiresAt: expiry ? Date.parse(expiry) : NaN,
  };
}

export async function readCredential(path = credentialPath()) {
  let text = '';
  try { text = await readFile(path, 'utf8'); } catch { /* no config: no credential */ }
  return parseCredential(text);
}

// The verdict is deliberately blunt. A refresh token means wrangler can renew
// the access token on its own, so the deploy may run. Without one, the access
// token has to be live right now. Anything else is a re-authorisation.
export function credentialVerdict(cred, { now = Date.now(), env = process.env } = {}) {
  if (env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN ||
      ((env.CLOUDFLARE_API_KEY || env.CF_API_KEY) && (env.CLOUDFLARE_EMAIL || env.CF_EMAIL))) {
    return { state: 'ok', reason: 'an environment credential is set' };
  }
  if (cred?.hasApiToken && !cred.hasToken) {
    return { state: 'ok', reason: 'a legacy API token is available for Wrangler to try' };
  }
  if (!cred || (!cred.hasToken && !cred.hasRefresh)) {
    return { state: 'reauthorise', reason: 'no Cloudflare credential is present' };
  }
  if (cred.hasRefresh) {
    return { state: 'ok', reason: 'a refresh token is available for Wrangler to try' };
  }
  if (!Number.isFinite(cred.expiresAt)) {
    return { state: 'reauthorise', reason: 'the access token has no expiry recorded' };
  }
  if (cred.expiresAt <= now) {
    return { state: 'reauthorise', reason: 'the access token has expired' };
  }
  return { state: 'ok', reason: 'the access token is live' };
}

export const CREDENTIAL_COMMAND = 'node scripts/login-cloudflare.mjs';
