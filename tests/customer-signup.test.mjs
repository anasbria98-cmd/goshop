import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServerClient } from '@supabase/ssr';
import { createRequire } from 'node:module';
import { load } from 'cheerio';

// Explicit opt-in: these end-to-end tests create new customers ONLY locally.
const app = process.env.GOELEC_TEST_SIGNUP_APP;
const supabaseUrl = process.env.GOELEC_TEST_SIGNUP_SUPABASE_URL;
const publicKey = process.env.GOELEC_TEST_SIGNUP_PUBLIC_KEY;
const enabled = Boolean(app && supabaseUrl && publicKey);
const require = createRequire(import.meta.url);
const loopback = value => {
  const url = new URL(value);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Signup tests require loopback URLs');
  return url;
};

test('Storefront signup saves and displays each new customer’s own name and email', {skip: !enabled}, async () => {
  const origin = loopback(app).origin;
  loopback(supabaseUrl);
  const signup = await fetch(`${origin}/auth/sign-up`);
  assert.equal(signup.status, 200);
  const $ = load(await signup.text());
  assert.equal($('form input[name=first_name]').length, 1);
  assert.equal($('form input[name=last_name]').length, 1);
  const manifest = JSON.parse(await readFile(new URL('../.next/dev/server/server-reference-manifest.json', import.meta.url), 'utf8'));
  const actionId = Object.entries(manifest.node).find(([, action]) => action.exportedName === 'signUp')?.[0];
  assert.ok(actionId, 'Run the local development app before the signup tests');
  const { encodeReply } = require('next/dist/compiled/react-server-dom-webpack/client.node.js');
  const identities = [];
  for (const names of [{first_name:'Amina',last_name:'El Mansouri'}, {first_name:'Youssef',last_name:'Bennani'}]) {
    const email = `signup-${randomBytes(10).toString('hex')}@example.com`;
    const password = `${randomBytes(24).toString('base64url')}aA1!`;
    const form = new FormData();
    for (const [key,value] of Object.entries({...names,email,password})) form.set(key,value);
    // Submitted role/identity fields must not become customer metadata or profile permissions.
    form.set('role','super_admin');form.set('firstName','Unrelated default');
    const response = await fetch(`${origin}/auth/sign-up`, {
      method:'POST',redirect:'manual',
      headers:{origin,accept:'text/x-component','next-action':actionId},
      body:await encodeReply([form]),
    });
    assert.ok(response.headers.get('x-action-redirect')?.includes('/auth/sign-in'), 'Signup should retain its existing confirmation redirect');
    const jar = new Map();
    const auth = createServerClient(supabaseUrl,publicKey,{cookies:{
      getAll:()=>[...jar].map(([name,value])=>({name,value})),
      setAll:items=>items.forEach(({name,value})=>jar.set(name,value)),
    }});
    const {data,error} = await auth.auth.signInWithPassword({email,password});
    assert.ifError(error);
    assert.equal(data.user.email,email);
    assert.equal(data.user.user_metadata.first_name,names.first_name);
    assert.equal(data.user.user_metadata.last_name,names.last_name);
    assert.equal(data.user.user_metadata.role,undefined);
    const {data:profile,error:profileError} = await auth.from('profiles').select('id,first_name,last_name,role').eq('id',data.user.id).single();
    assert.ifError(profileError);
    assert.deepEqual(profile,{id:data.user.id,...names,role:'customer'});
    const page = await fetch(`${origin}/compte`,{headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}});
    assert.equal(page.status,200);
    const account = load(await page.text());
    const fullName = `${names.first_name} ${names.last_name}`;
    assert.equal(account('header h1').text().replace(/\s+/g,' ').trim(),`Bonjour ${fullName}`);
    const details = account('section[aria-labelledby=account-information] dd');
    assert.equal(details.eq(0).text(),fullName);
    assert.equal(details.eq(1).text(),email);
    if (identities.length) {
      const other = await auth.from('profiles').select('id').eq('id',identities[0].id);
      assert.ifError(other.error);
      assert.deepEqual(other.data,[], 'A customer must not read another customer’s profile');
    }
    identities.push({id:data.user.id,name:fullName});
    await auth.auth.signOut({scope:'local'});

  }
  assert.notEqual(identities[0].id,identities[1].id);
  assert.notEqual(identities[0].name,identities[1].name);
});
