import { createHeroSheet } from './hero-sheet.js';
const art = Object.fromEntries(['necromancer','amazon','paladin'].map(id=>[id,createHeroSheet(id)]));
export function remainingHeroSprite(id,...args) { return art[id]?.sprite(...args); }
export function remainingHeroArtStatus() { return Object.fromEntries(Object.entries(art).map(([id,a])=>[id,a.status()])); }
