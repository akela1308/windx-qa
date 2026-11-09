import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { SiteDocSchema } from '../experiments/exp1/a/schema';
import { renderDoc } from '../src/lib/design/render';

// Document overflow alone missed the old hidden, nowrap footer. Measure the
// actual text ranges, including the last character, inside the footer box.
const base = JSON.parse(await readFile('docs/generator-comparison-2026-11-06/outputs/speaker-opus.json', 'utf8'));
const names = ['Alex Morgan Demo', 'International Conference Speakers Association', 'WWWMMMMMMMMMMWWWWWWWWWW', 'Студия Александра Иванова'];
const browser = await chromium.launch({headless:true});
const results: unknown[] = [];
const output = 'data/verification/production-generator-2026-11-06';
await mkdir(output, {recursive:true});
try {
  const page = await browser.newPage();
  for (const font of ['archivo', 'unbounded']) {
    const doc = SiteDocSchema.parse({...base, visualPlan:undefined, tokens:{...base.tokens, displayFont:font, displayWeight:800, displayCase:'uppercase', width:'narrow'}, sections:names.map((name,i)=>({id:`footer-${i}`, composition:'footer.big-name', tone:'default', props:{name,lines:[]}}))});
    for (const width of [320,390,1440,1952]) {
      await page.setViewportSize({width,height:900});
      await page.setContent(renderDoc(doc));
      await page.evaluate(async()=>{await document.fonts.ready;});
      const rows = await page.locator('.fb .nm').evaluateAll(elements=>elements.map(n=>{
        const box=n.getBoundingClientRect(), footer=n.closest('footer')!.getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(n);
        const textRects=[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
        const last=n.lastChild!; range.setStart(last,Math.max(0,(last.textContent?.length??1)-1));range.setEnd(last,last.textContent?.length??0);
        const end=range.getBoundingClientRect();
        return {name:n.textContent,box:{left:box.left,right:box.right,bottom:box.bottom},footerBottom:footer.bottom,textRects,lastRight:end.right,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
      }));
      for(const row of rows){
        assert.ok(row.scrollWidth<=width+1, `${font}/${width}: page overflow`);
        assert.ok(row.textRects.every(r=>r.left>=row.box.left-1&&r.right<=row.box.right+1), `${font}/${width}: clipped text ${JSON.stringify(row)}`);
        assert.ok(row.lastRight<=row.box.right+1, `${font}/${width}: final character ${row.name}`);
      }
      results.push({font,width,rows});
      if(font==='archivo'&&[390,1952].includes(width))await page.screenshot({path:`${output}/footer-local-${width}.jpg`,type:'jpeg',quality:85,fullPage:true});
    }
  }
  await writeFile(`${output}/footer-checks.json`,JSON.stringify(results,null,2)+'\n');
  console.log('PASS: all footer text and final characters fit the available width in 32 font/name/width combinations, including long words and Cyrillic.');
}finally{await browser.close();}
