import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
// Успешная JS-сборка недостаточна: без Tailwind редактор открывается без оформления.
const files=(await readdir('.next/static',{recursive:true})).filter(file=>file.endsWith('.css'));
assert.ok(files.length,'Build first: no emitted CSS');
const css=(await Promise.all(files.map(file=>readFile(path.join('.next/static',file),'utf8')))).join('\n');
assert.match(css,/\.flex\s*\{[^}]*display\s*:\s*flex/,'Built CSS is missing the flex utility used by the editor');
assert.match(css,/\.min-h-11\s*\{/,'Built CSS is missing the control sizing utility');
assert.ok(css.includes('.lg\\:'),'Built CSS is missing responsive utilities');
assert.ok(css.includes('--brand:'),'Built CSS is missing the WINDX theme');
console.log('PASS: emitted CSS includes editor layout, control sizing, responsive utilities and WINDX theme.');
