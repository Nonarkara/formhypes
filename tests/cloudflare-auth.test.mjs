import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash, randomBytes} from 'node:crypto';
import {dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import {credentialPath, credentialVerdict, parseCredential} from '../scripts/cloudflare-credential.mjs';

test('deployment credentials accept environment authentication and bound OAuth expiry', () => {
  const empty = parseCredential('');
  for (const env of [{CLOUDFLARE_API_TOKEN:'fixture'}, {CF_API_TOKEN:'fixture'},
    {CLOUDFLARE_API_KEY:'fixture',CLOUDFLARE_EMAIL:'fixture@example.invalid'}]) {
    assert.equal(credentialVerdict(empty,{env}).state,'ok');
  }
  assert.equal(credentialVerdict(empty,{env:{CLOUDFLARE_API_KEY:'fixture'}}).state,'reauthorise');
  const previous = process.env.CLOUDFLARE_API_TOKEN;
  try {
    process.env.CLOUDFLARE_API_TOKEN = 'fixture';
    assert.equal(credentialVerdict(empty).state,'ok');
  } finally {
    if (previous === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previous;
  }
  const expired = parseCredential('oauth_token = "fixture"\nexpiration_time = "2020-01-01T00:00:00Z"');
  assert.equal(credentialVerdict(expired,{env:{},now:Date.parse('2021-01-01')}).state,'reauthorise');
  assert.equal(credentialVerdict({...expired,hasRefresh:true},{env:{}}).state,'ok');
});

test('credential location follows Wrangler platform and existing legacy directory', () => {
  const opts = {home:'/fixture',env:{WRANGLER_CONFIG:'/project/wrangler.toml'},platform:'darwin',isDirectory:()=>false};
  assert.equal(credentialPath(opts),'/fixture/Library/Preferences/.wrangler/config/default.toml');
  assert.equal(credentialPath({...opts,platform:'linux'}),'/fixture/.config/.wrangler/config/default.toml');
  assert.equal(credentialPath({...opts,env:{XDG_CONFIG_HOME:'/xdg'}}),'/xdg/.wrangler/config/default.toml');
  assert.equal(credentialPath({...opts,isDirectory:()=>true}),'/fixture/.wrangler/config/default.toml');
});

test('legacy config API tokens remain usable without exposing their values', () => {
  for (const scalar of ['"fixture-api-token"', "'fixture-api-token'", '"fixture-api-token" # comment']) {
    const credential=parseCredential('api_token = '+scalar);
    assert.equal(credential.hasApiToken,true);
    assert.equal(credentialVerdict(credential,{env:{}}).state,'ok');
    assert.ok(!JSON.stringify(credential).includes('fixture-api-token'));
  }
  for (const scalar of ['""', '"   "', '"unterminated', 'false', '123', '"bad\\q"']) {
    const credential=parseCredential('api_token = '+scalar);
    assert.equal(credential.hasApiToken,false);
    assert.equal(credentialVerdict(credential,{env:{}}).state,'reauthorise');
  }
  const both=parseCredential('api_token = "fixture-api-token"\noauth_token = "fixture-oauth"\nexpiration_time = "2020-01-01T00:00:00Z"');
  assert.equal(credentialVerdict(both,{env:{},now:Date.parse('2021-01-01')}).state,'reauthorise',
    'Wrangler prioritises OAuth over legacy API tokens');
});

// Execute the actual login control flow with every I/O boundary replaced.
// No server, remote request, real environment or real credential file is used.
const source = readFileSync(new URL('../scripts/login-cloudflare.mjs',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'');
function loginFixture({env={},response,writeError}={}) {
  let handler, timeout;
  const writes=[],logs=[],requests=[];
  const server={on(){},listen(...args){assert.equal(args[1],'localhost');},close(){}};
  const context={
    createHash,randomBytes,dirname,URL,URLSearchParams,AbortSignal,
    process:{env,exit(code){throw new Error('exit '+code);}},
    credentialPath:()=>'/fixture/config/default.toml',
    console:{log:(...v)=>logs.push(v.join(' ')),error:(...v)=>logs.push(v.join(' '))},
    createServer(fn){handler=fn;return server;},
    setTimeout(fn){timeout=fn;return 1;},clearTimeout(){},
    readFile:async()=> 'unrelated = "keep"\n oauth_token="old"\n',
    mkdir:async()=>{},chmod:async()=>{},rename:async(...args)=>writes.push(['rename',...args]),rm:async()=>{},
    writeFile:async(...args)=>{if(writeError)throw new Error('fixture write failure');writes.push(['write',...args]);},
    fetch:async(...args)=>{requests.push(args);return response || {ok:true,text:async()=>JSON.stringify({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600})};},
  };
  runInNewContext(source,context);
  const authURL=new URL(logs.find(line=>line.startsWith('https:')));
  async function callback(query, pathname='/oauth/callback') {
    const result={};
    const res={writeHead(status){result.status=status;return res;},end(body){result.body=body;return res;}};
    handler({url:pathname+'?'+new URLSearchParams(query),method:'GET'},res);
    await new Promise(resolve=>setImmediate(resolve));
    return result;
  }
  return {callback,state:authURL.searchParams.get('state'),writes,logs,requests,timeout};
}

test('OAuth callback rejects wrong state and lookalike paths before exchange', async () => {
  const fixture=loginFixture();
  assert.equal((await fixture.callback({state:'wrong',code:'fixture-code'})).status,400);
  assert.equal((await fixture.callback({state:fixture.state,code:'fixture-code'},'/oauth/callback/extra')).status,404);
  assert.equal(fixture.requests.length,0);
  assert.equal(fixture.writes.length,0);
});

test('OAuth success follows validated exchange and private atomic credential save', async () => {
  const fixture=loginFixture();
  const res=await fixture.callback({state:fixture.state,code:'fixture-code'});
  assert.equal(res.status,200);
  assert.equal(fixture.requests.length,1);
  const write=fixture.writes.find(entry=>entry[0]==='write');
  assert.equal(write[3].mode,0o600);
  assert.equal(write[3].flag,'wx');
  assert.match(write[2],/unrelated = "keep"/);
  assert.equal((write[2].match(/oauth_token\s*=/g)||[]).length,1);
  assert.match(write[2],/refresh_token = "fixture-refresh"/);
  assert.equal(fixture.writes.at(-1)[0],'rename');
  assert.ok(fixture.requests[0][1].signal);
  assert.ok(fixture.logs.every(line=>!line.includes('fixture-access')&&!line.includes('fixture-refresh')));
});

test('OAuth callback waits for the endpoint before declaring success and rejects duplicate approvals', async () => {
  let release;
  const body=new Promise(resolve=>{release=resolve;});
  const fixture=loginFixture({response:{ok:true,text:()=>body}});
  const first=await fixture.callback({state:fixture.state,code:'fixture-code'});
  assert.equal(first.status,undefined);
  assert.equal(fixture.writes.length,0);
  assert.equal((await fixture.callback({state:fixture.state,code:'second-code'})).status,409);
  release(JSON.stringify({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(first.status,200);
  assert.equal(fixture.requests.length,1);
});

test('OAuth exchange and save failures never claim authorisation or expose bodies', async () => {
  for(const options of [
    {response:{ok:false,status:400,text:async()=> 'fixture-private-upstream-body'}},
    {response:{ok:true,text:async()=>JSON.stringify({access_token:'fixture-access'})}},
    {writeError:true},
  ]) {
    const fixture=loginFixture(options);
    const res=await fixture.callback({state:fixture.state,code:'fixture-code'});
    assert.equal(res.status,502);
    assert.ok(!res.body.includes('Authorised'));
    assert.ok(fixture.logs.every(line=>!line.includes('fixture-private-upstream-body')));
    assert.ok(fixture.writes.every(entry=>entry[0]!=='rename'));
  }
});

test('login rejects unsupported ports and invalid wait times without opening a server', () => {
  assert.throws(()=>loginFixture({env:{PORT:'9000'}}),/PORT must be 8976/);
  for(const WAIT_MINUTES of ['no','-1','Infinity','121']) {
    assert.throws(()=>loginFixture({env:{WAIT_MINUTES}}),/WAIT_MINUTES/);
  }
});
