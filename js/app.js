import * as THREE from '../vendor/three.module.js';

/* ---------------------------------------------------------------- config */
const RING_R = 7.2;
const H_MIN = 1.02, H_MAX = 1.30;
const COVER_AR = 0.667;          // width / height of the front cover
const SPIN = 0.055;              // radians per second
const SANS = '-apple-system,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';
const PALETTE = ['#b23a2e','#c1622b','#c99a2e','#7d8b32','#2f8f6f','#2b7a9b',
                 '#3b5fa8','#6a4a9c','#a8437a','#b0553b','#8d6e4a','#4e8b5a',
                 '#9c3b52','#2c6e8f','#7d5ba6','#a8792b'];

const $ = (s) => document.querySelector(s);
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedMQ.matches;

/* ---------------------------------------------------------------- helpers */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rnd(id, salt) { return (hash(id + '|' + salt) % 10000) / 10000; }
function colorFor(item) { return PALETTE[hash(item.id) % PALETTE.length]; }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function shortAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ---------------------------------------------------------------- cover art */
const CW = 384, CH = 576;
function tracked(ctx, text, x, y, sp, align = 'left') {
  const chars = [...text];
  let w = chars.reduce((a, c) => a + ctx.measureText(c).width + sp, 0) - sp;
  let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; }
  ctx.textAlign = prev;
  return w;
}
function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function drawImageCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let sw, sh, sx, sy;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function drawCover(ctx, item, color, img, idx) {
  const PAD = 30;
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = '#f0e8d8';
  ctx.fillRect(0, 0, CW, CH);
  let g = ctx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, 'rgba(255,255,255,.5)');
  g.addColorStop(.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(60,40,20,.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);

  /* top band */
  const bandH = 82;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CW, bandH);
  g = ctx.createLinearGradient(0, 0, 0, bandH);
  g.addColorStop(0, 'rgba(255,255,255,.18)');
  g.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, bandH);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.textBaseline = 'middle';
  ctx.font = '600 12px ' + SANS;
  tracked(ctx, 'INTERESTING READS', PAD, bandH / 2 + 1, 2.4);
  tracked(ctx, 'No. ' + String(idx + 1).padStart(2, '0'), CW - PAD, bandH / 2 + 1, 2.4, 'right');

  /* image window */
  const iy = 104, ih = 262, iw = CW - PAD * 2;
  if (img) {
    drawImageCover(ctx, img, PAD, iy, iw, ih);
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD + .5, iy + .5, iw - 1, ih - 1);
  } else {
    ctx.fillStyle = color + '26';
    ctx.fillRect(PAD, iy, iw, ih);
    ctx.strokeStyle = color + '59';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD + .5, iy + .5, iw - 1, ih - 1);
    ctx.fillStyle = color;
    ctx.font = 'italic 22px ' + SERIF;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const lines = wrap(ctx, item.publication, iw - 44);
    lines.forEach((ln, i) => ctx.fillText(ln, CW / 2, iy + ih / 2 + (i - (lines.length - 1) / 2) * 30));
    ctx.textAlign = 'left';
  }

  /* title */
  const titleTop = 392, titleW = CW - PAD * 2, titleRoom = 108;
  let size = 34, lines = [];
  for (; size >= 18; size -= 1) {
    ctx.font = '600 ' + size + 'px ' + SERIF;
    lines = wrap(ctx, item.title, titleW);
    if (lines.length * size * 1.12 <= titleRoom) break;
  }
  ctx.fillStyle = '#17150f';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lines.forEach((ln, i) => ctx.fillText(ln, PAD, titleTop + i * size * 1.12));

  /* footer */
  ctx.strokeStyle = 'rgba(23,21,15,.22)';
  ctx.beginPath();
  ctx.moveTo(PAD, CH - 66);
  ctx.lineTo(CW - PAD, CH - 66);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3f3a30';
  ctx.font = '600 10.5px ' + SANS;
  const author = item.author.length > 30 ? item.author.slice(0, 29) + '\u2026' : item.author;
  tracked(ctx, author.toUpperCase(), PAD, CH - 44, 1.6);
  ctx.fillStyle = '#7d7566';
  ctx.font = '600 10.5px ' + SANS;
  tracked(ctx, item.year, CW - PAD, CH - 44, 1.2, 'right');
}

/* ---------------------------------------------------------------- state */
const state = {
  items: [], books: [], open: null, hovered: null, topic: null, query: '',
  spin: SPIN, spinHold: 0, dragging: false, tableFade: 0,
  camY: 1.62, camLook: 0.62, camYTarget: 1.62, camLookTarget: 0.62,
};

/* ---------------------------------------------------------------- three boot */
let renderer, scene, camera, ring, raycaster, pointer, table, clock;
const pickables = [];

function initThree() {
  const canvas = $('#scene');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#08080a');
  scene.fog = new THREE.Fog('#08080a', 17, 33);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 1.62, 13.4);
  camera.lookAt(0, 0.62, 0);

  scene.add(new THREE.AmbientLight(0xfff0dd, 0.55));
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x1a1108, 0.5);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffd9a3, 3.1);
  key.position.set(-7.5, 11, 8.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 42;
  key.shadow.camera.left = -10.5;
  key.shadow.camera.right = 10.5;
  key.shadow.camera.top = 10.5;
  key.shadow.camera.bottom = -10.5;
  key.shadow.bias = -0.0007;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x7fa8ff, 0.85);
  rim.position.set(8, 5, -7);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffe6c8, 0.5);
  fill.position.set(6, 3, 10);
  scene.add(fill);

  /* shelf ring */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x33200f, roughness: 0.85, metalness: 0 });
  const lip = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.075, 12, 128), woodMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.02;
  lip.castShadow = true;
  lip.receiveShadow = true;
  scene.add(lip);

  const lip2 = new THREE.Mesh(new THREE.TorusGeometry(RING_R + 0.16, 0.028, 8, 128),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.7 }));
  lip2.rotation.x = Math.PI / 2;
  lip2.position.y = -0.12;
  scene.add(lip2);

  /* invisible shadow catcher so the books feel grounded */
  const catcher = new THREE.Mesh(
    new THREE.CircleGeometry(11, 64),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.55 })
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.001;
  catcher.receiveShadow = true;
  scene.add(catcher);

  /* wooden table for the opened book */
  table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.13, 64),
    new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 0.62, metalness: 0.02 }));
  top.castShadow = true;
  top.receiveShadow = true;
  table.add(top);
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.045, 10, 64),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.5 }));
  rimT.rotation.x = Math.PI / 2;
  rimT.position.y = 0.065;
  table.add(rimT);
  table.position.set(-1.45, 0.55, 8.9);
  table.visible = false;
  table.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 0; } });
  scene.add(table);

  ring = new THREE.Group();
  scene.add(ring);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-10, -10);
  clock = new THREE.Clock();
}

/* ---------------------------------------------------------------- books */
const pageMat = new THREE.MeshStandardMaterial({ color: 0xe8dfcc, roughness: 0.92, metalness: 0 });

function buildBooks(items) {
  const n = items.length;
  items.forEach((item, idx) => {
    const h = H_MIN + rnd(item.id, 'h') * (H_MAX - H_MIN);
    const w = h * COVER_AR;
    const d = 0.30 + rnd(item.id, 'd') * 0.20;
    const color = colorFor(item);

    const group = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.y = h / 2;
    group.add(inner);

    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.985, h * 0.985, d * 0.93), pageMat);
    body.castShadow = true;
    body.receiveShadow = true;
    inner.add(body);

    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');
    drawCover(ctx, item, color, null, idx);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const coverMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), coverMat);
    front.position.z = d / 2 + 0.002;
    front.castShadow = true;
    inner.add(front);

    const backMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(color, -0.42)), roughness: 0.8 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.014), backMat);
    back.position.z = -d / 2;
    back.castShadow = true;
    inner.add(back);

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, d * 0.99),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.62 }));
    spine.position.x = -w / 2 + 0.03;
    spine.castShadow = true;
    inner.add(spine);

    const angle = (idx / n) * Math.PI * 2;
    group.position.set(Math.sin(angle) * RING_R, 0, Math.cos(angle) * RING_R);
    group.rotation.set(0, angle, 0);
    ring.add(group);

    const book = {
      item, group, inner, w, h, d, color, idx,
      angle, targetAngle: angle, lean: (rnd(item.id, 'lean') - 0.5) * 0.05,
      onShelf: true, visible: true, falling: false, detached: false,
      lift: 0, liftTarget: 0, riseT: 1, anim: null, closing: false,
      vel: new THREE.Vector3(), angVel: new THREE.Vector3(), open: false,
    };
    group.userData.book = book;
    inner.userData.book = book;
    pickables.push(inner);

    if (item.image) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => { drawCover(ctx, item, color, img, idx); tex.needsUpdate = true; };
      img.onerror = () => {};
      setTimeout(() => { img.src = item.image; }, 400 + idx * 55);
    }
    state.books.push(book);
  });
}

/* ---------------------------------------------------------------- layout */
function layoutVisible() {
  const vis = state.books.filter((b) => b.onShelf);
  const n = vis.length || 1;
  const step = (Math.PI * 2) / n;
  vis.forEach((b, i) => { b.targetAngle = i * step; });
}

function slotY(b) { return 0; }

function applySlot(b, dt) {
  const delta = shortAngle(b.angle, b.targetAngle);
  b.angle += delta * Math.min(1, dt * 4.5);
  const r = RING_R;
  b.group.position.set(Math.sin(b.angle) * r, b.riseT < 1 ? slotY(b) + (1 - easeOut(b.riseT)) * -2.8 : 0, Math.cos(b.angle) * r);
  b.group.rotation.set(0, b.angle, b.lean);
}

/* ---------------------------------------------------------------- filter */
function matches(item) {
  const q = state.query.trim().toLowerCase();
  const topicOk = !state.topic || item.topic === state.topic;
  if (!topicOk) return false;
  if (!q) return true;
  return (item.title + ' ' + item.author + ' ' + item.topic + ' ' + item.publication).toLowerCase().includes(q);
}

function applyFilter() {
  state.books.forEach((b) => {
    const want = matches(b.item);
    if (want && !b.onShelf) {
      b.onShelf = true;
      rise(b);
    } else if (!want && b.onShelf) {
      b.onShelf = false;
      if (state.open === b) closeBook(b);
      if (reduced) {
        b.group.visible = false;
        if (b.detached) { ring.add(b.group); b.detached = false; }
        b.falling = false;
      } else {
        tumble(b);
      }
    }
  });
  layoutVisible();
  const count = state.books.filter((b) => b.onShelf).length;
  const label = state.query.trim() ? 'matching \u201c' + state.query.trim() + '\u201d' : (state.topic || '');
  toast(count === 0 ? 'Nothing on the shelf for that' : count + ' book' + (count === 1 ? '' : 's') + (label ? ' \u00b7 ' + label : ''));
}

function rise(b) {
  b.falling = false;
  if (b.detached) { ring.add(b.group); b.detached = false; }
  b.group.visible = true;
  b.riseT = reduced ? 1 : 0;
  b.group.position.set(Math.sin(b.angle) * RING_R, reduced ? 0 : -2.8, Math.cos(b.angle) * RING_R);
  b.group.rotation.set(0, b.angle, b.lean);
}

function tumble(b) {
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
  b.group.updateWorldMatrix(true, false);
  b.group.getWorldPosition(wp);
  b.group.getWorldQuaternion(wq);
  scene.attach(b.group);
  b.falling = true;
  const dir = new THREE.Vector3(Math.sin(b.angle + ring.rotation.y), 0, Math.cos(b.angle + ring.rotation.y));
  b.vel.copy(dir).multiplyScalar(1.5 + Math.random() * 1.1).setY(-0.3);
  b.angVel.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6);
}

/* ---------------------------------------------------------------- card */
const card = $('#card');
function showCard(b) {
  const it = b.item;
  $('#card-kicker').textContent = it.topic + ' \u00b7 ' + it.year;
  $('#card-title').textContent = it.title;
  $('#card-by').textContent = it.author + (it.publication ? ' \u00b7 ' + it.publication : '');
  $('#card-desc').textContent = it.desc || '';
  const read = $('#card-read');
  read.href = it.url;
  read.textContent = it.status === 'paid' ? 'Read it (may be paywalled) \u2197' : 'Read it \u2197';
  $('#card-note').textContent = it.status === 'paid'
    ? 'This one sits behind a paywall or a login. The link still goes to the source.'
    : '';
  card.hidden = false;
  $('#hint').classList.add('gone');
}

function hideCard() { card.hidden = true; }

/* ---------------------------------------------------------------- open / close */
function openTarget(b) {
  const mobile = window.innerWidth <= 820;
  const p = mobile
    ? new THREE.Vector3(0, 1.7, 8.6)
    : new THREE.Vector3(-1.45, 0.615 + b.h / 2, 8.9);
  const e = mobile ? new THREE.Euler(-0.05, 0, 0) : new THREE.Euler(-0.12, -0.10, 0);
  return { p, q: new THREE.Quaternion().setFromEuler(e) };
}

function openBook(b) {
  if (state.open === b) return;
  if (state.open) closeBook(state.open, true);
  state.open = b;
  b.open = true;
  b.liftTarget = 0;
  b.lift = 0;
  b.inner.position.set(0, b.h / 2, 0);

  const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
  b.inner.updateWorldMatrix(true, false);
  b.inner.getWorldPosition(wp);
  b.inner.getWorldQuaternion(wq);
  scene.attach(b.inner);

  const t = openTarget(b);
  b.anim = {
    from: { p: wp.clone(), q: wq.clone() },
    to: t,
    t: 0,
    dur: reduced ? 0.001 : 0.72,
    kind: 'open',
  };
  state.tableFade = window.innerWidth <= 820 ? 0 : 1;
  state.camYTarget = window.innerWidth <= 820 ? 1.62 : 2.08;
  state.camLookTarget = window.innerWidth <= 820 ? 0.62 : 0.82;
  showCard(b);
  try { history.replaceState(null, '', '#/' + b.item.id); } catch (e) { /* file:// */ }
}

function closeBook(b, instant) {
  if (!b || !b.open) return;
  b.open = false;
  if (state.open === b) state.open = null;
  hideCard();
  state.tableFade = 0;
  state.camYTarget = 1.62;
  state.camLookTarget = 0.62;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }

  const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
  b.group.updateWorldMatrix(true, false);
  b.group.getWorldPosition(wp);
  b.group.getWorldQuaternion(wq);

  b.anim = {
    from: { p: b.inner.position.clone(), q: b.inner.quaternion.clone() },
    to: { p: wp.clone(), q: wq.clone() },
    t: 0,
    dur: (reduced || instant) ? 0.001 : 0.55,
    kind: 'close',
  };
  b.closing = true;
}

/* ---------------------------------------------------------------- toast */
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------------------------------------------------------------- interaction */
function visibleOrder() {
  return state.books.filter((b) => b.onShelf)
    .map((b) => {
      const world = b.angle + ring.rotation.y;
      const a = ((world % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return { b, d: Math.abs(a > Math.PI ? a - Math.PI * 2 : a) };
    })
    .sort((x, y) => x.d - y.d)
    .map((x) => x.b);
}
function step(dir) {
  const list = visibleOrder();
  if (!list.length) return;
  const i = state.open ? list.indexOf(state.open) : -1;
  const next = list[(i + dir + list.length) % list.length];
  if (next) openBook(next);
}

function facingCamera(b) {
  const wp = new THREE.Vector3();
  b.group.getWorldPosition(wp);
  const nrm = new THREE.Vector3(Math.sin(b.angle + ring.rotation.y), 0, Math.cos(b.angle + ring.rotation.y));
  const toCam = camera.position.clone().sub(wp).setY(0).normalize();
  return nrm.dot(toCam) > 0.12;
}

function pickAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.book) o = o.parent;
    if (!o) continue;
    const b = o.userData.book;
    if (!b.onShelf || b.falling || b.open) continue;
    if (!facingCamera(b)) continue;
    return b;
  }
  return null;
}

function bindInput() {
  const canvas = renderer.domElement;
  let down = null, lastX = 0, lastT = 0, velocity = 0;

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, moved: false, t: performance.now() };
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (down) {
      const dx = e.clientX - lastX;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      lastX = e.clientX;
      lastT = now;
      if (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4) down.moved = true;
      if (down.moved) {
        ring.rotation.y += dx * 0.006;
        velocity = (dx * 0.006) / (dt / 1000);
        state.dragging = true;
        canvas.classList.add('dragging');
        if (state.hovered) { state.hovered.liftTarget = 0; state.hovered = null; }
      }
      return;
    }
    const b = pickAt(e.clientX, e.clientY);
    if (b !== state.hovered) {
      if (state.hovered) state.hovered.liftTarget = 0;
      state.hovered = b;
      if (b) b.liftTarget = 1;
    }
    canvas.classList.toggle('pointing', !!b);
    if (b) state.spinHold = 0.35;
  });

  const end = (e) => {
    if (!down) return;
    const wasDrag = down.moved;
    const quick = performance.now() - down.t < 450;
    down = null;
    state.dragging = false;
    canvas.classList.remove('dragging');
    if (!wasDrag && quick) {
      const b = pickAt(e.clientX, e.clientY);
      if (b) openBook(b);
    } else {
      state.spinHold = Math.max(state.spinHold, clamp(Math.abs(velocity) * 0.35, 0, 1.6));
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { down = null; state.dragging = false; canvas.classList.remove('dragging'); });
  canvas.addEventListener('pointerleave', () => {
    if (state.hovered) { state.hovered.liftTarget = 0; state.hovered = null; }
    canvas.classList.remove('pointing');
  });

  /* keyboard */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (state.open) closeBook(state.open); return; }
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { if (state.open) step(1); else ring.rotation.y -= 0.22; }
    if (e.key === 'ArrowLeft') { if (state.open) step(-1); else ring.rotation.y += 0.22; }
  });

  /* hash deep link */
  window.addEventListener('hashchange', routeHash);
}

function routeHash() {
  const m = /^#\/(.+)$/.exec(location.hash);
  if (!m) { if (state.open) closeBook(state.open); return; }
  const b = state.books.find((x) => x.item.id === m[1]);
  if (b) {
    if (!b.onShelf) { state.topic = null; state.query = ''; $('#search').value = ''; syncTopicButtons(); applyFilter(); }
    openBook(b);
  }
}

/* ---------------------------------------------------------------- chrome */
const TOPICS_ORDER = ['Mind', 'Money', 'AI', 'Science', 'Writing', 'History', 'India'];
function buildTopicButtons() {
  const nav = $('#topics');
  const topics = TOPICS_ORDER.filter((t) => state.items.some((i) => i.topic === t));
  const make = (label, value) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.topic = value || '';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      state.topic = state.topic === value ? null : value;
      syncTopicButtons();
      applyFilter();
    });
    nav.appendChild(b);
  };
  make('All', null);
  topics.forEach((t) => make(t, t));
  syncTopicButtons();
}
function syncTopicButtons() {
  document.querySelectorAll('#topics button').forEach((b) => {
    const v = b.dataset.topic || null;
    b.setAttribute('aria-pressed', String(v === state.topic));
  });
}

function buildFallback() {
  const ul = $('#fallback');
  ul.innerHTML = '';
  state.items.forEach((it) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = it.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = it.title;
    const s = document.createElement('span');
    s.textContent = it.author + ' \u00b7 ' + it.publication + ' \u00b7 ' + it.year + ' \u00b7 ' + it.topic;
    li.append(a, s);
    ul.appendChild(li);
  });
  ul.hidden = false;
}

function typeHeading() {
  const text = 'Welcome to Interesting Reads';
  const el = $('#typed');
  const h = $('#heading');
  if (reduced) { el.textContent = text; h.classList.add('done'); return; }
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, 42 + Math.random() * 40);
    else setTimeout(() => h.classList.add('done'), 1200);
  };
  setTimeout(tick, 260);
}

function bindChrome() {
  $('#search').addEventListener('input', (e) => {
    state.query = e.target.value;
    clearTimeout(bindChrome._t);
    bindChrome._t = setTimeout(applyFilter, 160);
  });
  $('#surprise').addEventListener('click', () => {
    let pool = state.books.filter((b) => b.onShelf);
    if (!pool.length) {
      state.topic = null; state.query = ''; $('#search').value = ''; syncTopicButtons(); applyFilter();
      pool = state.books.filter((b) => b.onShelf);
    }
    if (!pool.length) return;
    openBook(pool[Math.floor(Math.random() * pool.length)]);
  });
  $('#card-close').addEventListener('click', () => state.open && closeBook(state.open));
  $('#card-prev').addEventListener('click', () => step(-1));
  $('#card-next').addEventListener('click', () => step(1));
  $('#card-share').addEventListener('click', async () => {
    if (!state.open) return;
    const url = location.origin + location.pathname + '#/' + state.open.item.id;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch (e) { toast(url); }
  });
}

/* ---------------------------------------------------------------- loop */
function tick(dt) {

  /* spin */
  const holding = state.dragging || state.hovered || state.open || state.spinHold > 0;
  if (state.spinHold > 0) state.spinHold = Math.max(0, state.spinHold - dt);
  const target = holding ? 0 : SPIN;
  state.spin += (target - state.spin) * Math.min(1, dt * 2.4);
  if (!reduced) ring.rotation.y += state.spin * dt;

  /* camera breathes in slightly when a book is open */
  state.camY += (state.camYTarget - state.camY) * Math.min(1, dt * 3.2);
  state.camLook += (state.camLookTarget - state.camLook) * Math.min(1, dt * 3.2);
  camera.position.y = state.camY;
  camera.lookAt(0, state.camLook, 0);

  /* table fade */
  const wantTable = state.tableFade;
  table.visible = wantTable > 0.01;
  table.traverse((o) => { if (o.material) o.material.opacity = wantTable; });

  state.books.forEach((b) => {
    if (b.anim) {
      b.anim.t += dt;
      const k = clamp(b.anim.t / b.anim.dur, 0, 1);
      const e = easeInOut(k);
      b.inner.position.lerpVectors(b.anim.from.p, b.anim.to.p, e);
      b.inner.quaternion.slerpQuaternions(b.anim.from.q, b.anim.to.q, e);
      if (k >= 1) {
        const kind = b.anim.kind;
        b.anim = null;
        if (kind === 'close') {
          b.group.attach(b.inner);
          b.inner.position.set(0, b.h / 2, 0);
          b.inner.quaternion.identity();
          b.closing = false;
        }
      }
    }

    if (b.falling) {
      b.vel.y -= 16 * dt;
      b.group.position.addScaledVector(b.vel, dt);
      b.group.rotation.x += b.angVel.x * dt;
      b.group.rotation.y += b.angVel.y * dt;
      b.group.rotation.z += b.angVel.z * dt;
      if (b.group.position.y < -8.5) {
        b.group.visible = false;
        b.falling = false;
        scene.remove(b.group);
        b.detached = true;
      }
      return;
    }

    if (!b.onShelf) return;

    if (b.riseT < 1) b.riseT = Math.min(1, b.riseT + dt * 1.7);
    applySlot(b, dt);

    /* lift on hover */
    if (!b.open && !b.closing) {
      b.lift += (b.liftTarget - b.lift) * Math.min(1, dt * 9);
      const l = easeOut(b.lift);
      b.inner.position.y = b.h / 2 + l * 0.13;
      b.inner.position.z = l * 0.30;
      b.inner.rotation.x = -l * 0.06;
      b.inner.rotation.y = l * 0.05;
      if (b.lift < 0.002 && b.liftTarget === 0) {
        b.inner.position.set(0, b.h / 2, 0);
        b.inner.rotation.set(0, 0, 0);
      }
    }
  });

}

function frame() {
  tick(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- resize */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (state.open) {
    const t = openTarget(state.open);
    state.open.anim = {
      from: { p: state.open.inner.position.clone(), q: state.open.inner.quaternion.clone() },
      to: t, t: 0, dur: 0.4, kind: 'open',
    };
  }
}

/* ---------------------------------------------------------------- boot */
async function boot() {
  let items;
  try {
    items = await fetch('data/essays.json').then((r) => {
      if (!r.ok) throw new Error('data');
      return r.json();
    });
  } catch (e) {
    try {
      const s = document.createElement('script');
      s.src = 'data/essays.js';
      document.head.appendChild(s);
      await new Promise((res, rej) => { s.onload = res; s.onerror = rej; });
      items = window.ESSAYS;
    } catch (e2) { items = null; }
  }
  if (!items || !items.length) { document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:0;display:grid;place-items:center;color:#a8a29a;font:14px system-ui">The shelf could not load.</p>'); return; }
  state.items = items;

  typeHeading();
  buildTopicButtons();
  bindChrome();

  try {
    initThree();
    buildBooks(items);
    layoutVisible();
    bindInput();
    window.addEventListener('resize', onResize);
    clock.start();
    requestAnimationFrame(frame);
    window.__shelf = { state, tick, get camera() { return camera; }, get ring() { return ring; }, render: () => renderer.render(scene, camera) };
    routeHash();
  } catch (err) {
    console.error(err);
    buildFallback();
  }
}

reducedMQ.addEventListener?.('change', (e) => { reduced = e.matches; });

boot();
