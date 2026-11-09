import assert from 'node:assert/strict';
import { appendDictation,startDictation,type Recognition } from '../src/lib/voice/session.ts';
class Fake implements Recognition {
 static instance:Fake;lang='';continuous=false;interimResults=false;maxAlternatives=0;stops=0;aborts=0;
 onstart:Recognition['onstart']=null;onend:Recognition['onend']=null;onerror:Recognition['onerror']=null;onresult:Recognition['onresult']=null;
 constructor(){Fake.instance=this;} start(){} stop(){this.stops++;} abort(){this.aborts++;}
}
const phases:string[]=[],errors:string[]=[],texts:[string,string][]=[];
const callbacks={phase:(p:string)=>phases.push(p),error:(e:string)=>errors.push(e),text:(a:string,b:string)=>texts.push([a,b])};
const result=(final:boolean,text:string)=>({isFinal:final,0:{transcript:text}});
const session=startDictation(Fake,'ru-RU',callbacks),engine=Fake.instance;
assert.equal(engine.lang,'ru-RU');assert.equal(engine.continuous,true);assert.equal(engine.interimResults,true);assert.deepEqual(phases,['starting']);
engine.onstart!();engine.onresult!({results:[result(true,'Моя мастерская'),result(false,'в Лондоне')]});
assert.deepEqual(texts.at(-1),['Моя мастерская','в Лондоне']);
engine.onresult!({results:[result(true,'Моя мастерская'),result(true,'в Лондоне')]});
engine.onresult!({results:[result(true,'Моя мастерская'),result(true,'в Лондоне')]});
assert.equal(texts.at(-1)![0],'Моя мастерская в Лондоне');
session.stop();session.stop();assert.equal(engine.stops,1);assert.equal(phases.at(-1),'stopping');
engine.onresult!({results:[result(true,'Моя мастерская'),result(true,'в Лондоне.' )]});
const late=engine.onresult!;engine.onend!();assert.equal(phases.at(-1),'idle');assert.deepEqual(texts.at(-1),['Моя мастерская в Лондоне.','']);
const length=texts.length;late({results:[result(true,'late')]});assert.equal(texts.length,length);session.cancel();assert.equal(engine.aborts,0);
assert.equal(appendDictation('Already typed.','English speech'),'Already typed. English speech');assert.equal(appendDictation('Base\n','Русский'),'Base\nРусский');assert.equal(appendDictation('Base',''),'Base');
const pending=startDictation(Fake,'en-GB',callbacks);pending.stop();assert.equal(Fake.instance.aborts,1);assert.equal(phases.at(-1),'idle');
startDictation(Fake,'es-ES',callbacks);Fake.instance.onstart!();Fake.instance.onerror!({error:'not-allowed'});assert.equal(errors.at(-1),'not-allowed');assert.equal(phases.at(-1),'idle');assert.equal(Fake.instance.onresult,null);
const hidden=startDictation(Fake,'en-GB',callbacks);Fake.instance.onstart!();hidden.cancel();assert.equal(Fake.instance.aborts,1);assert.equal(phases.at(-1),'idle');
class Throwing extends Fake {start(){throw Error('not supported');}}
startDictation(Throwing,'en-GB',callbacks);assert.equal(errors.at(-1),'unavailable');assert.equal(phases.at(-1),'idle');
console.log('PASS: language, final/interim separation, no duplicate phrases, late final on stop, cancelled start, permission failure, cleanup, start failure and preserving typed text');
