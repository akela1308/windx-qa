import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {loadPreviewHtml,PREVIEW_ANCHORS} from '../src/lib/sites/preview-html';
const original=globalThis.fetch;
try {
 const controller=new AbortController();
 let request:unknown;
 globalThis.fetch=async (input,options)=>{
  request={input,options};
  return new Response('<!doctype html><h1>Saved version</h1>',{headers:{'content-type':'text/html; charset=utf-8'}});
 };
 assert.match(await loadPreviewHtml('/preview/owned/4?edit=1',controller.signal),/Saved version/);
 assert.deepEqual(request,{input:'/preview/owned/4?edit=1',options:{signal:controller.signal,credentials:'same-origin',cache:'no-store'}});
 for(const response of [
  new Response('Not found',{status:404}),
  new Response('Unauthorized',{status:401}),
  new Response('Server error',{status:500}),
  new Response('{}',{headers:{'content-type':'application/json'}}),
  new Response('',{headers:{'content-type':'text/html'}}),
 ]){
  globalThis.fetch=async()=>response;
  await assert.rejects(loadPreviewHtml('/preview/owned/4',controller.signal));
 }
 const redirected=new Response('<h1>Sign in</h1>',{headers:{'content-type':'text/html'}});
 Object.defineProperty(redirected,'redirected',{value:true});
 globalThis.fetch=async()=>redirected;
 await assert.rejects(loadPreviewHtml('/preview/owned/4',controller.signal));
 globalThis.fetch=async()=>{throw new DOMException('Aborted','AbortError');};
 await assert.rejects(loadPreviewHtml('/preview/owned/4',controller.signal),{name:'AbortError'});
 console.log('PASS preview fetch uses owner/guest credentials without cache, preserves abort and refuses missing, unauthorized, failed, empty, non-HTML and redirected responses.');
}finally{globalThis.fetch=original;}

let click:(e:unknown)=>void=()=>{};
const scrolled:string[]=[];let top=false;
runInNewContext(PREVIEW_ANCHORS,{
 document:{addEventListener:(_:string,handler:typeof click)=>{click=handler;},getElementById:(id:string)=>({scrollIntoView:()=>scrolled.push(id)})},
 scrollTo:()=>{top=true;},
});
function event(hash:string|null,extra:Record<string,unknown>={}){
 const e={defaultPrevented:false,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,
 target:{closest:()=>hash===null?null:{getAttribute:()=>hash}},
 preventDefault(){this.defaultPrevented=true;},...extra};click(e);return e;
}
assert.equal(event('#contact').defaultPrevented,true);assert.deepEqual(scrolled,['contact']);
event('#book%20service');assert.equal(scrolled.at(-1),'book service');
event('#');assert.equal(top,true);
assert.equal(event(null).defaultPrevented,false);
assert.equal(event('#contact',{ctrlKey:true}).defaultPrevented,false);
const before=scrolled.length;event('#contact',{defaultPrevented:true});assert.equal(scrolled.length,before);
assert.doesNotThrow(()=>event('#%'));
console.log('PASS preview anchors scroll locally, decode IDs, return to top, preserve modified clicks and respect block selection.');
