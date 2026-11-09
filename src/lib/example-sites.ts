// Authored public demonstrations only. Never read private sites for the catalogue.
import { SHOWCASE } from './showcase';
export const EXAMPLE_SITES = Object.fromEntries(SHOWCASE.map(id=>[id,`catalog/${id}.json`])) as Record<(typeof SHOWCASE)[number],string>;
