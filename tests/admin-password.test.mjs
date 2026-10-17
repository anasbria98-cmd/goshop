import test from 'node:test';
import assert from 'node:assert/strict';
import {adminPasswordInput,MIN_ADMIN_PASSWORD_LENGTH,passwordUpdateError} from '../lib/admin-password.ts';
const input={currentPassword:'Existing-password-123!',newPassword:'Different-password-456!',confirmation:'Different-password-456!'};
test('Admin password input enforces length, confirmation, non-empty current password and a different new password',()=>{
 assert.equal(MIN_ADMIN_PASSWORD_LENGTH,12);
 assert.ok(adminPasswordInput.safeParse(input).success);
 assert.ok(!adminPasswordInput.safeParse({...input,currentPassword:''}).success);
 assert.ok(!adminPasswordInput.safeParse({...input,newPassword:'short',confirmation:'short'}).success);
 assert.ok(!adminPasswordInput.safeParse({...input,confirmation:'Mismatch-789!'}).success);
 assert.ok(!adminPasswordInput.safeParse({...input,newPassword:input.currentPassword,confirmation:input.currentPassword}).success);
 assert.ok(!adminPasswordInput.safeParse({...input,newPassword:'a'.repeat(129),confirmation:'a'.repeat(129)}).success);
});
test('Validation never trims password characters or accepts submitted identity/role overrides',()=>{
 const parsed=adminPasswordInput.parse({...input,newPassword:'  my password 123!  ',confirmation:'  my password 123!  ',email:'another@example.com',userId:'other',role:'super_admin'});
 assert.equal(parsed.newPassword,'  my password 123!  ');
 assert.deepEqual(Object.keys(parsed).sort(),['confirmation','currentPassword','newPassword']);
});
test('Auth failures map to safe messages without echoing provider payloads or passwords',()=>{
 assert.match(passwordUpdateError('weak_password'),/politique de sécurité/);
 assert.match(passwordUpdateError('same_password'),/différent/);
 assert.match(passwordUpdateError('reauthentication_needed'),/Reconnectez-vous/);
 assert.match(passwordUpdateError('over_request_rate_limit'),/Trop de tentatives/);
 assert.match(passwordUpdateError('provider payload must not be echoed'),/Impossible de mettre à jour/);
});
