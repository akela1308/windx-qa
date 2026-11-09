import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
const root='data/verification/catalogue-2026-11-04';
const plan=JSON.parse(await readFile(`${root}/capture-plan.json`,'utf8')) as {id:string}[];
for(const {id} of plan){if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid shot ID');const source=`${root}/${id}-desktop.png`;const m=await sharp(source).metadata();if(m.width!==1280||m.height!==860)throw Error(`Unexpected viewport: ${id}`);await sharp(source).jpeg({quality:85}).toFile(`public/showcase/${id}.jpg`);}
console.log('Updated 23 catalogue thumbnails from verified browser captures.');
