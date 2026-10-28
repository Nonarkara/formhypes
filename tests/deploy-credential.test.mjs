import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

/* The deployer, run.

   The credential module and the OAuth exchange are guarded in
   cloudflare-auth.test.mjs. What that file does not do is run the deployer.
   This one does: it puts the shipped scripts in a repository, gives them a
   credential (or none), and reads the exit code and the words.

   The claim being checked: a deploy that cannot be authorised stops BEFORE
   it stages anything, and it says which command fixes it. wrangler reports a
   dead token as a failed request, which reads like a network fault; the
   deployer must name the problem before the upload starts. */

const gitPath = execFileSync('/usr/bin/which', ['git'], {encoding: 'utf8'}).trim();

async function deployFixture(fn, ambientEnv = process.env) {
  const root = await mkdtemp(join(tmpdir(), 'shdt-deploy-test-'));
  const repo = join(root, 'repo');
  const bin = join(root, 'bin');
  const home = join(root, 'home');
  await mkdir(join(repo, 'scripts'), {recursive: true});
  await mkdir(bin);
  // wrangler keeps its credential in <home>/.wrangler/config/default.toml
  // when that directory is there. Make it there.
  await mkdir(join(home, '.wrangler', 'config'), {recursive: true});
  for (const f of ['deploy.mjs', 'public-release.mjs', 'cloudflare-credential.mjs']) {
    await copyFile(new URL('../scripts/' + f, import.meta.url), join(repo, 'scripts', f));
  }
  // A PATH that has git and nothing else: the deployer must reach its
  // credential gate before it ever looks for wrangler.
  await execFileSync('/bin/ln', ['-s', gitPath, join(bin, 'git')]);
  const git = (...args) => execFileSync(gitPath, args, {cwd: repo, encoding: 'utf8'});
  git('init', '-q');
  git('config', 'user.name', 'Deploy fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.');
  git('commit', '-qm', 'Deploy fixture');
  const config = join(home, '.wrangler', 'config', 'default.toml');
  const env = {...ambientEnv, PATH: bin, HOME: home, XDG_CONFIG_HOME: join(root, 'xdg')};
  // Each case supplies its own credential. An operator's API token or global
  // key must not silently authorise the absent/expired OAuth fixtures.
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN', 'CLOUDFLARE_API_KEY',
    'CF_API_KEY', 'CLOUDFLARE_EMAIL', 'CF_EMAIL']) delete env[key];
  try {
    return await fn({repo, bin, home, config, env, git});
  } finally {
    await rm(root, {recursive: true, force: true});
  }
}

const runDeploy = async ({repo, env, config}, text) => {
  if (text !== null) await writeFile(config, text);
  return spawnSync(process.execPath, ['scripts/deploy.mjs'], {cwd: repo, encoding: 'utf8', env});
};

test('ambient Cloudflare credential aliases cannot authorise the fixture', () => deployFixture(async f => {
  const r = await runDeploy(f, '');
  assert.equal(r.status, 4, 'ambient credentials bypassed the fixture credential gate');
  assert.match(r.stderr, /no Cloudflare credential is present/i);
}, {...process.env, CLOUDFLARE_API_TOKEN: 'fixture-token', CF_API_TOKEN: 'fixture-token',
  CLOUDFLARE_API_KEY: 'fixture-key', CF_API_KEY: 'fixture-key',
  CLOUDFLARE_EMAIL: 'fixture@example.invalid', CF_EMAIL: 'fixture@example.invalid'}));

test('the deployer refuses without a credential and names the command that fixes it', () => deployFixture(async f => {
  const r = await runDeploy(f, '');
  assert.equal(r.status, 4, 'the deploy was not refused for want of a credential');
  assert.match(r.stderr, /cannot be authorised/i);
  assert.match(r.stderr, /login-cloudflare\.mjs/, 'the deployer did not say how to fix it');
  // Nothing was staged: the refusal comes before any upload.
  assert.doesNotMatch(r.stdout, /Deploying|https:\/\//);
}));

test('the deployer refuses an expired token that has no refresh token', () => deployFixture(async f => {
  const r = await runDeploy(f, 'oauth_token = "abc"\nexpiration_time = "2001-01-01T00:00:00.000Z"\n');
  assert.equal(r.status, 4, 'an expired token was allowed to deploy');
  assert.match(r.stderr, /expired/i);
}));

test('a credential that can be renewed carries the deploy past the gate', () => deployFixture(async f => {
  // Exit 5 is "the credential was fine and wrangler is not installed" — the
  // proof that the gate opened and the next gate caught it.
  const r = await runDeploy(f, 'oauth_token = "abc"\nrefresh_token = "def"\nexpiration_time = "2001-01-01T00:00:00.000Z"\n');
  assert.equal(r.status, 5, 'the deploy did not get past the credential gate: ' + r.stdout + r.stderr);
  assert.match(r.stderr, /wrangler is not on PATH/i);
}));

test('a dirty tree is refused before anything else is attempted', () => deployFixture(async f => {
  await writeFile(join(f.repo, 'scripts', 'uncommitted.txt'), 'an edit that was never committed\n');
  const r = await runDeploy(f, 'oauth_token = "abc"\nrefresh_token = "def"\nexpiration_time = "2001-01-01T00:00:00.000Z"\n');
  assert.notEqual(r.status, 0, 'a dirty tree was deployed');
  assert.match(r.stderr, /dirty/i);
  // The dirty tree is refused before the credential is even asked about, so
  // the message is about the tree.
  assert.doesNotMatch(r.stderr, /cannot be authorised/i);
}));
