// cat.js — C1 (Cat Maker) · Sprint 2 · Issue-18
// This file creates the cat, makes it stand still or walk, then hands it to C2 to add skills.

// Where the cat picture is stored.
const DEFAULT_SVG = "cat/cat.svg";

// A name tag for our style, so we never add it twice.
const STYLE_ID = "cat-core-style";

// The cat's look and movements (CSS). JavaScript only switches labels; this does the animating.
const CORE_CSS = `
  /* The cat's box: sits at the bottom of the stage, 160px wide. */
  .cat { position: absolute; bottom: 0; left: 0; width: 160px; will-change: transform; }
  .cat svg { width: 100%; height: auto; display: block; overflow: visible; }

  /* Standing still: the body breathes and the tail sways. */
  .cat.is-idle  svg  { animation: cat-breathe 2.4s ease-in-out infinite; transform-origin: 50% 100%; }
  .cat.is-idle  #tail { animation: cat-tail 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 0% 100%; }

  /* Walking: the body bobs, the legs swing in opposite directions, the tail wags faster. */
  .cat.is-walking svg { animation: cat-bob .4s ease-in-out infinite; transform-origin: 50% 100%; }
  .cat.is-walking #leg-front { animation: cat-step .4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0%; }
  .cat.is-walking #leg-back  { animation: cat-step .4s ease-in-out infinite reverse; transform-box: fill-box; transform-origin: 50% 0%; }
  .cat.is-walking #tail { animation: cat-tail .8s ease-in-out infinite; transform-box: fill-box; transform-origin: 0% 100%; }

  /* Walking left: flip the cat like a mirror. */
  .cat.face-left svg { scale: -1 1; }

  /* The movements themselves: where each part starts, swings to, and returns. */
  @keyframes cat-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.03); } }
  @keyframes cat-tail    { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(8deg); } }
  @keyframes cat-bob     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes cat-step    { 0%,100% { transform: rotate(-14deg); } 50% { transform: rotate(14deg); } }

  /* If the user turned on "reduce motion" on their device, stop the animations. */
  @media (prefers-reduced-motion: reduce) {
    .cat svg, .cat #tail, .cat #leg-front, .cat #leg-back { animation: none !important; }
  }
`;

// Adds the cat's CSS to the page (only once).
function injectCoreStyle() {
  if (document.getElementById(STYLE_ID)) return; // already added? do nothing
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CORE_CSS;
  document.head.appendChild(style);
}

// Loads the cat picture and puts it INSIDE the page (not as a flat image),
// so its parts (tail, legs…) can be moved separately.
async function loadSvg(url) {
  const res = await fetch(url); // download the file
  if (!res.ok) throw new Error(`createCat: could not load ${url} (${res.status})`); // file missing
  const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml"); // read it as a picture
  const svg = doc.querySelector("svg");
  if (!svg || doc.querySelector("parsererror")) throw new Error(`createCat: ${url} is not a valid SVG`); // broken file
  svg.querySelectorAll("script").forEach((s) => s.remove()); // safety: remove any hidden code
  return document.importNode(svg, true); // make it ready to place on our page
}

// The main function. Other teams call this to get a cat.
// stage   = the area the cat lives in
// options = optional settings (picture path, start position, speed, C2's addSkills)
export function createCat(stage, options = {}) {
  if (!stage) throw new Error("createCat: a stage element is required"); // no stage, no cat

  // Settings, with default values if nobody gives them.
  const { svgUrl = DEFAULT_SVG, x = 40, speed = 120 } = options;

  injectCoreStyle(); // add the cat's CSS

  // Make an empty box for the cat and put it on the stage.
  const el = document.createElement("div");
  el.className = "cat";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "القط"); // screen readers say "the cat"
  stage.appendChild(el);

  let posX = x;          // where the cat stands now (pixels from the left)
  let walkAnim = null;   // the current walk, if the cat is walking
  el.style.transform = `translateX(${posX}px)`; // place the cat at its start

  // Switches the cat's label: "idle" or "walking". CSS reacts to the label.
  function setState(state) {
    el.classList.toggle("is-idle", state === "idle");
    el.classList.toggle("is-walking", state === "walking");
    cat.state = state;
  }

  // The cat itself: what other teams can use.
  const cat = {
    el,               // the cat's box on the page
    svg: null,        // the picture (filled in after it loads)
    state: "loading", // what the cat is doing now

    // Stand still and breathe.
    idle() {
      if (walkAnim) { walkAnim.cancel(); walkAnim = null; } // stop walking if walking
      el.style.transform = `translateX(${posX}px)`;          // stay in place
      setState("idle");
      return cat;
    },

    // Walk to a spot (in pixels). With no spot, walk to the right edge.
    // Others can "await" it to wait until the cat arrives.
    walk(toX) {
      const maxX = Math.max(0, stage.clientWidth - el.offsetWidth); // farthest spot inside the stage
      const target = Math.min(maxX, Math.max(0, toX ?? maxX));      // keep the spot inside the stage
      if (walkAnim) walkAnim.cancel();                              // cancel an older walk
      el.classList.toggle("face-left", target < posX);              // face the right way
      setState("walking");
      const duration = (Math.abs(target - posX) / speed) * 1000;    // time = distance ÷ speed
      walkAnim = el.animate(                                        // slide from here to there
        [{ transform: `translateX(${posX}px)` }, { transform: `translateX(${target}px)` }],
        { duration: Math.max(duration, 1), easing: "linear", fill: "forwards" }
      );
      const anim = walkAnim;
      return anim.finished.then(
        () => { if (walkAnim === anim) { posX = target; cat.idle(); } return cat; }, // arrived: stand still
        () => cat // walk was cancelled: that's fine, not an error
      );
    },

    // Stop right where the cat is, even halfway through a walk.
    stop() {
      if (walkAnim) {
        posX = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41; // read the cat's real position
      }
      return cat.idle();
    },

    // Get one part of the cat by name, e.g. cat.part("tail").
    part(id) {
      return cat.svg ? cat.svg.querySelector(`#${CSS.escape(id)}`) : null;
    },

    // Remove the cat from the page.
    destroy() {
      if (walkAnim) walkAnim.cancel();
      el.remove();
    },
  };

  // "ready" = the picture has finished loading. Then: show it, stand still, and hand the cat to C2.
  cat.ready = loadSvg(svgUrl).then((svg) => {
    el.appendChild(svg);
    cat.svg = svg;
    cat.idle();

    // C2's function that adds say/charge/spell to the cat.
    const addSkills = options.addSkills ?? globalThis.addSkills;
    if (typeof addSkills === "function") {
      addSkills(cat);
    } else {
      // C2's part isn't there yet: warn, but don't break.
      console.warn("createCat: addSkills not found yet — C2's skills (say/charge/spell) are not attached.");
    }
    return cat;
  });

  // If the picture fails to load: show a cat emoji so the lesson still works, and report the error.
  cat.ready.catch((err) => {
    console.error(err);
    el.textContent = "🐱";
    setState("error");
  });

  return cat; // give the cat back right away (the picture keeps loading in the background)
}

// Lets other files write: import createCat from "./cat/cat.js"
export default createCat;