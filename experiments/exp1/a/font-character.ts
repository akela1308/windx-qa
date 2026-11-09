import { FONTS, FONT_KEYS, type FontKey } from "./fonts";

export type FontKind = "sans" | "serif" | "mono" | "hand";
// Источник начертаний: фактический запрос Google Fonts в нашем каталоге,
// а не все начертания, которые теоретически может иметь семейство.
export function fontCharacter(key: FontKey) {
  const font=FONTS[key];
  const kind:FontKind=font.css.includes("sans-serif")?"sans":font.css.includes("monospace")?"mono":font.css.includes("cursive")?"hand":"serif";
  const [axes="",values=""]=(font.google.split(":")[1]??"").split("@");
  const names=axes.split(","),weightAxis=names.indexOf("wght"),italicAxis=names.indexOf("ital");
  const rows=values.split(";").map(row=>row.split(","));
  const weights=weightAxis<0?["400"]:[...new Set(rows.map(row=>row[weightAxis]))];
  const italicLoaded=italicAxis>=0&&rows.some(row=>row[italicAxis]==="1");
  return {kind,weights,italicLoaded};
}
export function supportsDisplayWeight(key:FontKey,weight:number){
  return fontCharacter(key).weights.some(range=>{const [min,max=min]=range.split("..").map(Number);return weight>=min&&weight<=max;});
}
export function fontKeyForFamily(family:string):FontKey|undefined {
  const normal=(value:string)=>value.split(",")[0].replace(/["']/g,"").trim().toLowerCase();
  return FONT_KEYS.find(key=>normal(FONTS[key].css)===normal(family));
}
export function fontCharacterCatalogue(){
  const groups:FontKind[]=["sans","serif","mono","hand"];
  return "## Available font characters and currently loaded styles\n\n"+groups.map(kind=>`- ${kind}: ${FONT_KEYS.filter(k=>fontCharacter(k).kind===kind).map(k=>{const f=fontCharacter(k);return `${k} (weights ${f.weights.join(" or ")}${f.italicLoaded?", italic loaded":""})`;}).join("; ")}`).join("\n");
}
