// PixelLab exports are local assets; no API requests or credentials reach the game.
const directions = ['south','south-west','west','north-west','north','north-east','east','south-east'];
const frames = new Map(), tinted = new Map();
let manifest = null;
const root = new URL('../assets/barbarian/', import.meta.url);

export function barbarianArtStatus() {
  return { ready: frames.has('idle:south'), loaded: frames.size, animations: manifest ? Object.keys(manifest.animations || {}) : [] };
}

if (typeof Image !== 'undefined') {
  fetch(new URL('manifest.json', root)).then(r => {
    if (!r.ok) throw new Error('Barbarian art unavailable');
    return r.json();
  }).then(async data => {
    manifest = data;
    const jobs = [];
    for (const [motion, views] of Object.entries({ idle: data.rotations, ...data.animations })) {
      for (const [direction, paths] of Object.entries(views)) {
        jobs.push(Promise.all((Array.isArray(paths) ? paths : [paths]).map(path => new Promise(resolve => {
          const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = new URL(path, root);
        }))).then(images => {
          // A partially downloaded animation never flickers between missing frames.
          if (images.every(Boolean)) frames.set(`${motion}:${direction}`, images);
        }));
      }
    }
    await Promise.all(jobs);
    window.dispatchEvent(new Event('hero-art-ready'));
  }).catch(() => {}); // The original procedural barbarian remains the fallback.
}

export function barbarianSprite(frame = 0, facing = 0, motion = 'idle', tint = null) {
  const direction = directions[((facing % 8) + 8) % 8];
  const list = frames.get(`${motion}:${direction}`) || frames.get(`idle:${direction}`);
  if (!list) return null;
  const index = Math.floor(frame) % list.length;
  const img = list[index], key = `${img.src}:${tint || ''}`;
  if (tinted.has(key)) return tinted.get(key);
  const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, 0, 0);
  if (tint) { c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .18; c.fillStyle = tint; c.fillRect(0, 0, canvas.width, canvas.height); }
  canvas.anchorX = (manifest.anchorX ?? 32) + (canvas.width - 64) / 2;
  canvas.anchorY = (manifest.anchorY ?? 60) + (canvas.height - 64) / 2;
  canvas.directional = true;
  tinted.set(key, canvas);
  return canvas;
}
