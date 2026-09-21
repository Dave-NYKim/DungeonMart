// Compact filled silhouettes for promotion nodes; independent of first-skill effects.
const forms={
 axe:'M15 6h5v27h-5z M7 6l9 3v12l-9 4-4-8z M20 9l9-3 4 11-4 8-9-4z',
 skull:'M8 8l10-4 10 4 3 9-5 8v7H10v-7l-5-8z M10 14v6h5v-6z M21 14v6h5v-6z M16 23l2-4 2 4z',
 bow:'M9 4l13 7 5 7-5 7-13 7 5-14z M5 17h25v3H5z M27 12l7 6-7 6z',
 staff:'M16 16h4v17h-4z M18 3l9 8-9 10-9-10z',
 shield:'M18 3l13 5-2 15-11 11L7 23 5 8z M16 9v7h-6v4h6v8h4v-8h6v-4h-6V9z',
 flame:'M19 3l2 10 6-5 4 13-4 10H9L4 22l9-14v12z',
 frost:'M16 3h4v9l7-6 3 3-7 7h10v4H23l7 7-3 3-7-7v10h-4V23l-7 7-3-3 7-7H3v-4h10L6 9l3-3 7 6z',
 bolt:'M19 2L5 21h11l-3 13 19-22H21l4-10z',
 sword:'M25 3l7 1-1 7-15 15-6-6z M8 17l13 13-4 3L4 20z M4 28l5-5 5 5-5 5z',
 poison:'M12 3h12v5h-3v7l10 13-3 5H8l-3-5 10-13V8h-3z',
 eye:'M2 18L10 9l8-3 8 3 8 9-8 9-8 3-8-3z M18 10a8 8 0 1 0 0 16 8 8 0 1 0 0-16z',
 hammer:'M15 15h6v18h-6z M5 5h26v13H5z'
};
const map={blood:'sword',warlord:'axe',elemental:'flame',arcane:'staff',dimension:'eye',crusader:'sword',judge:'hammer',sun:'flame',guardian:'shield',sanctuary:'shield',priest:'staff',barbarian:'axe',berserker:'axe',destroyer:'hammer',crusher:'hammer',iron:'shield',necromancer:'skull',summoner:'skull',undead:'skull',golem:'shield',curser:'eye',plague:'poison',reaper:'sword',amazon:'bow',archer:'bow',hawk:'eye',arrows:'bow',javelin:'bolt',tempest:'bolt',valkyrie:'shield',sorceress:'staff',paladin:'shield'};
export function classIcon(node,base){const key=map[node.id]||(/fire|flame|meteor/.test(node.id)?'flame':/ice|frost|winter/.test(node.id)?'frost':/storm|lightning/.test(node.id)?'bolt':base==='barbarian'?'axe':base==='paladin'?'shield':'staff');const color={axe:'#e7ac78',skull:'#c5d1a1',bow:'#bdd184',staff:'#bf9be4',shield:'#e3c984',flame:'#ffad64',frost:'#a0deed',bolt:'#c7b8fa',sword:'#df9a9c',poison:'#b2cb6b',eye:'#c4a0d7',hammer:'#b5c5d3'}[key];return `<svg class="class-art" viewBox="0 0 36 36" aria-hidden="true"><path d="${forms[key]}" fill="${color}" fill-rule="evenodd" stroke="#111b18" stroke-width="1.2" stroke-linejoin="round"/></svg>`;}
