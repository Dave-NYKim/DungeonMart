// Dawn Harbor, drawn at 1 pixel per world unit (no Scale2x) so it can carry the detail of the
// generated campaign buildings: outlined masses, three-tone shading lit from the upper left,
// warm window glow. Every sprite is marked `native` so the scene cache does not upscale it.
import { canvasOf, rect, oval, poly, stroke, INK } from './pixel-art.js';

const WOOD = { ink: '#2a1d14', dark: '#4e3523', mid: '#76512f', base: '#936539', light: '#b58450', hi: '#d6a766' };
// Salt-weathered planks: warm wood pulled toward grey so the deck sits under the buildings.
const DECK = { dark: '#4a3a2c', light: '#a28a6c', grain: '#6c5642', sheen: '#b39a78' };
const PLANKS = ['#86694a', '#8f7050', '#7d6146', '#957556', '#8a6a4c', '#7a6349'];
const STONE = { ink: '#2b2c2c', dark: '#5a5750', base: '#7d786c', light: '#a19b8a', hi: '#c4bda8' };
const SLATE = { dark: '#1d3437', base: '#2d5553', light: '#3f716b', hi: '#6a9d8c' };
const GLOW = { deep: '#c9832e', base: '#f1b650', hi: '#ffe7a3' };

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function native(w, h) { const canvas = canvasOf(w, h); canvas.native = true; return canvas; }
const shadow = (c, x, y, rx, ry) => oval(c, x, y, rx, ry, '#10181a55');

// ---------- Ground layer: painted straight into the terrain background ----------
export const QUAY = { left: 232, right: 704, top: 1086, bottom: 1168 };
export const JETTY = { left: 244, right: 278, top: 1168, bottom: 1318 };

function boards(c, x0, y0, x1, y1, vertical, rnd) {
  const size = 7, span = vertical ? x1 - x0 : y1 - y0;
  for (let i = 0; i * size < span; i++) {
    const a = (vertical ? x0 : y0) + i * size, color = PLANKS[Math.floor(rnd() * PLANKS.length)], len = vertical ? y1 - y0 : x1 - x0;
    const bx = vertical ? a : x0, by = vertical ? y0 : a, bw = vertical ? Math.min(size, x1 - a) : len, bh = vertical ? len : Math.min(size, y1 - a);
    rect(c, bx, by, bw, bh, color);
    // Seam, sun-lit edge, staggered butt joints with nail heads and grain.
    if (vertical) { rect(c, bx, by, 1, bh, DECK.dark); rect(c, bx + 1, by, 1, bh, DECK.light); }
    else { rect(c, bx, by, bw, 1, DECK.dark); rect(c, bx, by + 1, bw, 1, DECK.light); }
    const joints = 1 + Math.floor(rnd() * 2);
    for (let j = 0; j < joints; j++) {
      const t = Math.floor(rnd() * (len - 10)) + 5;
      if (vertical) { rect(c, bx + 1, by + t, size - 1, 1, WOOD.ink); rect(c, bx + 2, by + t - 2, 1, 1, '#2f2a26'); rect(c, bx + size - 2, by + t + 2, 1, 1, '#2f2a26'); }
      else { rect(c, bx + t, by + 1, 1, size - 1, WOOD.ink); rect(c, bx + t - 2, by + 2, 1, 1, '#2f2a26'); rect(c, bx + t + 2, by + size - 2, 1, 1, '#2f2a26'); }
    }
    for (let g = 0; g < len / 9; g++) {
      const t = rnd() * len, o = 2 + rnd() * (size - 3);
      if (vertical) rect(c, bx + o, by + t, 1, 2 + rnd() * 4, rnd() < .6 ? DECK.grain : DECK.sheen);
      else rect(c, bx + t, by + o, 2 + rnd() * 4, 1, rnd() < .6 ? DECK.grain : DECK.sheen);
    }
  }
}
function piling(c, x, y, h, wet) {
  rect(c, x - 1, y, 8, h + 1, WOOD.ink); rect(c, x, y, 6, h, WOOD.dark); rect(c, x, y, 2, h, WOOD.mid);
  rect(c, x - 1, y + 3, 8, 2, '#3b3f3c'); rect(c, x, y + 3, 6, 1, '#6b716a');
  if (wet) { oval(c, x + 3, y + h, 7, 2, '#9ec8bd'); rect(c, x - 4, y + h, 3, 1, '#d5ece2'); rect(c, x + 8, y + h + 1, 3, 1, '#d5ece2'); }
}
export function paintHarborGround(c) {
  const rnd = rng(4417), q = QUAY, j = JETTY;
  // Ground shadow under the deck edge, then the deck body.
  rect(c, q.left + 4, q.bottom + 8, q.right - q.left, 6, '#1b2a2455');
  boards(c, q.left, q.top, q.right, q.bottom, true, rnd);
  // Heavy stringer beams frame the deck; the south face shows the timber thickness.
  rect(c, q.left, q.top - 3, q.right - q.left, 4, WOOD.dark); rect(c, q.left, q.top - 3, q.right - q.left, 1, WOOD.hi);
  rect(c, q.left, q.bottom, q.right - q.left, 8, WOOD.dark); rect(c, q.left, q.bottom, q.right - q.left, 1, WOOD.hi); rect(c, q.left, q.bottom + 7, q.right - q.left, 1, WOOD.ink);
  rect(c, q.right - 3, q.top - 3, 4, q.bottom - q.top + 11, WOOD.dark); rect(c, q.left - 1, q.top - 3, 4, q.bottom - q.top + 11, WOOD.dark);
  for (let x = q.left + 18; x < q.right - 8; x += 44) { rect(c, x, q.bottom + 1, 6, 6, WOOD.mid); rect(c, x + 2, q.bottom + 3, 2, 2, '#3a3f3d'); }
  // Pilings carry the west end of the quay out over the water.
  for (let y = q.top + 6; y < q.bottom; y += 26) piling(c, q.left - 6, y, 10, true);
  // Jetty reaching out into the water for the moored ship.
  rect(c, j.left + 5, j.top, j.right - j.left, j.bottom - j.top + 6, '#16302f66');
  for (let y = j.top + 18; y < j.bottom; y += 34) { piling(c, j.left - 5, y, 10, true); piling(c, j.right - 1, y, 10, true); }
  boards(c, j.left, j.top, j.right, j.bottom, false, rnd);
  rect(c, j.left - 2, j.top, 3, j.bottom - j.top + 4, WOOD.dark); rect(c, j.right - 1, j.top, 3, j.bottom - j.top + 4, WOOD.dark);
  rect(c, j.left, j.bottom, j.right - j.left, 5, WOOD.dark); rect(c, j.left, j.bottom, j.right - j.left, 1, WOOD.hi);
  piling(c, j.left - 5, j.bottom - 4, 12, true); piling(c, j.right - 1, j.bottom - 4, 12, true);
  // Old rope coil and a hatch near the landing.
  for (let r = 7; r > 1; r -= 2) oval(c, 348, 1154, r, Math.ceil(r * .6), r % 4 === 3 ? '#b99c61' : '#8a7243');
  rect(c, 640, 1100, 22, 16, WOOD.ink); rect(c, 641, 1101, 20, 14, WOOD.dark); for (let x = 643; x < 660; x += 4) rect(c, x, 1102, 2, 12, WOOD.mid); rect(c, 649, 1106, 4, 4, '#3a3f3d');
}
export const harborClear = (x, y) => x > 180 && x < 780 && y > 940 && y < 1340;

// ---------- Upright props ----------
export function lanternPost() {
  const a = native(18, 58), c = a.getContext('2d');
  rect(c, 7, 14, 4, 42, INK); rect(c, 8, 14, 2, 42, '#454b4a'); rect(c, 8, 14, 1, 42, '#77807a');
  rect(c, 4, 52, 10, 5, INK); rect(c, 5, 52, 8, 3, '#565d5a');
  rect(c, 3, 3, 12, 13, INK); rect(c, 4, 5, 10, 9, GLOW.base); rect(c, 5, 6, 4, 6, GLOW.hi); rect(c, 10, 6, 3, 7, GLOW.deep);
  rect(c, 8, 4, 2, 11, '#3b3a33'); poly(c, [[2, 5], [9, 0], [16, 5]], INK); poly(c, [[4, 4], [9, 1], [14, 4]], '#4c5553'); rect(c, 8, 0, 2, 1, '#9aa39c');
  return a;
}
export function bollard() {
  const a = native(16, 18), c = a.getContext('2d');
  shadow(c, 8, 15, 7, 2); rect(c, 3, 5, 10, 11, INK); rect(c, 4, 5, 8, 10, '#3f4644'); rect(c, 5, 5, 2, 10, '#6f7874');
  oval(c, 8, 5, 6, 3, INK); oval(c, 8, 5, 5, 2, '#58605d'); rect(c, 6, 4, 3, 1, '#9aa39c');
  rect(c, 3, 9, 10, 2, '#b99c61'); rect(c, 3, 9, 10, 1, '#dcc58c');
  return a;
}
export function cargo() {
  const a = native(58, 46), c = a.getContext('2d'), crate = (x, y, s, tint) => {
    rect(c, x, y, s, s, INK); rect(c, x + 1, y + 1, s - 2, s - 2, tint);
    rect(c, x + 1, y + 1, s - 2, 2, WOOD.hi); rect(c, x + 1, y + s - 3, s - 2, 2, WOOD.dark);
    stroke(c, x + 2, y + 2, x + s - 3, y + s - 3, WOOD.dark, 2); rect(c, x + 2, y + s / 2 - 1, s - 4, 1, WOOD.mid);
  };
  shadow(c, 29, 42, 27, 4);
  crate(2, 20, 22, WOOD.light); crate(22, 18, 24, WOOD.base); crate(11, 1, 20, '#a8784a');
  // Tarp-lashed sack and a stencilled anchor mark.
  oval(c, 49, 34, 8, 8, INK); oval(c, 49, 34, 7, 7, '#c9b98e'); rect(c, 45, 30, 4, 3, '#e8dcb6'); rect(c, 48, 26, 2, 4, '#8a7243');
  rect(c, 33, 26, 2, 8, WOOD.ink); rect(c, 30, 28, 8, 1, WOOD.ink); rect(c, 30, 33, 2, 1, WOOD.ink); rect(c, 36, 33, 2, 1, WOOD.ink);
  return a;
}
export function barrels() {
  const a = native(40, 36), c = a.getContext('2d'), barrel = (x, y) => {
    rect(c, x + 1, y, 14, 22, INK); rect(c, x, y + 2, 16, 18, INK);
    rect(c, x + 1, y + 2, 14, 18, WOOD.base); rect(c, x + 2, y + 2, 3, 18, WOOD.light); rect(c, x + 11, y + 2, 3, 18, WOOD.mid);
    for (const k of [4, 16]) { rect(c, x, y + k, 16, 2, '#3c4442'); rect(c, x + 2, y + k, 4, 1, '#8a948f'); }
    oval(c, x + 8, y + 1, 6, 2, WOOD.dark); oval(c, x + 8, y + 1, 5, 1, WOOD.mid);
  };
  shadow(c, 20, 32, 19, 3); barrel(2, 9); barrel(21, 11); barrel(12, 2);
  return a;
}
export function crane() {
  const a = native(74, 100), c = a.getContext('2d');
  shadow(c, 22, 95, 18, 4);
  // A-frame mast, stay ropes and a boom carrying a netted load.
  rect(c, 10, 88, 26, 8, INK); rect(c, 11, 88, 24, 6, STONE.base); rect(c, 11, 88, 24, 1, STONE.hi);
  poly(c, [[14, 89], [19, 12], [25, 12], [22, 89]], INK); poly(c, [[16, 88], [20, 13], [23, 13], [20, 88]], WOOD.base); rect(c, 20, 14, 1, 70, WOOD.hi);
  poly(c, [[26, 89], [22, 20], [26, 20], [33, 89]], INK); poly(c, [[27, 88], [23, 21], [25, 21], [31, 88]], WOOD.mid);
  stroke(c, 19, 16, 70, 24, INK, 3); stroke(c, 20, 16, 69, 24, WOOD.light, 1);
  stroke(c, 22, 12, 60, 22, '#c8b27a'); stroke(c, 22, 48, 58, 25, '#9b8455');
  rect(c, 14, 55, 14, 12, INK); oval(c, 21, 61, 5, 5, WOOD.dark); oval(c, 21, 61, 3, 3, '#b99c61');
  rect(c, 66, 24, 1, 32, '#c8b27a');
  oval(c, 66, 64, 9, 8, INK); oval(c, 66, 64, 8, 7, '#8a6e44'); for (let i = -6; i < 7; i += 3) { rect(c, 66 + i, 58, 1, 13, '#c8b27a'); rect(c, 59, 64 + i / 2, 14, 1, '#c8b27a'); }
  return a;
}
export function lighthouse() {
  const a = native(56, 150), c = a.getContext('2d');
  shadow(c, 28, 144, 26, 5);
  // Rocky footing.
  oval(c, 28, 138, 26, 9, INK); oval(c, 28, 137, 25, 8, STONE.dark); oval(c, 22, 134, 12, 5, STONE.base); oval(c, 36, 136, 9, 4, STONE.light); rect(c, 18, 131, 6, 2, STONE.hi);
  // Tapered banded tower, lit from the left.
  const top = 38, bottom = 134;
  for (let y = top; y < bottom; y++) {
    const t = (y - top) / (bottom - top), half = Math.round(9 + t * 7), band = Math.floor((y - top) / 16) % 2 === 0;
    const base = band ? '#e5dcc6' : '#b8473a', light = band ? '#fbf5e4' : '#d9644f', dark = band ? '#a99e86' : '#7c2c26';
    rect(c, 28 - half - 1, y, half * 2 + 2, 1, INK); rect(c, 28 - half, y, half * 2, 1, base);
    rect(c, 28 - half, y, Math.max(2, Math.round(half * .45)), 1, light); rect(c, 28 + half - Math.round(half * .4), y, Math.round(half * .4), 1, dark);
  }
  rect(c, 24, 118, 8, 16, INK); rect(c, 25, 119, 6, 15, '#3b2a1c'); rect(c, 25, 119, 6, 2, '#5b4128');
  for (const y of [66, 96]) { rect(c, 26, y, 4, 7, INK); rect(c, 27, y + 1, 2, 5, GLOW.base); }
  // Gallery, lantern room and roof.
  rect(c, 12, 34, 32, 5, INK); rect(c, 13, 35, 30, 3, '#4c5553'); for (let x = 14; x < 43; x += 4) rect(c, x, 30, 1, 5, '#2f3634');
  rect(c, 16, 16, 24, 19, INK); rect(c, 17, 17, 22, 17, GLOW.base); rect(c, 19, 18, 7, 15, GLOW.hi); rect(c, 33, 18, 5, 15, GLOW.deep);
  for (const x of [22, 28, 34]) rect(c, x, 17, 1, 17, '#3b3a33');
  poly(c, [[12, 17], [28, 2], [44, 17]], INK); poly(c, [[15, 16], [28, 4], [41, 16]], '#9e3a30'); poly(c, [[15, 16], [28, 4], [26, 16]], '#c85243'); rect(c, 27, 0, 2, 4, INK);
  return a;
}
export function harborSign() {
  const a = native(46, 50), c = a.getContext('2d');
  shadow(c, 23, 47, 18, 3);
  for (const x of [6, 36]) { rect(c, x, 14, 5, 34, INK); rect(c, x + 1, 14, 3, 34, WOOD.mid); rect(c, x + 1, 14, 1, 34, WOOD.light); }
  rect(c, 1, 8, 44, 22, INK); rect(c, 2, 9, 42, 20, WOOD.base); rect(c, 2, 9, 42, 2, WOOD.hi); rect(c, 2, 27, 42, 2, WOOD.dark);
  // Painted anchor emblem.
  rect(c, 22, 12, 2, 13, '#223b3d'); rect(c, 17, 15, 12, 2, '#223b3d'); oval(c, 23, 11, 2, 2, '#223b3d'); rect(c, 23, 11, 1, 1, WOOD.base);
  stroke(c, 16, 21, 22, 25, '#223b3d', 2); stroke(c, 30, 21, 24, 25, '#223b3d', 2); rect(c, 15, 20, 2, 2, '#223b3d'); rect(c, 30, 20, 2, 2, '#223b3d');
  rect(c, 4, 4, 38, 4, INK); rect(c, 5, 5, 36, 2, SLATE.light);
  return a;
}

// ---------- Harbor guild hall (항구 등록소) ----------
export function guildHall() {
  const w = 140, h = 136, a = native(w, h), c = a.getContext('2d'), rnd = rng(911);
  shadow(c, 70, 130, 64, 6);
  // Fieldstone foundation.
  rect(c, 12, 104, 116, 26, INK); rect(c, 13, 105, 114, 24, STONE.base);
  for (let y = 106; y < 128; y += 6) for (let x = 14 + ((y / 6) % 2) * 5; x < 126; x += 10) { rect(c, x, y, 9, 5, rnd() < .5 ? STONE.light : STONE.base); rect(c, x, y, 9, 1, STONE.hi); rect(c, x + 8, y, 1, 5, STONE.dark); }
  // Timber-framed plaster walls.
  rect(c, 16, 56, 108, 50, INK); rect(c, 17, 57, 106, 48, '#ddd0ad'); rect(c, 17, 57, 50, 48, '#e8dcbb'); rect(c, 100, 57, 23, 48, '#c9ba94');
  for (const x of [17, 44, 70, 96, 119]) { rect(c, x, 57, 4, 48, WOOD.dark); rect(c, x, 57, 1, 48, WOOD.mid); }
  rect(c, 17, 57, 106, 4, WOOD.dark); rect(c, 17, 80, 106, 3, WOOD.dark); rect(c, 17, 101, 106, 4, WOOD.ink);
  stroke(c, 21, 61, 43, 79, WOOD.dark, 2); stroke(c, 118, 61, 97, 79, WOOD.dark, 2);
  // Glowing leaded windows with flower boxes.
  for (const x of [27, 101]) {
    rect(c, x - 1, 84, 16, 14, INK); rect(c, x, 85, 14, 12, GLOW.base); rect(c, x + 1, 86, 5, 10, GLOW.hi); rect(c, x + 7, 85, 1, 12, '#5b4128'); rect(c, x, 90, 14, 1, '#5b4128');
    rect(c, x - 2, 97, 18, 4, INK); rect(c, x - 1, 97, 16, 3, WOOD.mid); for (let i = 0; i < 5; i++) { rect(c, x + i * 3, 94, 2, 3, '#4f7d45'); rect(c, x + i * 3, 93, 2, 2, i % 2 ? '#e0a94f' : '#d0707e'); }
  }
  for (const x of [50, 77]) { rect(c, x - 1, 62, 14, 16, INK); rect(c, x, 63, 12, 14, GLOW.base); rect(c, x + 1, 64, 4, 12, GLOW.hi); rect(c, x + 6, 63, 1, 14, '#5b4128'); rect(c, x, 69, 12, 1, '#5b4128'); }
  // Arched double door, stone steps and a porch lamp.
  rect(c, 55, 82, 30, 24, INK); oval(c, 70, 83, 15, 6, INK); rect(c, 57, 83, 26, 23, '#5a3a22'); oval(c, 70, 84, 13, 5, '#5a3a22');
  rect(c, 69, 80, 2, 26, INK); for (const x of [59, 73]) { rect(c, x, 86, 8, 18, '#6f4a2c'); rect(c, x, 86, 2, 18, '#8a6038'); }
  rect(c, 65, 94, 2, 2, GLOW.base); rect(c, 74, 94, 2, 2, GLOW.base);
  rect(c, 51, 106, 38, 5, INK); rect(c, 52, 106, 36, 4, STONE.light); rect(c, 48, 111, 44, 6, INK); rect(c, 49, 111, 42, 5, STONE.base); rect(c, 49, 111, 42, 1, STONE.hi);
  rect(c, 88, 84, 5, 7, INK); rect(c, 89, 85, 3, 5, GLOW.hi);
  // Steep slate roof with a dormer, chimney and ridge cap.
  poly(c, [[6, 60], [30, 16], [110, 16], [134, 60]], INK);
  poly(c, [[9, 58], [31, 18], [109, 18], [131, 58]], SLATE.base);
  for (let y = 22; y < 58; y += 5) { const inset = (58 - y) * .55; rect(c, 9 + inset, y, 122 - inset * 2, 1, SLATE.dark); for (let x = 12 + inset + (y % 10 ? 4 : 0); x < 128 - inset; x += 9) rect(c, x, y + 1, 1, 4, SLATE.dark); }
  poly(c, [[9, 58], [31, 18], [42, 18], [22, 58]], SLATE.light); stroke(c, 31, 18, 10, 57, SLATE.hi);
  rect(c, 30, 14, 80, 5, INK); rect(c, 31, 15, 78, 3, '#4c5553'); rect(c, 31, 15, 78, 1, '#8b9892');
  rect(c, 6, 58, 128, 3, INK);
  rect(c, 94, 2, 14, 26, INK); rect(c, 95, 3, 12, 25, STONE.base); for (let y = 5; y < 27; y += 5) rect(c, 95, y, 12, 1, STONE.dark); rect(c, 95, 3, 3, 25, STONE.light); rect(c, 93, 1, 16, 4, INK); rect(c, 94, 2, 14, 2, STONE.dark);
  poly(c, [[52, 44], [70, 24], [88, 44]], INK); poly(c, [[55, 43], [70, 27], [85, 43]], SLATE.light); rect(c, 57, 42, 26, 16, INK); rect(c, 58, 43, 24, 14, '#d4c6a1');
  rect(c, 63, 45, 14, 11, INK); rect(c, 64, 46, 12, 9, GLOW.base); rect(c, 65, 47, 4, 7, GLOW.hi); rect(c, 69, 46, 1, 9, '#5b4128');
  // Hanging guild sign: anchor on a teal board.
  rect(c, 104, 64, 20, 2, INK); rect(c, 108, 66, 1, 4, INK); rect(c, 119, 66, 1, 4, INK);
  rect(c, 104, 70, 20, 14, INK); rect(c, 105, 71, 18, 12, SLATE.light); rect(c, 105, 71, 18, 1, SLATE.hi);
  rect(c, 113, 73, 2, 8, '#f0e2b2'); rect(c, 110, 74, 8, 1, '#f0e2b2'); rect(c, 109, 79, 2, 1, '#f0e2b2'); rect(c, 117, 79, 2, 1, '#f0e2b2'); rect(c, 110, 80, 8, 1, '#f0e2b2');
  // Barrel and notice board by the steps.
  rect(c, 22, 108, 13, 20, INK); rect(c, 23, 109, 11, 18, WOOD.base); rect(c, 24, 109, 3, 18, WOOD.light); rect(c, 22, 112, 13, 2, '#3c4442'); rect(c, 22, 122, 13, 2, '#3c4442');
  rect(c, 104, 108, 22, 16, INK); rect(c, 105, 109, 20, 14, WOOD.mid); for (const [x, y, col] of [[107, 111, '#efe6c8'], [114, 110, '#e4d49f'], [118, 115, '#efe6c8'], [108, 117, '#d9c78e']]) rect(c, x, y, 5, 5, col);
  rect(c, 106, 124, 3, 6, INK); rect(c, 121, 124, 3, 6, INK);
  return a;
}

// ---------- Sailing ship ----------
// Same 164×124 footprint and anchor offsets (x-82, y-90) as the old Scale2x boat.
export function ship() {
  const w = 164, h = 124, a = native(w, h), c = a.getContext('2d');
  // Water wake under the hull.
  oval(c, 84, 112, 72, 8, '#1d3e4288'); rect(c, 12, 111, 22, 1, '#cfe7de'); rect(c, 124, 113, 30, 1, '#cfe7de'); rect(c, 40, 116, 16, 1, '#a9d0c5');
  // Hull: dark keel, planked sides with a light wale, raised stern castle on the left.
  poly(c, [[6, 78], [150, 78], [162, 66], [146, 108], [22, 108]], INK);
  poly(c, [[9, 80], [149, 80], [157, 70], [144, 105], [24, 105]], '#6b4526');
  for (let y = 84; y < 104; y += 5) stroke(c, 14 + (y - 80) * .5, y, 150 - (y - 80) * .3, y, '#4d311b');
  poly(c, [[9, 80], [149, 80], [148, 84], [12, 84]], '#a0703f'); rect(c, 12, 80, 136, 1, '#d6a766');
  rect(c, 14, 90, 132, 3, '#2e4c4c'); rect(c, 14, 90, 132, 1, '#5b8a80');
  for (let x = 30; x < 140; x += 16) { rect(c, x, 95, 5, 4, INK); rect(c, x + 1, 96, 3, 2, '#2c231c'); }
  rect(c, 6, 60, 36, 22, INK); rect(c, 8, 62, 32, 18, '#7c5230'); rect(c, 8, 62, 32, 3, '#a8763f');
  for (const x of [12, 24]) { rect(c, x, 67, 8, 7, INK); rect(c, x + 1, 68, 6, 5, GLOW.base); rect(c, x + 1, 68, 2, 5, GLOW.hi); }
  rect(c, 4, 57, 40, 4, INK); rect(c, 5, 58, 38, 2, '#a0703f'); for (let x = 7; x < 42; x += 5) rect(c, x, 52, 1, 6, '#3b2a1c'); rect(c, 5, 51, 38, 2, '#5b4128');
  rect(c, 1, 44, 8, 10, INK); rect(c, 2, 45, 6, 8, GLOW.base); rect(c, 3, 46, 2, 6, GLOW.hi); rect(c, 4, 54, 1, 5, INK);
  // Bowsprit and rigging.
  stroke(c, 150, 72, 163, 58, INK, 2); stroke(c, 150, 71, 162, 58, '#a0703f');
  stroke(c, 86, 6, 162, 58, '#3d3226'); stroke(c, 86, 6, 12, 58, '#3d3226'); stroke(c, 86, 30, 146, 78, '#3d3226');
  // Mast, yard and a full square sail with sun-bleached stripes.
  rect(c, 83, 2, 6, 78, INK); rect(c, 84, 2, 4, 78, '#7a5634'); rect(c, 84, 2, 1, 78, '#b58450');
  rect(c, 50, 12, 72, 4, INK); rect(c, 51, 13, 70, 2, '#8e6337');
  poly(c, [[52, 16], [120, 16], [124, 60], [48, 60]], INK);
  poly(c, [[54, 17], [118, 17], [121, 58], [51, 58]], '#eadfbe');
  for (let y = 17; y < 58; y++) { const t = (y - 17) / 41, bulge = Math.round(Math.sin(t * Math.PI) * 3); rect(c, 54 - bulge + Math.round(t * -3), y, 3, 1, '#fff8e2'); rect(c, 112 + bulge + Math.round(t * 3), y, 6, 1, '#c9bc97'); }
  for (const x of [66, 86, 104]) for (let y = 18; y < 58; y++) rect(c, x + Math.round((y - 17) / 41 * (x < 86 ? -1 : x > 86 ? 1 : 0) * 2), y, 6, 1, '#b8473a');
  rect(c, 51, 57, 71, 2, '#b9ad88');
  // Pennant.
  rect(c, 85, 0, 2, 3, INK); poly(c, [[88, 1], [104, 4], [88, 7]], '#3f716b'); rect(c, 88, 2, 8, 1, '#6a9d8c');
  return a;
}
