// Re-authorise a Cloudflare deploy, with a door that stays open long enough.
//
// wrangler's own `wrangler login` prints a URL and gives you about sixty
// seconds to press Allow. The link is often still in flight when the window
// closes, and the failure it produces says nothing about consent — it says
// the request timed out.
//
// This is the same flow wrangler performs: authorization code with PKCE, the
// same public client, the same redirect URI, the same token endpoint, the
// same scopes. Only the length of the wait changes. The client identifier is
// wrangler's own public client — it is not a secret and there is no secret,
// because PKCE proves the exchange is being completed by the process that
// started it.
//
// The token it writes is never printed. It goes into wrangler's config, in
// wrangler's format, at wrangler's location.
//
//   node scripts/login-cloudflare.mjs           # waits 15 minutes
//   WAIT_MINUTES=30 node scripts/login-cloudflare.mjs
import {createHash, randomBytes} from 'node:crypto';
import {readFile, writeFile, mkdir, rename, chmod, rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname} from 'node:path';
import {credentialPath} from './cloudflare-credential.mjs';

const CLIENT = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const REDIRECT = 'http://localhost:8976/oauth/callback';
const AUTH = 'https://dash.cloudflare.com/oauth2/auth';
const TOKEN = 'https://dash.cloudflare.com/oauth2/token';
const SCOPES = [
  'account:read', 'user:read', 'workers:write', 'workers_kv:write', 'workers_routes:write',
  'workers_scripts:write', 'workers_tail:read', 'd1:write', 'pages:write', 'zone:read',
  'ssl_certs:write', 'ai:write', 'ai-search:write', 'ai-search:run', 'queues:write',
  'pipelines:write', 'secrets_store:write', 'containers:write', 'cloudchamber:write',
  'connectivity:admin', 'email_routing:write', 'email_sending:write', 'offline_access',
];
const MINUTES = Number(process.env.WAIT_MINUTES || 15);
const PORT = Number(process.env.PORT || 8976);
if (!Number.isFinite(MINUTES) || MINUTES <= 0 || MINUTES > 120) throw new Error('WAIT_MINUTES must be between 0 and 120.');
if (PORT !== 8976) throw new Error('Cloudflare redirects to localhost:8976; PORT must be 8976.');
const CONFIG = credentialPath();

const b64 = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const verifier = b64(randomBytes(48));
const challenge = b64(createHash('sha256').update(verifier).digest());
const state = b64(randomBytes(24));

const url = `${AUTH}?response_type=code&client_id=${CLIENT}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
  `&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

console.log('Open this URL, sign in, and press Allow. The door stays open for ' + MINUTES + ' minutes.');
console.log('');
console.log(url);
console.log('');

let done = false;
const server = createServer((req, res) => {
  const callback = new URL(req.url, 'http://localhost');
  const q = callback.searchParams;
  if (callback.pathname === '/oauth/callback' && req.method === 'GET') {
    if (q.get('state') !== state) {
      res.writeHead(400).end('Invalid OAuth state. Use the current login tab.');
      return;
    }
    if (q.get('error') || !q.get('code')) {
      res.writeHead(400).end('Authorisation was not completed. Use the current login tab to try again.');
      return;
    }
    if (done) {
      res.writeHead(409).end('Authorisation is already being processed.');
      return;
    }
    if (!done) {
      done = true;
      exchange(q.get('code')).then(() => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><meta charset="utf-8"><title>FormHypes</title>' +
          '<h1>Authorised</h1><p>The credential is saved. Close this tab and run the deploy command.</p>');
        console.log('TOKEN_WRITTEN ' + CONFIG);
        clearTimeout(waitTimer);
        server.close();
      }).catch(e => {
        // Upstream response bodies may contain credentials; never log them.
        console.error('EXCHANGE_FAILED: credential exchange or save failed. Retry authorisation.');
        res.writeHead(502).end('The credential was not saved. Retry authorisation.');
        // Keep listening: a code from an older tab cannot be exchanged, and
        // the next approval — from the tab that is actually current — can.
        done = false;
      });
    }
    return;
  }
  res.writeHead(404).end('not found');
});

server.on('error', e => {
  console.error('Cannot listen on port ' + PORT + ': ' + e.message);
  process.exit(3);
});
server.listen(PORT, 'localhost', () => console.log('LISTENING ' + PORT));

async function exchange(code) {
  const body = new URLSearchParams({
    client_id: CLIENT, code, code_verifier: verifier,
    grant_type: 'authorization_code', redirect_uri: REDIRECT,
  });
  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const text = await r.text();
  if (!r.ok) throw new Error('token endpoint said ' + r.status);
  const json = JSON.parse(text);
  if (typeof json.access_token !== 'string' || !json.access_token.trim() ||
      typeof json.refresh_token !== 'string' || !json.refresh_token.trim() ||
      !Number.isFinite(Number(json.expires_in)) || Number(json.expires_in) <= 0 ||
      (json.scope !== undefined && typeof json.scope !== 'string')) {
    throw new Error('token endpoint returned an incomplete credential');
  }
  const exp = new Date(Date.now() + (Number(json.expires_in) || 3600) * 1000).toISOString();
  const scopes = (json.scope || SCOPES.join(' ')).split(/\s+/).filter(Boolean);
  let cfg = '';
  try { cfg = await readFile(CONFIG, 'utf8'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const set = (key, value) => {
    const re = new RegExp('^\\s*' + key + '\\s*=.*$', 'm');
    if (re.test(cfg)) cfg = cfg.replace(re, key + ' = ' + value);
    else cfg += '\n' + key + ' = ' + value + '\n';
  };
  set('oauth_token', JSON.stringify(json.access_token));
  set('refresh_token', JSON.stringify(json.refresh_token || ''));
  set('expiration_time', JSON.stringify(exp));
  set('scopes', '[' + scopes.map(s => JSON.stringify(s)).join(', ') + ']');
  await mkdir(dirname(CONFIG), {recursive: true, mode: 0o700});
  const temporary = CONFIG + '.' + randomBytes(12).toString('hex') + '.tmp';
  try {
    await writeFile(temporary, cfg, { mode: 0o600, flag: 'wx' });
    await chmod(temporary, 0o600);
    await rename(temporary, CONFIG);
  } finally { await rm(temporary, {force: true}); }
  console.log('EXPIRES ' + exp);
}

const waitTimer = setTimeout(() => {
    console.log('TIMED_OUT — nobody authorised the deploy.');
    server.close();
    process.exit(2);
}, MINUTES * 60 * 1000);
