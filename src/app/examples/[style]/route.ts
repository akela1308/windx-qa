import { EXAMPLE_SITES } from '@/lib/example-sites';
import { isStyle } from '@/lib/showcase';
import { getDict } from '@/lib/i18n';
import { readCatalogueDocument } from '@/lib/catalog';
import { publicExampleResponse } from '@/lib/public-example';
export async function GET(_req:Request,context:RouteContext<'/examples/[style]'>){
 const {style}=await context.params;
 if(!isStyle(style))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
 const {locale,t}=await getDict();
 const doc=await readCatalogueDocument(EXAMPLE_SITES[style].replace('catalog/',''));
 return publicExampleResponse(doc,(t.styleNames as Record<string,string[]>)[style][0],`/?style=${style}#create`,'/templates#looks',locale,new URL(_req.url).searchParams.get('canvas')==='1');
}
