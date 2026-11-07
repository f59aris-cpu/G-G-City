// scenes/scenes.js — S2: Transitions + The Screen
// A 16:9 screen over one long horizontal strip (side-scroller style, like a 2D Mario level).
// The strip scrolls behind; the cat and box stay on screen in one shared stage.
// Usage (S3): cat.walk(); await scenes.goTo(1); cat.idle();

(function () {
  const CSS_ID = 'gg-scenes-css';
  const DURATION = 1200; // ms, how long one scroll takes
  const CSS = `
    .gg-screen { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden;
      border-radius: 14px; background: #1e1d1a; direction: ltr; } /* ltr: page may be rtl */
    .gg-track { display: flex; height: 100%; background: left / 100% 100% no-repeat;
      transition: transform ${DURATION}ms cubic-bezier(.45, 0, .55, 1); }
    .gg-station { position: relative; height: 100%; background: center / cover no-repeat; }
    .gg-title { position: absolute; top: 12px; right: 16px; padding: 2px 12px;
      border-radius: 999px; background: rgba(0, 0, 0, .55); color: #fff;
      font: 600 14px system-ui, sans-serif; direction: rtl; z-index: 2; }
    .gg-stage { position: absolute; left: 0; right: 0; bottom: 0; height: 60%; z-index: 1;
      display: flex; align-items: flex-end; justify-content: center; gap: 24px;
      padding-bottom: 4%; box-sizing: border-box; pointer-events: none; }
    .gg-stage > * { pointer-events: auto; }
  `;

  // Inject the CSS only once, even if createScenes is called several times
  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // options.background (optional): one long image stretched across the whole strip
  function createScenes(container, stations, options = {}) {
    injectCSS();
    const n = stations.length;

    // The screen (window) and the track (one long strip behind it)
    const screen = document.createElement('div');
    screen.className = 'gg-screen';
    const track = document.createElement('div');
    track.className = 'gg-track';
    track.style.width = `${n * 100}%`; // n screens wide
    if (options.background) track.style.backgroundImage = `url("${options.background}")`;
    screen.appendChild(track);

    // One section of the strip per station, each with its title
    stations.forEach((station) => {
      const section = document.createElement('section');
      section.className = 'gg-station';
      section.style.flex = `0 0 ${100 / n}%`; // each section is one screen wide
      if (station.background) {
        section.style.backgroundImage = `url("${station.background}")`;
      }
      const title = document.createElement('div');
      title.className = 'gg-title';
      title.textContent = station.title || ''; // textContent, not innerHTML
      section.appendChild(title);
      track.appendChild(section);
    });

    // One shared stage that does NOT scroll: the cat and box stay on screen
    const stageEl = document.createElement('div');
    stageEl.className = 'gg-stage';
    screen.appendChild(stageEl);

    container.appendChild(screen);

    let index = 0;

    // Scroll the strip, and resolve only when the scroll has finished
    function goTo(i) {
      const target = Math.max(0, Math.min(n - 1, i)); // never past the ends
      if (target === index) return Promise.resolve(index);
      index = target;
      return new Promise((resolve) => {
        const done = (e) => {
          // ignore transitionend events bubbling up from children (cat, box, ...)
          if (e && e.target !== track) return;
          clearTimeout(fallback);
          track.removeEventListener('transitionend', done);
          resolve(index);
        };
        const fallback = setTimeout(done, DURATION + 500); // in case transitionend never fires
        track.addEventListener('transitionend', done);
        track.style.transform = `translateX(${(-100 / n) * index}%)`;
      });
    }

    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);
    const current = () => index;
    const stage = () => stageEl; // same stage for every station, so characters never leave the screen

    return { goTo, next, prev, current, stage };
  }

  window.createScenes = createScenes;
})();