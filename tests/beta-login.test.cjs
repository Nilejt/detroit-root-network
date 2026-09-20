/* eslint-disable @typescript-eslint/no-require-imports -- Node route test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const source = fs.readFileSync('src/app/api/auth/beta/route.ts', 'utf8');
let calls, role, identityEmail, identityId, verifyError;
const fakeUser = () => ({ id: identityId, email: identityEmail, email_confirmed_at: '2026-01-01' });
const admin = { auth: { admin: {
 getUserById: async () => { calls.push('identity'); return { data: { user: fakeUser() } }; },
 generateLink: async () => { calls.push('link'); return { data: { user: fakeUser(), properties: { hashed_token: 'one-time-test-token' } } }; },
} }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) }) };
const mod = new Module(require('node:path').resolve('beta-test-runtime.cjs'), module);
mod.filename = require('node:path').resolve('beta-test-runtime.cjs');
mod.paths = module.paths;
mod.require = (name) => name === '@supabase/supabase-js' ? { createClient: () => { calls.push('admin'); return admin; } } :
 name === '@supabase/ssr' ? { createServerClient: (_url, _key, options) => ({ auth: { verifyOtp: async () => {
 calls.push('verify'); options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'test-session', options: { path: '/' } }]);
 return { data: { user: fakeUser(), session: {} }, error: verifyError };
 } } }) } : require(name);
mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, mod.filename);
const { GET, POST } = mod.exports;
function reset() {
 Object.assign(process.env, { ENABLE_BETA_CODE_LOGIN: 'true', APP_ORIGIN: 'https://example.test',
 BETA_OWNER_CODE: 'a'.repeat(64), BETA_DIRECTOR_Q_CODE: 'b'.repeat(64),
 BETA_OWNER_USER_ID: 'owner-id', BETA_DIRECTOR_Q_USER_ID: 'q-id',
 NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-public', SUPABASE_SERVICE_ROLE_KEY: 'test-private' });
 calls = []; role = 'owner'; identityEmail = 'nilejt@gmail.com'; identityId = 'owner-id'; verifyError = null;
}
function post(body = { account: 'owner', code: 'a'.repeat(64) }, origin = 'https://example.test') {
 return POST(new NextRequest('https://example.test/api/auth/beta', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }));
}
test('kill switch fails closed and never touches Supabase', async () => {
 reset(); delete process.env.ENABLE_BETA_CODE_LOGIN;
 assert.equal((await post()).status, 404); assert.deepEqual(calls, []);
 assert.deepEqual(await (await GET()).json(), { enabled: false });
});
test('rejects cross-origin, malformed, oversized and unknown-account requests', async () => {
 reset(); assert.equal((await post(undefined, 'https://evil.test')).status, 403);
 assert.equal((await post('{')).status, 400); assert.equal((await post('x'.repeat(1025))).status, 413);
 assert.equal((await post({ account: 'farmer', code: 'a'.repeat(64) })).status, 400); assert.deepEqual(calls, []);
});
test('rejects wrong/cross-account codes before privileged API access', async () => {
 reset(); assert.equal((await post({ account: 'director_q', code: 'a'.repeat(64) })).status, 401);
 assert.equal((await post({ account: 'owner', code: 'wrong' })).status, 401); assert.deepEqual(calls, []);
});
test('missing, short or identical configured codes fail closed', async () => {
 reset(); delete process.env.BETA_OWNER_CODE; assert.equal((await post()).status, 503);
 reset(); process.env.BETA_OWNER_CODE = '1234'; assert.equal((await post()).status, 503);
 reset(); process.env.BETA_DIRECTOR_Q_CODE = process.env.BETA_OWNER_CODE; assert.equal((await post()).status, 503);
 assert.deepEqual(calls, []);
});
test('identity and database role mismatch cannot issue a session', async () => {
 reset(); identityEmail = 'someone@example.test'; assert.equal((await post()).status, 503); assert.ok(!calls.includes('link'));
 reset(); role = 'farmer'; assert.equal((await post()).status, 503); assert.ok(!calls.includes('link'));
});
test('Owner receives only ordinary session cookie, no token/code JSON', async () => {
 reset(); const response = await post(); assert.equal(response.status, 200);
 assert.match(response.headers.get('set-cookie'), /sb-test-auth-token=/);
 assert.equal(response.headers.get('cache-control'), 'no-store');
 assert.deepEqual(await response.json(), { message: 'Signed in.' }); assert.ok(calls.includes('verify'));
});
test('Quinn owner account maps only to Q identity and owner role', async () => {
 reset(); role = 'owner'; identityEmail = 'qhamilton@gmail.com'; identityId = 'q-id';
 assert.equal((await post({ account: 'director_q', code: 'b'.repeat(64) })).status, 200);
});
test('verification failure discards staged session cookies', async () => {
 reset(); verifyError = { message: 'private SDK failure' }; const response = await post();
 assert.equal(response.status, 503); assert.equal(response.headers.get('set-cookie'), null);
 assert.deepEqual(await response.json(), { message: 'Beta login is unavailable.' });
});
