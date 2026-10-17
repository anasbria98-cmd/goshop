import test from 'node:test';
import assert from 'node:assert/strict';
import {CART_STORAGE_KEY,persistCartSnapshot,mayRestoreRemoteCart,createCartWriteQueue} from '../lib/cart-persistence.ts';
const filled={'p:white':{product:{id:'p',selectedVariant:{id:'white',sku:'P-W',price:40,stock:8}},quantity:2},'p:black':{product:{id:'p',selectedVariant:{id:'black',sku:'P-B',price:50,stock:5}},quantity:3}};
function storage(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};}
test('Explicit empty is saved synchronously with its durable marker and preserves favorites',()=>{
 const disk=storage();disk.setItem(CART_STORAGE_KEY,JSON.stringify({version:2,cart:filled,favorites:['favorite']}));
 persistCartSnapshot(disk,{}, {cartCleared:true,cartDirty:true});
 const cleared=JSON.parse(disk.getItem(CART_STORAGE_KEY));assert.deepEqual(cleared.cart,{});assert.deepEqual(cleared.favorites,['favorite']);assert.equal(cleared.cartCleared,true);
 assert.equal(mayRestoreRemoteCart(cleared,0,0),false);
 persistCartSnapshot(disk,{}, {cartCleared:true,cartDirty:false});
 assert.equal(mayRestoreRemoteCart(JSON.parse(disk.getItem(CART_STORAGE_KEY)),0,0),false,'Even a late old server write cannot restore a successfully cleared cart');
});
test('Nonempty persistence preserves variants/quantities and only confirmed data can hydrate normally',()=>{
 const disk=storage();persistCartSnapshot(disk,filled,{cartCleared:false,cartDirty:true},['favorite']);
 const restored=JSON.parse(disk.getItem(CART_STORAGE_KEY));assert.deepEqual(restored.cart,filled);assert.equal(mayRestoreRemoteCart(restored,0,0),false);
 persistCartSnapshot(disk,filled,{cartCleared:false,cartDirty:false},['favorite']);assert.equal(mayRestoreRemoteCart(JSON.parse(disk.getItem(CART_STORAGE_KEY)),0,0),true);
 assert.equal(mayRestoreRemoteCart({cartCleared:false,cartDirty:false},0,1),false,'A GET started before a mutation is stale');
});
test('A clear waits behind an older in-flight write and only the latest snapshot is acknowledged',async()=>{
 let resolveOld;const calls=[],acks=[];let revision=0;
 const write=createCartWriteQueue(async cart=>{calls.push(cart);if(cart===filled)await new Promise(resolve=>{resolveOld=resolve;});return true;});
 const old=write(filled,()=>revision===0,()=>acks.push('old'));
 await new Promise(resolve=>setImmediate(resolve));revision=1;
 const empty=write({},()=>revision===1,()=>acks.push('empty'));
 assert.equal(calls.length,1);resolveOld();await Promise.all([old,empty]);assert.deepEqual(calls,[filled,{}]);assert.deepEqual(acks,['empty']);
});
test('Superseded queued writes are skipped and failed clears remain retryable',async()=>{
 let revision=0;const calls=[];let succeeds=false;let acknowledged=false;
 const write=createCartWriteQueue(async cart=>{calls.push(cart);return succeeds;});
 const old=write(filled,()=>revision===0,()=>{throw Error('stale ack');});revision=1;
 await old;assert.equal(calls.length,0);
 await write({},()=>revision===1,()=>{acknowledged=true;});assert.equal(acknowledged,false);
 succeeds=true;await write({},()=>revision===1,()=>{acknowledged=true;});assert.equal(acknowledged,true);
});
test('Unloading a provider prevents a late response from rewriting newer local storage',async()=>{
 let finish,active=true,acknowledged=false;
 const write=createCartWriteQueue(async()=>{await new Promise(resolve=>{finish=resolve;});return true;});
 const pending=write(filled,()=>active,()=>{acknowledged=true;});await new Promise(resolve=>setImmediate(resolve));active=false;finish();await pending;assert.equal(acknowledged,false);
});
