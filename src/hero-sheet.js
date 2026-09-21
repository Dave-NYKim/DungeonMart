// Generated sheet: four directions, idle / stride / casting rows.
export function createHeroSheet(classId) {
const cache = new Map();
let sheet;
function status() { return { ready: Boolean(sheet), directions: 4, poses: 3 }; }
if (typeof Image !== 'undefined') {
  const img = new Image();
  img.onload = () => { sheet = img; window.dispatchEvent(new Event('hero-art-ready')); };
  img.src = new URL(`../assets/${classId}/sprites.png`, import.meta.url);
}
function sprite(frame = 0, facing = 0, motion = 'idle', tint = null) {
  if (!sheet) return null;
  // Diagonals use the nearest cardinal view; these are not eight generated directions.
  const column = [0,1,1,1,2,3,3,3][((facing % 8) + 8) % 8];
  const row = motion === 'attack' ? 2 : motion === 'walk' ? Math.floor(frame / 2) % 2 : 0;
  const key = `${column}:${row}:${tint || ''}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  const w = sheet.naturalWidth / 4, h = sheet.naturalHeight / 3;
  // The necromancer's second column was generated facing right.
  const flip = classId === 'necromancer' && column === 1;
  if (flip) { c.translate(64,0); c.scale(-1,1); }
  c.drawImage(sheet, column*w, row*h, w, h, 0, 0, 64, 64);
  c.setTransform(1,0,0,1,0,0);
  if (tint) { c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .18; c.fillStyle = tint; c.fillRect(0,0,64,64); }
  canvas.anchorX = 32; canvas.anchorY = 61; canvas.directional = true;
  cache.set(key,canvas); return canvas;
}

return { sprite, status };
}
