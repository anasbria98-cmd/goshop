import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostAuthPath } from '../lib/auth-routing.ts';

test('Administrator sign-in goes directly to dashboard rather than account redirect', () => {
  for (const role of ['staff', 'admin', 'super_admin']) {
    assert.equal(resolvePostAuthPath(role), '/admin');
    assert.equal(resolvePostAuthPath(role, '/compte'), '/admin');
    assert.equal(resolvePostAuthPath(role, '/admin/products/new'), '/admin/products/new');
  }
});
test('Customer and unknown roles cannot use an admin post-login destination', () => {
  for (const role of ['customer', null, undefined]) {
    assert.equal(resolvePostAuthPath(role, '/admin/products'), '/compte');
    assert.equal(resolvePostAuthPath(role), '/compte');
  }
});
test('Post-login destinations reject external and protocol-relative URLs', () => {
  assert.equal(resolvePostAuthPath('admin', 'https://example.com'), '/admin');
  assert.equal(resolvePostAuthPath('customer', '//example.com'), '/compte');
});
