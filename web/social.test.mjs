import test from 'node:test';import assert from 'node:assert/strict';
import {markThreadRead,parseSocial,threadId,unreadCount,upsertMessage} from './src/social.mjs';
const a={id:'a',name:'Anna'},b={id:'b',name:'Ben'};
test('thread id ist für beide Richtungen identisch',()=>assert.equal(threadId('c',a.id,b.id),threadId('c',b.id,a.id)));
test('Nachrichten werden gespeichert und für Empfänger als ungelesen gezählt',()=>{const s=upsertMessage(parseSocial(), 'c',a,b,' Hallo ');assert.equal(s.threads[0].messages[0].text,'Hallo');assert.equal(unreadCount(s,b.id),1);assert.equal(unreadCount(s,a.id),0)});
test('Öffnen markiert einen Thread als gelesen',()=>{const s=upsertMessage(parseSocial(),'c',a,b,'Test'),r=markThreadRead(s,threadId('c','a','b'),'b');assert.equal(unreadCount(r,'b'),0)});
test('beschädigte gespeicherte Chatdaten werden sicher normalisiert',()=>{const s=parseSocial(JSON.stringify({threads:[{id:'c:a:b',memberIds:['a','b'],messages:null},null,{id:7}]}));assert.equal(s.threads.length,1);assert.deepEqual(s.threads[0].messages,[]);assert.equal(unreadCount(s,'a'),0)});
