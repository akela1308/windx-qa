import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("docs/research/design-references-2026");
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  let remoteRequests=0;
  await page.route(/^https?:/,route=>{remoteRequests++;return route.abort();});
  await page.goto(pathToFileURL(path.join(root,"index.html")).href);
  await page.evaluate(async()=>{for(const img of document.images)img.loading="eager";await Promise.all([...document.images].map(img=>img.decode()));});
  assert.equal(await page.locator("article").count(),100);
  const decoded=await page.evaluate(()=>[...document.images].filter(img=>img.complete&&img.naturalWidth>0).length);
  assert.equal(decoded,100);
  await mkdir(path.join(root,"verification"),{recursive:true});
  await page.screenshot({path:path.join(root,"verification/gallery-desktop.png")});
  await page.locator("#q").fill("diagram");
  assert.ok(await page.locator("article:visible").count()>0);
  await page.locator("#q").fill("");
  await page.locator("#category").selectOption({label:"photography"});
  const filtered=await page.locator("article:visible").count();
  assert.ok(filtered>0&&filtered<100);
  await page.locator("#category").selectOption("");
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,"verification/gallery-mobile.png")});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false);
  assert.equal(remoteRequests,0);
  assert.deepEqual(errors,[]);
  const result={cards:100,decodedImages:decoded,categoryFilter:filtered,mobileWidth:390,mobileOverflow:overflow,remoteRequests,pageErrors:errors};
  await writeFile(path.join(root,"verification/gallery.json"),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result));
} finally {await browser.close();}
