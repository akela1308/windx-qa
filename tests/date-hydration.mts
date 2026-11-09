import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {useDateFormatter} from '../src/lib/i18n/use-date-formatter';
const previous=process.env.TZ;
function Timestamp({locale}:{locale:string}){const date=useDateFormatter(locale,{dateStyle:'medium',timeStyle:'short'});return createElement('time',null,date.format(new Date('2026-11-01T23:45:00Z')));}
try {
 for(const locale of ['en','ru','es']){
  process.env.TZ='UTC';const server=renderToStaticMarkup(createElement(Timestamp,{locale}));
  for(const timezone of ['Europe/Zagreb','America/Los_Angeles','Asia/Tokyo']){process.env.TZ=timezone;assert.equal(renderToStaticMarkup(createElement(Timestamp,{locale})),server);}
 }
 console.log('PASS initial timestamp render is stable across server/client timezones and EN/RU/ES; local timezone is enabled only after hydration.');
} finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
