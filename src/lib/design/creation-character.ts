import {contrast,type Tokens} from "../../../experiments/exp1/a/tokens";
import {fontCharacter,supportsDisplayWeight} from "../../../experiments/exp1/a/font-character";

// Только новая AI-генерация: старые документы, ручные правки и импорт
// не становятся невалидными из-за уточнения требований к первому результату.
export function creationCharacterErrors(tokens:Tokens):string[]{
  const errors:string[]=[],font=fontCharacter(tokens.displayFont);
  if(!supportsDisplayWeight(tokens.displayFont,tokens.displayWeight))errors.push(`tokens.displayWeight: ${tokens.displayFont} currently loads ${font.weights.join(" or ")}; choose a loaded weight or a different font.`);
  if(tokens.displayItalic&&!font.italicLoaded)errors.push(`tokens.displayItalic: italic is not loaded for ${tokens.displayFont}; use false or a font with loaded italic.`);
  const c=tokens.colors;
  for(const [name,bg] of [["bg",c.bg],["surface",c.surface]])
    if(contrast(c.muted,bg)<4.5)errors.push(`tokens.colors muted/${name}: normal secondary copy needs at least 4.5:1 contrast. Choose a readable muted colour.`);
  return errors;
}
