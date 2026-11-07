import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const depthLayer = document.getElementById('depth-layer');
const intro = document.getElementById('intro');
const outro = document.getElementById('outro');
const progressDot = document.getElementById('progress-dot');
const progressTrack = document.getElementById('progress');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STEP = 900; // spacing between photos, matches --z values in index.html
const PASS = 350; // depth past camera before a photo is fully gone
const FADE_IN_SPAN = 1700; // how far out a photo starts becoming visible

function buildPhoto(el, i) {
  return {
    el,
    x: el.style.getPropertyValue('--x').trim(),
    y: el.style.getPropertyValue('--y').trim(),
    z: parseFloat(el.style.getPropertyValue('--z')),
    rot: el.style.getPropertyValue('--rot').trim(),
    phase: i * 1.37,
  };
}

const staticEls = Array.from(document.querySelectorAll('.photo'));
let photos = staticEls.map(buildPhoto);
let lastZ = Math.min(...photos.map((p) => p.z));
let maxDepth = Math.abs(lastZ) + STEP;

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

// --- Live guestbook entries from Firestore ---

const baseZ = lastZ; // z of the last static photo; guestbook entries continue from here
const dynamicStart = staticEls.length;

function layoutFor(i) {
  const side = i % 2 === 0 ? -1 : 1;
  const amp = 20 + (i % 3) * 4; // 20 / 24 / 28 vw
  const x = `${(side * amp).toFixed(0)}vw`;
  const y = `${(((i % 4) - 1.5) * 8).toFixed(0)}vh`;
  const rot = `${(side * -1 * (2 + (i % 3))).toFixed(0)}deg`;
  return { x, y, rot };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function buildEntryEl(doc, i) {
  const { x, y, rot } = layoutFor(i);
  const el = document.createElement('div');
  el.className = 'photo photo--guest';
  el.style.setProperty('--x', x);
  el.style.setProperty('--y', y);
  el.style.setProperty('--rot', rot);

  const name = escapeHtml(doc.name || '');
  const comment = doc.comment ? escapeHtml(doc.comment) : '';

  if (doc.photo) {
    el.innerHTML = `
      <img src="${doc.photo}" alt="Foto del libro de visitas, de ${name}" />
      <div class="photo-caption">
        <span class="photo-caption__name">${name}</span>
        ${comment ? `<span class="photo-caption__comment">${comment}</span>` : ''}
      </div>
    `;
  } else {
    el.classList.add('photo--text');
    el.innerHTML = `
      <div class="photo-text__comment">${comment}</div>
      <div class="photo-text__name">${name}</div>
    `;
  }

  return el;
}

function renderGuestbook(docs) {
  for (const el of depthLayer.querySelectorAll('.photo--guest')) el.remove();

  const dynamicPhotos = docs.map((doc, i) => {
    const el = buildEntryEl(doc, i);
    depthLayer.appendChild(el);
    return {
      el,
      x: el.style.getPropertyValue('--x').trim(),
      y: el.style.getPropertyValue('--y').trim(),
      z: baseZ - (i + 1) * STEP,
      rot: el.style.getPropertyValue('--rot').trim(),
      phase: (dynamicStart + i) * 1.37,
    };
  });

  photos = [...staticEls.map(buildPhoto), ...dynamicPhotos];
  lastZ = Math.min(...photos.map((p) => p.z));
  maxDepth = Math.abs(lastZ) + STEP;
}

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const q = query(collection(db, 'guestbook'), orderBy('createdAt', 'asc'));
  onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((d) => d.data());
    renderGuestbook(docs);
  });
} catch (err) {
  console.error('Guestbook live feed unavailable:', err);
}
