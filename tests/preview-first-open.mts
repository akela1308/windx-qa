import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Preview} from '../src/components/editor/Preview';
import {PreviewFrame} from '../src/components/editor/PreviewFrame';
import {en} from '../src/lib/i18n/en';
import type {EditorData} from '../src/components/editor/Editor';
for(const guest of [false,true])for(const device of ['desktop','phone'] as const){
 const html=renderToStaticMarkup(createElement(Preview,{data:{siteId:'first-open',currentVersion:7,name:'Preview regression',guest,locale:'en'} as EditorData,device,t:{...en.editor,tools:en.tools,publishing:en.publishing,trial:en.trial,enquiries:en.enquiries},selecting:false,setSelecting:()=>{},picked:null,onPick:()=>{},onEdit:()=>{}}));
 assert.ok(!/<iframe\b/.test(html),'streaming SSR must not create a browsing context that Suspense will move');
 assert.match(html,/role="status"/);assert.ok(html.includes(en.editor.working));
 assert.ok(html.includes('href="/preview/first-open/7"'),'direct preview remains available');
}
const clientFrame=renderToStaticMarkup(createElement(PreviewFrame,{
 frameRef:{current:null},onError:()=>{},src:'/preview/first-open/7?edit=1',title:'Preview regression',
}));
assert.ok(!/<iframe\b/.test(clientFrame),'frame waits for an authorized HTML response');
console.log('PASS streaming SSR does not navigate the preview before its client commit; loading state and direct preview remain available for guests/members and desktop/phone.');
