// scenes/scenes.js — S2: Transitions, The Screen and The Truck (Sprint 2)
// A 16:9 screen over one long horizontal strip (side-scroller, like a 2D Mario level).
// The strip scrolls behind; the cat and box stay on screen in one shared stage.
//
// Usage (S3):
//   import { createScenes } from './scenes/scenes.js';
//   const scenes = createScenes(el, stations);        // or createScenes(el) to load data/lessons.json
//   await scenes.ready;
//   await scenes.travel('backyard', cat, box.el); // the cat walks, the box hops along, the world scrolls
//   await scenes.goTo('backyard');         // or just scroll, without the cat
//
//   const truck = scenes.addTruck('charging', { gpsLabel }); // put the truck at a station (label text from lessons.json)
//   await truck.setGPS(url, { caster: cat });           // the cat casts a cyan spell that switches on the GPS
//   await truck.load(box.el, { caster: cat });          // the cat raises the box with its wand and lowers it onto the truck
//   await truck.drive();                                // the truck drives off with the box
//   truck.reset();                                      // truck and box come back (for retries)
//
//   import { equipWand, enableDozing } from './scenes/scenes.js';
//   await equipWand(cat);              // uses the wand built into cat/cat.svg (or loads cat/wand.svg
//                                      // for a cat drawn without one); it sways and aims
//   enableDozing(cat, { after: 10000 }); // the idle cat dozes off after 10 s; walks and spells wake it

const CSS_ID = 'gg-scenes-css';
const DURATION = 1600; // ms, how long one scroll between stations takes
// Near-constant speed (short soft start and stop), so the ground keeps pace with the cat's steps
const SCROLL_EASE = 'cubic-bezier(.3, .05, .7, .95)';
const DEFAULT_TRUCK_SRC = 'scenes/truck.svg'; // S1's truck; a placeholder is drawn if it's missing

const CSS = `
  .gg-screen { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden;
    border-radius: 14px; background: #1e1d1a; direction: ltr; } /* ltr: page may be rtl */
  .gg-track { display: flex; height: 100%; background: left / 100% 100% no-repeat;
    transition: transform ${DURATION}ms ${SCROLL_EASE}; }
  .gg-station { position: relative; height: 100%; background: center / cover no-repeat; }
  .gg-title { position: absolute; top: 12px; right: 16px; padding: 2px 12px;
    border-radius: 999px; background: rgba(0, 0, 0, .55); color: #fff;
    font: 600 14px system-ui, sans-serif; direction: rtl; z-index: 2; }
  .gg-stage { position: absolute; left: 0; right: 0; bottom: 0; height: 60%; z-index: 1;
    display: flex; align-items: flex-end; justify-content: flex-start; gap: 24px;
    padding: 0 0 4% 24%; box-sizing: border-box; pointer-events: none; }
  .gg-stage > * { pointer-events: auto; }
  /* Soft scene lighting so characters sit in the world instead of looking like stickers */
  .gg-stage > :not(.gg-shadow):not(.gg-puff) { filter: drop-shadow(0 3px 3px rgba(0, 0, 0, .35)); }
  /* Ground shadow under anything standing on the stage (and under the truck) */
  .gg-shadow { position: absolute; left: 0; top: 0; pointer-events: none; z-index: -1; border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, .45), rgba(0, 0, 0, .18) 45%, rgba(0, 0, 0, 0) 70%); }
  .gg-truck-shadow { position: absolute; left: 2%; right: 2%; bottom: -4%; height: 14%; z-index: -1;
    border-radius: 50%; background: radial-gradient(ellipse at center, rgba(0, 0, 0, .5), rgba(0, 0, 0, 0) 70%); }

  /* The truck lives in its station (part of the world), so it scrolls with the strip */
  .gg-truck { position: absolute; right: 3%; bottom: 5%; width: 30%; z-index: 1; }
  .gg-truck-art { position: relative; }
  .gg-truck-art svg, .gg-truck-art img { display: block; width: 100%; height: auto; overflow: visible; }
  .gg-truck-bed { position: absolute; left: 6%; bottom: 33%; width: 50%; height: 120%;
    display: flex; align-items: flex-end; justify-content: center; pointer-events: none; }
  .gg-truck.is-driving .gg-truck-art { animation: gg-rumble .18s linear infinite; }
  /* Engine idling: a soft, slow shake while the truck waits */
  .gg-truck:not(.is-driving):not([data-gone]) .gg-truck-art { animation: gg-idle 1.6s ease-in-out infinite; }
  @keyframes gg-idle { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(-1.5px); }
    55% { transform: translateY(-1px); } }
  .gg-truck.is-driving .gg-wheel { animation: gg-spin .45s linear infinite;
    transform-box: fill-box; transform-origin: center; }
  @keyframes gg-rumble { 50% { transform: translateY(-2px); } }
  @keyframes gg-spin { to { transform: rotate(360deg); } }

  /* GPS screen on the truck: shows where git push is sending the box */
  .gg-gps { position: absolute; right: 0; bottom: 100%; margin-bottom: 6px; width: 72%;
    background: #10151c; border: 2px solid #5fc3cf; border-radius: 8px; padding: 4px 8px;
    color: #d9f6fa; font: 600 clamp(8px, 1.1vw, 12px)/1.35 ui-monospace, Menlo, Consolas, monospace;
    box-shadow: 0 0 12px rgba(95, 195, 207, .35); box-sizing: border-box;
    transform-origin: 80% 100%; transition: transform .3s, opacity .3s; }
  .gg-gps[hidden] { display: block; opacity: 0; transform: scale(.6); }
  .gg-gps::after { content: ""; position: absolute; right: 18%; top: 100%; width: 3px; height: 8px;
    background: #5fc3cf; }
  .gg-gps-head { display: flex; justify-content: space-between; color: #5fc3cf; font-size: .85em; }
  .gg-gps-url { display: block; word-break: break-all; }
  .gg-gps-dot { width: .6em; height: .6em; border-radius: 50%; background: #5fd38d;
    align-self: center; animation: gg-blink 1s steps(2) infinite; }
  @keyframes gg-blink { 50% { opacity: .2; } }

  /* Dust kicked up by the cat's feet, and the truck's exhaust (world effects) */
  .gg-puff { position: absolute; width: 14px; height: 14px; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle, rgba(225, 215, 200, .75), rgba(225, 215, 200, 0) 70%); z-index: 0; }
  .gg-puff.smoke { width: 22px; height: 22px;
    background: radial-gradient(circle, rgba(170, 170, 180, .8), rgba(170, 170, 180, 0) 70%); }
  .gg-puff.spark { width: 10px; height: 10px;
    background: radial-gradient(circle, #fff7c2, #f5c142 40%, rgba(245, 193, 66, 0) 70%); }
  .gg-flying { filter: drop-shadow(0 0 6px #f5c142) drop-shadow(0 0 14px rgba(245, 193, 66, .6)) !important; }
  /* A magic bolt that flies from the wand to its target */
  .gg-bolt { position: absolute; left: 0; top: 0; width: 14px; height: 14px; margin: -7px 0 0 -7px;
    border-radius: 50%; pointer-events: none; z-index: 3; background: #e9fdff;
    box-shadow: 0 0 6px 3px var(--c), 0 0 18px 8px var(--c); }
  .gg-gps.flash { animation: gg-gps-flash .5s ease-out; }

  /* The separate wand (wand-*.svg), attached to the cat's hand */
  .gg-wand #wand-glow { transition: opacity .25s; }
  .gg-wand.is-on #wand-glow { opacity: 1; }
  .gg-wand #wand-moon { animation: gg-rock 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .gg-wand.is-on #wand-moon { animation-duration: .8s; }
  .gg-wand.is-on #wand-gem { animation: gg-gem .55s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .gg-wand #wand-orbit { animation: gg-blink 1.8s ease-in-out infinite; }
  @keyframes gg-rock { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
  @keyframes gg-gem { 50% { transform: scale(1.35); } }
  /* Effects layer over the screen (the spark ring) */
  .gg-fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; overflow: visible; }
  @keyframes gg-gps-flash { from { box-shadow: 0 0 0 0 #5fc3cf, 0 0 30px 12px #5fc3cf; } }
  .gg-gps-url.typing::after { content: "▌"; animation: gg-blink .6s steps(2) infinite; }

  @media (prefers-reduced-motion: reduce) {
    .gg-track { transition-duration: 1ms; }
    .gg-truck .gg-truck-art, .gg-truck:not(.is-driving) .gg-truck-art, .gg-truck .gg-wheel, .gg-gps-dot { animation: none !important; }
    .gg-puff { display: none; }
    .gg-wand #wand-moon, .gg-wand #wand-gem { animation: none !important; }
    .gg-stage > * { animation: none !important; }
  }
`;

// Placeholder truck, used until S1 uploads scenes/truck.svg. Faces right; flat bed on the left.
const PLACEHOLDER_TRUCK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 170" aria-hidden="true" data-placeholder="truck">
  <rect x="8" y="104" width="190" height="16" rx="3" fill="#5b3a8c"/>
  <rect x="8" y="88" width="8" height="18" fill="#5b3a8c"/>
  <rect x="190" y="88" width="8" height="18" fill="#5b3a8c"/>
  <path d="M198 120 V58 Q198 46 210 46 H262 Q274 46 280 58 L304 92 Q310 100 310 110 V120 Z" fill="#f28c28"/>
  <path d="M214 58 H258 Q264 58 268 64 L286 90 H214 Z" fill="#cfeef3" stroke="#3b1f5c" stroke-width="3"/>
  <rect x="290" y="104" width="18" height="8" rx="2" fill="#fff3c4"/>
  <rect x="8" y="118" width="304" height="10" rx="4" fill="#3b1f5c"/>
  <g class="gg-wheel"><circle cx="70" cy="136" r="22" fill="#1d2127"/><circle cx="70" cy="136" r="9" fill="#9aa5b3"/>
    <rect x="68" y="116" width="4" height="12" fill="#9aa5b3"/></g>
  <g class="gg-wheel"><circle cx="252" cy="136" r="22" fill="#1d2127"/><circle cx="252" cy="136" r="9" fill="#9aa5b3"/>
    <rect x="250" y="116" width="4" height="12" fill="#9aa5b3"/></g>
</svg>`;

// Inject the CSS only once, even if createScenes is called several times
function injectCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Load S1's truck SVG inline (so its wheels can spin), or fall back to the placeholder
async function loadTruckArt(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg || doc.querySelector('parsererror')) throw new Error('not an SVG');
    svg.querySelectorAll('script').forEach((s) => s.remove());
    // Any part S1 named "wheel" (id or class) will spin while driving
    svg.querySelectorAll('[id*="wheel" i], [class*="wheel" i]').forEach((w) => w.classList.add('gg-wheel'));
    return document.importNode(svg, true);
  } catch {
    return new DOMParser().parseFromString(PLACEHOLDER_TRUCK, 'image/svg+xml').documentElement;
  }
}

// A small puff (dust or smoke) that drifts and fades. x, y are pixels inside host.
function puff(host, x, y, { dx = -30, dy = -18, smoke = false, spark = false, ms = 700 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = document.createElement('div');
  p.className = 'gg-puff' + (smoke ? ' smoke' : '') + (spark ? ' spark' : '');
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  host.appendChild(p);
  p.animate([
    { transform: 'translate(-50%, -50%) scale(.4)', opacity: .9 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.6)`, opacity: 0 }
  ], { duration: ms, easing: 'ease-out' }).finished.then(() => p.remove(), () => p.remove());
}

// Wait for a Web Animation, but never hang if the browser skips it
function finished(anim, ms) {
  return Promise.race([anim.finished.catch(() => {}), new Promise((r) => setTimeout(r, ms + 300))]);
}

// ---- The wand ----
// Loads wand.svg and attaches it to the cat's free hand (#arm-free, the raised paw), so it moves with the arm.
// C1's built-in staff and glow layer are hidden at runtime (their file is not changed).
// The wand has its own pivot at the grip, so it can sway, swirl, and aim at things.
const SVG_NS = 'http://www.w3.org/2000/svg';
// Which paw holds the wand (part names and positions from cat.svg). The free paw is on the
// cat's right, already raised, so the wand points outward toward the box and the truck.
const HAND = {
  arm: 'arm-free', paw: 'arm-free-hand', x: 278, y: 222, // the paw's position in cat.svg
  rest: 14,             // degrees: leaning slightly outward while idle
  min: -40, max: 80,    // how far the wand may turn, so it never sweeps across the cat
  raise: -28            // how much the arm lifts while casting
};
export async function equipWand(cat, src = 'cat/wand.svg') {
  if (!cat) return null;
  await cat.ready;
  const svg = cat.svg || cat.el.querySelector('svg');
  const arm = svg && svg.querySelector('#' + HAND.arm);
  if (!arm) return null;
  if (cat._ggWand) cat._ggWand.remove();

  // A cat drawn with its own wand (cat/cat.svg has #wand-pose in the raised paw): just use it
  const builtInPose = svg.querySelector('#wand-pose');
  if (builtInPose) return controlWand(cat, svg.querySelector('#wand-mount'), builtInPose, () => {}, () => {});

  const res = await fetch(src);
  if (!res.ok) throw new Error(`equipWand: could not load ${src}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
  const art = doc.querySelector('#wand');
  if (!art) throw new Error(`equipWand: ${src} has no #wand group`);

  const hidden = ['staff', 'glow'].map((id) => svg.querySelector('#' + id)).filter(Boolean);
  hidden.forEach((h) => { h.style.display = 'none'; });

  // The wand is drawn on the TOP layer of the cat (so it is never hidden behind the head or body),
  // and every frame it is moved to wherever the hand is, including while the arm is raised.
  const top = document.createElementNS(SVG_NS, 'g');       // follows the arm
  top.setAttribute('class', 'gg-wand-layer');
  const mount = document.createElementNS(SVG_NS, 'g');     // the grip, at the hand in cat.svg
  mount.setAttribute('class', 'gg-wand');
  mount.setAttribute('transform', `translate(${HAND.x} ${HAND.y}) scale(1.4)`);
  const pose = document.createElementNS(SVG_NS, 'g');      // the wand's own rotation
  pose.appendChild(document.importNode(art, true));
  mount.appendChild(pose);
  top.appendChild(mount);
  // The paw is drawn again over the grip, so the cat still looks like it's holding the wand
  const paw = svg.querySelector('#' + HAND.paw);
  if (paw) {
    const pawCopy = document.createElementNS(SVG_NS, 'use');
    pawCopy.setAttribute('href', '#' + HAND.paw);
    top.appendChild(pawCopy);
  }
  svg.appendChild(top);
  const followArm = () => {
    const a = arm.getScreenCTM(), r = svg.getScreenCTM();
    if (!a || !r) return;
    const m = r.inverse().multiply(a); // the arm's position inside the cat drawing
    top.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
  };

  return controlWand(cat, mount, pose, followArm, () => {
    top.remove();
    hidden.forEach((h) => { h.style.display = ''; });
  });
}

// Sways, swirls and aims a wand: mount = the grip group, pose = the group that rotates.
// follow() runs every frame before drawing; cleanup() runs when the wand is removed.
function controlWand(cat, mount, pose, follow, cleanup) {
  mount.classList.add('gg-wand');
  const gem = mount.querySelector('#wand-gem') || mount;
  let angle = HAND.rest;
  let mode = 'idle'; // idle · tween · aim
  let aimTarget = null;
  let tween = null;
  const t0 = performance.now();
  const set = (a) => { angle = a; pose.setAttribute('transform', `rotate(${a.toFixed(2)})`); };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // The angle (in the wand's own frame) that makes the tip point at a screen point
  function angleTo(x, y) {
    const m = mount.getScreenCTM();
    if (!m) return angle;
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    let a = (Math.atan2(p.y, p.x) * 180) / Math.PI + 90;
    if (a > 180) a -= 360;
    return Math.max(HAND.min, Math.min(HAND.max, a)); // stay on the outer side, clear of the body
  }

  let alive = true;
  (function frame(now) {
    if (!alive) return;
    follow();
    if (mode === 'idle') {
      set(HAND.rest + Math.sin((now - t0) / 700) * 3.5); // a lazy sway
    } else if (mode === 'tween' && tween) {
      const k = Math.min(1, (now - tween.start) / tween.ms);
      set(tween.from + (tween.to - tween.from) * ease(k));
      if (k >= 1) { const done = tween.done; tween = null; mode = 'hold'; done(); }
    } else if (mode === 'aim' && aimTarget) {
      const r = aimTarget.getBoundingClientRect();
      const want = angleTo(r.left + r.width / 2, r.top + r.height / 2);
      set(angle + (want - angle) * 0.2); // follow smoothly
    }
    requestAnimationFrame(frame);
  })(t0);

  const wand = {
    el: mount,
    arm: HAND.arm, raise: HAND.raise, // which arm to lift while casting, and by how much
    gem,
    tweenTo(to, ms = 300) {
      return new Promise((done) => { mode = 'tween'; tween = { from: angle, to, ms, start: performance.now(), done }; });
    },
    async swirl() { // a quick flourish before a spell
      await wand.tweenTo(62, 220);
      await wand.tweenTo(-25, 260);
      await wand.tweenTo(30, 200);
    },
    aimAt(el) { aimTarget = el; mode = 'aim'; },
    async rest() { aimTarget = null; await wand.tweenTo(HAND.rest, 320); mode = 'idle'; },
    setSpell(color) {
      if (color) mount.style.setProperty('--spell', color);
      else mount.style.removeProperty('--spell');
      mount.classList.toggle('is-on', !!color);
    },
    remove() {
      alive = false;
      cleanup();
      pose.setAttribute('transform', `rotate(${HAND.rest})`);
      mount.classList.remove('is-on');
      delete cat._ggWand;
    }
  };
  cat._ggWand = wand;
  return wand;
}

// ---- Expressions that react to what the cat is doing ----
// After `after` ms with nothing happening the idle cat dozes off (mood "lazy"); any walk, spell,
// click or key press wakes it up. Moods are the ones C1 drew in cat.svg.
export function enableDozing(cat, { after = 10000 } = {}) {
  const svgOf = () => cat && (cat.svg || (cat.el && cat.el.querySelector('svg')));
  let timer = null;
  const doze = () => { const s = svgOf(); if (s && s.dataset.mood === 'idle') s.dataset.mood = 'lazy'; };
  const poke = () => { clearTimeout(timer); timer = setTimeout(doze, after); };
  const wake = () => { const s = svgOf(); if (s && s.dataset.mood === 'lazy') s.dataset.mood = 'idle'; poke(); };
  cat._ggWake = wake;   // something is happening: open the eyes and restart the timer
  cat._ggPoke = poke;   // just restart the timer
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, wake));
  poke();
  return {
    wake,
    stop() {
      clearTimeout(timer);
      ['pointerdown', 'keydown'].forEach((ev) => document.removeEventListener(ev, wake));
      delete cat._ggWake; delete cat._ggPoke;
    }
  };
}

// stations: array of { id, title, background } — or leave it out to load data/lessons.json
// options.background: one long image stretched across the whole strip (optional)
// options.truckSrc:   path to the truck SVG (default scenes/truck.svg)
export function createScenes(container, stations, options = {}) {
  injectCSS();

  const screen = document.createElement('div');
  screen.className = 'gg-screen';
  const track = document.createElement('div');
  track.className = 'gg-track';
  screen.appendChild(track);

  // One shared stage that does NOT scroll: the cat and box stay on screen
  const stageEl = document.createElement('div');
  stageEl.className = 'gg-stage';
  screen.appendChild(stageEl);
  container.appendChild(screen);

  // Effects layer (spark rings) drawn above everything, in screen pixels
  const fx = document.createElementNS(SVG_NS, 'svg');
  fx.setAttribute('class', 'gg-fx');
  screen.appendChild(fx);
  const local = (el) => {
    const sc = screen.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - sc.left, y: r.top + r.height / 2 - sc.top };
  };
  // A ring of light bursting out of an element (the wand's gem)
  function ring(atEl, color) {
    const { x, y } = local(atEl);
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4);
    c.setAttribute('fill', 'none'); c.style.stroke = color; c.style.strokeWidth = 3;
    fx.appendChild(c);
    c.animate([{ r: '4px', opacity: 1 }, { r: '34px', opacity: 0 }], { duration: 550, easing: 'ease-out' })
      .finished.then(() => c.remove(), () => c.remove());
  }

  // Ground shadows: every element put on the stage (cat, box...) gets one that follows it
  const shadows = new Map(); // element -> shadow
  function syncShadows() {
    for (const child of stageEl.children) {
      if (child.classList.contains('gg-shadow') || child.classList.contains('gg-puff')) continue;
      if (!shadows.has(child)) {
        const sh = document.createElement('div');
        sh.className = 'gg-shadow';
        stageEl.prepend(sh);
        shadows.set(child, sh);
      }
    }
    for (const [child, sh] of shadows) {
      if (child.parentNode !== stageEl) { sh.remove(); shadows.delete(child); }
    }
  }
  new MutationObserver(syncShadows).observe(stageEl, { childList: true });
  (function follow() {
    if (!screen.isConnected) return; // stop when the scenes are removed
    const s = stageEl.getBoundingClientRect();
    for (const [child, sh] of shadows) {
      const r = child.getBoundingClientRect();
      // the art usually has a little empty space at the bottom, so lift the shadow slightly
      const w = r.width * 0.72;
      const h = Math.max(6, r.width * 0.12);
      sh.style.width = `${w}px`;
      sh.style.height = `${h}px`;
      sh.style.transform = `translate(${r.left - s.left + (r.width - w) / 2}px, ${r.bottom - s.top - h * 0.75}px)`;
      sh.style.opacity = r.width ? 1 : 0;
    }
    requestAnimationFrame(follow);
  })();

  let list = [];
  const sections = [];
  let index = 0;

  function build(data) {
    list = [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const n = Math.max(list.length, 1);
    track.style.width = `${n * 100}%`; // n screens wide
    if (options.background) track.style.backgroundImage = `url("${options.background}")`;
    list.forEach((station) => {
      const section = document.createElement('section');
      section.className = 'gg-station';
      section.dataset.station = station.id || '';
      section.style.flex = `0 0 ${100 / n}%`; // each section is one screen wide
      if (station.background) section.style.backgroundImage = `url("${station.background}")`;
      const title = document.createElement('div');
      title.className = 'gg-title';
      title.textContent = station.title || ''; // textContent, not innerHTML
      section.appendChild(title);
      track.appendChild(section);
      sections.push(section);
    });
  }

  // Contract: createScenes(container) loads the stations itself
  const ready = Array.isArray(stations)
    ? Promise.resolve(build(stations))
    : fetch(options.lessonsSrc || 'data/lessons.json')
        .then((r) => r.json())
        .then((d) => build(d.stations || []));

  // Accepts a number (0, 1, 2), a station id ('backyard') or a title ('The Back Yard')
  function indexOf(ref) {
    if (typeof ref === 'number') return ref;
    const i = list.findIndex((s) => s.id === ref || s.title === ref);
    if (i === -1) console.warn(`scenes: no station called "${ref}"`);
    return i;
  }

  // Scroll the strip, and resolve only when the scroll has finished
  function goTo(ref) {
    const i = indexOf(ref);
    if (typeof ref !== 'number' && i < 0) return Promise.resolve(index); // unknown name: stay put
    const target = Math.max(0, Math.min(list.length - 1, i)); // never past the ends
    if (target === index) return Promise.resolve(index);
    index = target;
    return new Promise((resolve) => {
      const done = (e) => {
        // ignore transitionend events bubbling up from children (cat, box, truck...)
        if (e && e.target !== track) return;
        clearTimeout(fallback);
        track.removeEventListener('transitionend', done);
        resolve(index);
      };
      const fallback = setTimeout(done, DURATION + 500); // in case transitionend never fires
      track.addEventListener('transitionend', done);
      track.style.transform = `translateX(${(-100 / list.length) * index}%)`;
    });
  }

  // The cat walks while the world scrolls past, kicking up a little dust.
  // Uses only C1's public cat API; if C1 adds cat.walkInPlace(dir), it is used instead.
  async function travel(ref, cat, ...companions) {
    const i = indexOf(ref);
    if (typeof ref !== 'number' && i < 0) return index;
    const target = Math.max(0, Math.min(list.length - 1, i));
    if (!cat || target === index) return goTo(target);
    const dir = target > index ? 1 : -1;
    if (cat._ggWake) cat._ggWake();

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // Going back: the cat turns around first and takes a beat before walking
    if (dir < 0) {
      cat.el.classList.add('face-left');
      await wait(220);
    }
    // Companions (the box) hop along with each step, so nothing just slides with the scroll
    const hops = companions.filter(Boolean).map((el, k) => el.animate([
      { transform: 'translateY(0) rotate(0deg)' },
      { transform: `translateY(-7%) rotate(${dir * -3}deg)`, offset: 0.4 },
      { transform: 'translateY(0) rotate(0deg)', offset: 0.75 },
      { transform: 'translateY(0) rotate(0deg)' }
    ], { duration: 520, iterations: Infinity, delay: k * 90, easing: 'ease-in-out' }));

    if (typeof cat.walkInPlace === 'function') cat.walkInPlace(dir);
    else {
      cat.el.classList.add('is-walking');
      cat.el.classList.remove('is-idle');
    }

    // Dust at the cat's back foot every few steps
    const dust = setInterval(() => {
      const s = stageEl.getBoundingClientRect();
      const c = cat.el.getBoundingClientRect();
      const footX = (dir > 0 ? c.left + c.width * 0.3 : c.right - c.width * 0.3) - s.left;
      puff(stageEl, footX, c.bottom - s.top - 6, { dx: -dir * 36, dy: -14 });
    }, 220);

    const arrived = await goTo(target);
    clearInterval(dust);
    hops.forEach((a) => a.cancel());
    cat.idle();
    // After walking back, it stands for a moment, then turns to face the box again
    if (dir < 0) {
      await wait(450);
      cat.el.classList.remove('face-left');
    }
    if (cat._ggPoke) cat._ggPoke();
    return arrived;
  }

  // ---- The truck (stations 8 and 9) ----
  function addTruck(ref, truckOptions = {}) {
    const i = Math.max(0, indexOf(ref));
    const el = document.createElement('div');
    el.className = 'gg-truck';
    const art = document.createElement('div');
    art.className = 'gg-truck-art';
    const bed = document.createElement('div');
    bed.className = 'gg-truck-bed';

    const gps = document.createElement('div');
    gps.className = 'gg-gps';
    gps.hidden = true;
    // Learner-facing text comes from lessons.json (team rule), so the label is passed in, not written here
    gps.innerHTML = '<span class="gg-gps-head"><span class="gg-gps-label"></span><span class="gg-gps-dot"></span></span>';
    gps.querySelector('.gg-gps-label').textContent = truckOptions.gpsLabel || '';
    const gpsUrl = document.createElement('span');
    gpsUrl.className = 'gg-gps-url';
    gps.appendChild(gpsUrl);

    const truckShadow = document.createElement('div');
    truckShadow.className = 'gg-truck-shadow';
    el.append(truckShadow, gps, art, bed);
    (sections[i] || sections[sections.length - 1]).appendChild(el);

    const artReady = loadTruckArt(truckOptions.src || options.truckSrc || DEFAULT_TRUCK_SRC)
      .then((svg) => art.appendChild(svg));

    let cargo = null; // { el, parent, next, width }

    // A small puff of exhaust now and then while the engine idles
    function exhaust(opts) {
      const host = el.parentNode;
      const h = host.getBoundingClientRect();
      const t = art.getBoundingClientRect();
      if (!t.width) return;
      puff(host, t.left - h.left + t.width * 0.02, t.top - h.top + t.height * 0.72, opts);
    }
    let idleSmoke = null;
    const startIdle = () => {
      clearInterval(idleSmoke);
      idleSmoke = setInterval(() => exhaust({ dx: -22, dy: -16, smoke: true, ms: 1100 }), 1600);
    };
    const stopIdle = () => clearInterval(idleSmoke);
    artReady.then(startIdle);

    // Show the remote link on the GPS screen, typed in like a real navigator ('' hides it).
    // With { caster: cat } the cat casts a cyan spell from its wand that switches the GPS on.
    let typing = 0;
    async function setGPS(url, { caster } = {}) {
      const text = String(url || '').replace(/^https?:\/\//, '');
      const run = ++typing;
      gpsUrl.textContent = '';
      if (!url) { gps.hidden = true; return; }
      let spell = null, ups = [];
      if (caster) {
        await artReady;
        gps.hidden = true;
        spell = spellOn(caster, CYAN);
        ups = wandUp(spell);
        if (spell.wand) {
          await spell.wand.swirl();            // a flourish…
          spell.wand.aimAt(gps);               // …then point at the truck
          await new Promise((r) => setTimeout(r, 260));
          ring(spell.source, CYAN);
        } else {
          await new Promise((r) => setTimeout(r, 450));
        }
        await bolt(spell, gps, CYAN);
        gps.classList.remove('flash');
        void gps.offsetWidth; // restart the flash animation
        gps.classList.add('flash');
      }
      gps.hidden = false;
      const done = async () => {
        if (!spell) return;
        if (spell.wand) spell.wand.rest();
        await wandDown(spell, ups);
        spell.stop();
      };
      if (run !== typing) return done();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { gpsUrl.textContent = text; return done(); }
      gpsUrl.classList.add('typing');
      for (const ch of text) {
        if (run !== typing) break; // a newer call took over
        gpsUrl.textContent += ch;
        await new Promise((r) => setTimeout(r, 28));
      }
      gpsUrl.classList.remove('typing');
      await done(); // the wand comes down once the link is in
    }

    // Levitation timing, shared by the wand and the box so they move together:
    // 0 → RISE the box lifts straight up · RISE → GLIDE it floats over the truck · GLIDE → 1 it lowers
    const RISE = 0.32, GLIDE = 0.68, LEVITATE_MS = 2200;
    const GOLD = '#f5c142', CYAN = '#5fc3cf';

    // Starts a spell: the wand's gem glows in `color`, the hat floats up a little and glows,
    // the cat trembles slightly from the effort and gets a soft aura. Returns stop().
    function spellOn(cat, color) {
      const svg = cat && (cat.svg || cat.el.querySelector('svg'));
      if (!svg) return { svg: null, part: () => null, stop() {} };
      const part = (id) => (cat.part ? cat.part(id) : svg.querySelector('#' + id));
      const wand = cat._ggWand || null;
      // Wakes the cat first if it was dozing
      if (cat._ggWake) cat._ggWake();
      // The hat floats up off the head and glows in the spell's colour
      const hat = part('hat');
      const hatGlow = `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color})`;
      const hatUp = hat && hat.animate([
        { transform: 'translateY(0)', filter: 'none' },
        { transform: 'translateY(-10px)', filter: hatGlow }
      ], { duration: 380, easing: 'cubic-bezier(.3, 1.4, .6, 1)', fill: 'forwards' });
      const hatBob = hat && hat.animate([{ translate: '0 0' }, { translate: '0 -2px' }, { translate: '0 0' }],
        { duration: 900, delay: 380, iterations: Infinity, easing: 'ease-in-out' });
      if (wand) wand.setSpell(color);
      const orbs = wand ? [] : ['staff-orb', 'staff-orb-ring'].map(part).filter(Boolean);
      const saved = orbs.map((o) => o.getAttribute('style'));
      orbs.forEach((o) => {
        o.style.fill = o.id === 'staff-orb' ? color : 'none';
        o.style.stroke = o.id === 'staff-orb-ring' ? color : '';
        o.style.filter = `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color})`;
      });
      const pulse = orbs[0] && orbs[0].animate([{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }],
        { duration: 500, iterations: Infinity });
      // A slight tremble from the strain of holding the spell
      const tremble = svg.animate([
        { transform: 'translate(0, 0) rotate(0deg)' },
        { transform: 'translate(-0.5px, 0.25px) rotate(-0.3deg)' },
        { transform: 'translate(0.4px, -0.2px) rotate(0.25deg)' },
        { transform: 'translate(0, 0) rotate(0deg)' }
      ], { duration: 340, iterations: Infinity });
      // A soft aura around the whole cat, in the spell's colour, pulsing gently
      const aura = svg.animate([
        { filter: `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 8px ${color}55)` },
        { filter: `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 14px ${color}88)` },
        { filter: `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 8px ${color}55)` }
      ], { duration: 900, iterations: Infinity });
      return {
        svg, part, wand,
        source: wand ? wand.gem : part('staff-orb'), // where spells come out of
        stop() {
          if (wand) wand.setSpell(null);
          if (hat) {
            hatBob.cancel();
            hat.animate([
              { transform: 'translateY(-10px)', filter: hatGlow },
              { transform: 'translateY(0)', filter: 'none' }
            ], { duration: 320, easing: 'ease-in' });
            hatUp.cancel();
          }
          if (cat._ggPoke) cat._ggPoke();
          if (pulse) pulse.cancel();
          tremble.cancel();
          aura.cancel();
          orbs.forEach((o, k) => (saved[k] == null ? o.removeAttribute('style') : o.setAttribute('style', saved[k])));
        }
      };
    }

    // The arm holding the wand: the new wand's paw, or C1's staff arm without it
    const armOf = (spell) => (spell.wand ? spell.wand.arm : 'arm-staff');
    const liftOf = (spell) => (spell.wand ? spell.wand.raise : 50);

    // Raise the wand (fill: forwards keeps it up) or bring it back down
    function wandUp(spell, ms = 450) {
      const ease = 'ease-out';
      return [
        spell.part(armOf(spell))?.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${liftOf(spell)}deg)` }],
          { duration: ms, easing: ease, fill: 'forwards' }),
        spell.part('staff')?.animate([{ transform: 'translate(0px, 0px)' }, { transform: 'translate(9px, -35px) rotate(6deg)' }],
          { duration: ms, easing: ease, fill: 'forwards' })
      ].filter(Boolean);
    }
    async function wandDown(spell, ups, ms = 350) {
      const downs = [
        spell.part(armOf(spell))?.animate([{ transform: `rotate(${liftOf(spell)}deg)` }, { transform: 'rotate(0deg)' }],
          { duration: ms, easing: 'ease-in-out' }),
        spell.part('staff')?.animate([{ transform: 'translate(9px, -35px) rotate(6deg)' }, { transform: 'translate(0px, 0px)' }],
          { duration: ms, easing: 'ease-in-out' })
      ].filter(Boolean);
      ups.forEach((a) => a.cancel());
      await Promise.all(downs.map((a) => finished(a, ms)));
    }

    // A glowing bolt flies along an arc from the wand's orb to a target element
    async function bolt(spell, target, color) {
      const orb = spell.source;
      if (!orb || !target) return;
      const sc = screen.getBoundingClientRect();
      const o = orb.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const x0 = o.left + o.width / 2 - sc.left, y0 = o.top + o.height / 2 - sc.top;
      const x1 = t.left + t.width / 2 - sc.left, y1 = t.top + t.height / 2 - sc.top;
      const b = document.createElement('div');
      b.className = 'gg-bolt';
      b.style.setProperty('--c', color);
      screen.appendChild(b);
      const peak = Math.min(y0, y1) - sc.height * 0.12;
      await finished(b.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${(x0 + x1) / 2}px, ${peak}px) scale(1.15)`, offset: 0.55 },
        { transform: `translate(${x1}px, ${y1}px) scale(.6)`, opacity: 0.9 }
      ], { duration: 650, easing: 'ease-in-out' }), 650);
      b.remove();
    }

    // The wand raises with the box, follows it, and lowers with it (gold spell)
    function levitateWand(cat, boxEl) {
      const spell = spellOn(cat, GOLD);
      if (!spell.svg) return () => {};
      if (spell.wand) {
        spell.wand.aimAt(boxEl); // the wand keeps pointing at the box
        ring(spell.source, GOLD);
      }
      const ease = 'ease-in-out';
      const anims = [];
      const arm = spell.part(armOf(spell));
      const up = liftOf(spell);
      const staff = spell.part('staff');
      if (arm) anims.push(arm.animate([
        { transform: 'rotate(0deg)', easing: ease },
        { transform: `rotate(${up}deg)`, offset: RISE, easing: ease },          // raise the wand
        { transform: `rotate(${up * 0.88}deg)`, offset: GLIDE, easing: ease },  // hold it up while the box glides
        { transform: 'rotate(0deg)' }                                 // lower it with the box
      ], { duration: LEVITATE_MS }));
      if (staff) anims.push(staff.animate([
        { transform: 'translate(0px, 0px) rotate(0deg)', easing: ease },
        { transform: 'translate(9px, -35px) rotate(0deg)', offset: RISE, easing: ease },
        { transform: 'translate(8px, -31px) rotate(9deg)', offset: GLIDE, easing: ease }, // points after the box
        { transform: 'translate(0px, 0px) rotate(0deg)' }
      ], { duration: LEVITATE_MS }));
      return () => {
        if (spell.wand) spell.wand.rest();
        anims.forEach((a) => a.cancel());
        spell.stop();
      };
    }

    // The box goes from the stage onto the truck bed.
    // With { caster: cat } the cat raises the box with its wand, floats it over, and lowers it in.
    async function load(boxEl, { caster } = {}) {
      await artReady;
      if (!boxEl) return;

      const from = boxEl.getBoundingClientRect();
      cargo = { el: boxEl, parent: boxEl.parentNode, next: boxEl.nextSibling, width: boxEl.style.width };
      boxEl.style.width = `${Math.min(from.width, bed.getBoundingClientRect().width * 0.7)}px`;
      bed.appendChild(boxEl);
      const to = boxEl.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      const s = from.width / to.width;

      let anim;
      let endSpell = () => {};
      if (caster) {
        endSpell = levitateWand(caster, boxEl);
        boxEl.classList.add('gg-flying'); // glows only while it's floating
        const lift = from.height * 1.4;   // how high the wand raises it
        const ease = 'ease-in-out';
        anim = boxEl.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, easing: ease },
          { transform: `translate(${dx}px, ${dy - lift}px) scale(${s})`, offset: RISE, easing: ease },
          { transform: `translate(0px, ${-to.height * 1.3}px) scale(1)`, offset: GLIDE, easing: ease },
          { transform: 'none' }
        ], { duration: LEVITATE_MS });
        await finished(anim, LEVITATE_MS);
        boxEl.classList.remove('gg-flying');
        endSpell();
      } else {
        anim = boxEl.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
          { transform: `translate(${dx / 2}px, ${dy / 2 - to.height}px) scale(${(s + 1) / 2})`, offset: 0.5 },
          { transform: 'none' }
        ], { duration: 900, easing: 'ease-in-out' });
        await finished(anim, 900);
      }

      // The truck dips a little as the box settles on it
      await finished(art.animate([
        { transform: 'none' }, { transform: 'translateY(4px)' }, { transform: 'translateY(-1px)' }, { transform: 'none' }
      ], { duration: 380, easing: 'ease-out' }), 380);
    }

    // Drive off the right edge of the screen, then resolve
    async function drive() {
      await artReady;
      stopIdle();
      el.classList.add('is-driving');
      // Exhaust smoke from the back of the truck
      const smoke = setInterval(() => exhaust({ dx: -40, dy: -22, smoke: true, ms: 900 }), 120);
      const anim = el.animate([
        { transform: 'none' },
        { transform: 'translateX(-4%)', offset: 0.15 }, // small lean back as it starts
        { transform: 'translateX(160%)' }
      ], { duration: 2200, easing: 'cubic-bezier(.5, 0, .9, .6)', fill: 'forwards' });
      await finished(anim, 2200);
      clearInterval(smoke);
      el.classList.remove('is-driving');
      el.dataset.gone = 'true';
    }

    // Put the truck back and return the box to where it was (to replay the lesson)
    function reset() {
      el.getAnimations().forEach((a) => a.cancel());
      art.getAnimations().forEach((a) => a.cancel());
      typing++;
      el.classList.remove('is-driving');
      delete el.dataset.gone;
      startIdle();
      if (cargo) {
        cargo.el.getAnimations().forEach((a) => a.cancel());
        cargo.el.style.width = cargo.width;
        cargo.parent.insertBefore(cargo.el, cargo.next && cargo.next.parentNode === cargo.parent ? cargo.next : null);
        cargo = null;
      }
    }

    // What the truck is doing now, e.g. to know which buttons make sense
    const state = () => ({
      station: i,
      gps: !gps.hidden,
      loaded: !!cargo,
      gone: el.dataset.gone === 'true'
    });

    return { el, ready: artReady, setGPS, load, drive, reset, state };
  }

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);
  const current = () => index;
  const stage = () => stageEl; // same stage for every station, so characters never leave the screen

  return { ready, goTo, travel, next, prev, current, stage, addTruck, stations: () => list };
}

export default createScenes;

// Still available as a global, for pages that don't use import yet
window.createScenes = createScenes;
window.equipWand = equipWand;
window.enableDozing = enableDozing;
