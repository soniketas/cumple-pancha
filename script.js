const photoEls = Array.from(document.querySelectorAll('.photo'));
const intro = document.getElementById('intro');
const outro = document.getElementById('outro');
const progressDot = document.getElementById('progress-dot');
const progressTrack = document.getElementById('progress');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STEP = 900; // spacing between photos, matches --z values in index.html
const PASS = 350; // depth past camera before a photo is fully gone
const FADE_IN_SPAN = 1700; // how far out a photo starts becoming visible

const photos = photoEls.map((el, i) => ({
  el,
  img: el.querySelector('img'),
  x: el.style.getPropertyValue('--x').trim(),
  y: el.style.getPropertyValue('--y').trim(),
  z: parseFloat(el.style.getPropertyValue('--z')),
  rot: el.style.getPropertyValue('--rot').trim(),
  phase: i * 1.37,
}));

const lastZ = Math.min(...photos.map((p) => p.z)); // most negative
const maxDepth = Math.abs(lastZ) + STEP; // room for the last photo to pass + outro reveal

let targetDepth = 0;
let depth = 0;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function opacityForDistance(d) {
  if (d <= -FADE_IN_SPAN) return 0;
  if (d <= -STEP * 0.5) return smoothstep(-FADE_IN_SPAN, -STEP * 0.5, d);
  if (d <= 150) return 1;
  if (d <= PASS) return 1 - smoothstep(150, PASS, d);
  return 0;
}

function addDepth(amount) {
  targetDepth = clamp(targetDepth + amount, 0, maxDepth);
}

window.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? window.innerHeight : 1;
    addDepth(e.deltaY * unit);
  },
  { passive: false }
);

let touchY = null;
window.addEventListener(
  'touchstart',
  (e) => {
    touchY = e.touches[0].clientY;
  },
  { passive: true }
);
window.addEventListener(
  'touchmove',
  (e) => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    addDepth(delta * 6);
    e.preventDefault();
  },
  { passive: false }
);
window.addEventListener('touchend', () => { touchY = null; });

window.addEventListener('keydown', (e) => {
  const downKeys = ['ArrowDown', 'PageDown', ' '];
  const upKeys = ['ArrowUp', 'PageUp'];
  if (downKeys.includes(e.key)) { addDepth(320); e.preventDefault(); }
  if (upKeys.includes(e.key)) { addDepth(-320); e.preventDefault(); }
});

function frame(t) {
  depth += (targetDepth - depth) * 0.08;

  for (const p of photos) {
    const d = p.z + depth;
    const opacity = opacityForDistance(d);
    p.el.style.opacity = opacity.toFixed(3);

    let bobX = 0;
    let bobY = 0;
    if (!reduceMotion && opacity > 0.01) {
      bobX = Math.cos(t / 1400 + p.phase) * 6;
      bobY = Math.sin(t / 1100 + p.phase) * 10;
    }

    p.el.style.transform =
      `translate3d(calc(-50% + ${p.x} + ${bobX.toFixed(2)}px), ` +
      `calc(-50% + ${p.y} + ${bobY.toFixed(2)}px), ${d}px) rotate(${p.rot})`;
  }

  intro.style.opacity = (1 - smoothstep(0, 250, depth)).toFixed(3);
  intro.style.transform = `translateY(${-smoothstep(0, 250, depth) * 24}px)`;

  const outroT = smoothstep(maxDepth - STEP, maxDepth, depth);
  outro.style.opacity = outroT.toFixed(3);
  outro.style.transform = `translateY(${(1 - outroT) * 24}px)`;

  const trackHeight = progressTrack.clientHeight;
  progressDot.style.top = `${clamp(depth / maxDepth, 0, 1) * (trackHeight - 5)}px`;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
