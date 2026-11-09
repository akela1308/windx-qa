import { templateIndex, TEMPLATE_STYLES } from '@/lib/templates';
import {getDict} from '@/lib/i18n';
import {readCatalogueDocument} from '@/lib/catalog';
import {publicExampleResponse} from '@/lib/public-example';
export async function GET(_req:Request,context:RouteContext<'/templates/[template]'>){
 const {template}=await context.params,i=templateIndex(template);
 if(i===undefined)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
 const {locale,t}=await getDict();
 return publicExampleResponse(await readCatalogueDocument(`template-${i}.json`),t.home.trades[i],`/?t=${i}&style=${TEMPLATE_STYLES[i]}#create`,'/templates',locale,new URL(_req.url).searchParams.get('canvas')==='1');
}
