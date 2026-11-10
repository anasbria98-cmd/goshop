import test from 'node:test';import assert from 'node:assert/strict';
import {createQuoteAccess} from '../lib/quote-access.ts';
test('quote links stay hidden until a verified user is available; guests and Auth failures fail closed',async()=>{
 for(const verified of [true,false]){const states=[];let resolve;const gate=createQuoteAccess(()=>new Promise(r=>resolve=r),allowed=>states.push(allowed));
  const pending=gate.check();assert.deepEqual(states,[false]);resolve(verified);await pending;assert.deepEqual(states,[false,verified]);gate.dispose();}
 const states=[];await createQuoteAccess(async()=>{throw Error('Auth unavailable')},v=>states.push(v)).check();assert.deepEqual(states,[false,false]);
});
test('logout and newer Auth checks cannot be overwritten by an older authenticated response',async()=>{
 const states=[],pending=[];const gate=createQuoteAccess(()=>new Promise(r=>pending.push(r)),v=>states.push(v));
 const first=gate.check();gate.hide();pending.shift()(true);await first;assert.equal(states.at(-1),false);
 const older=gate.check(),newer=gate.check();pending.pop()(false);await newer;pending.shift()(true);await older;assert.equal(states.at(-1),false);
 const unmounted=gate.check();gate.dispose();const count=states.length;pending.shift()(true);await unmounted;assert.equal(states.length,count);
});
