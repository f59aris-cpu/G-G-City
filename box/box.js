// create TheBox ---
export function createBox(container, svgUrl = 'box.svg') {
  const el = document.createElement('div');
  el.className = 'gg-box';
  container.appendChild(el);

  let state = 'empty';
  let label = '';

  function render() {
    el.dataset.state = state;
    el.querySelectorAll('[data-show]').forEach(layer => {
      const allowedStates = layer.dataset.show.split(' ');
      layer.style.display = allowedStates.includes(state) ? '' : 'none';
    });
    const textEl = el.querySelector('#box-label');
    if (textEl) {
      textEl.textContent = label;
    }
  }

  const ready = fetch(svgUrl)
    .then(res => res.text())
    .then(svgText => {
      el.innerHTML = svgText;
      render();
    });

  return {
    el,
    ready,
    setState(newState) {
      state = newState;
      render();
    },
    setLabel(newText) {
      label = newText;
      render();
    }
  };
}


// checkCommand ---
const DEFAULT_MATCHING = { trim: true, collapseSpaces: true, caseSensitive: true };

function normalize(text, m) {
  let s = String(text);
  if (m.trim) s = s.trim();
  if (m.collapseSpaces) s = s.replace(/\s+/g, ' ');
  if (!m.caseSensitive) s = s.toLowerCase();
  return s;
}

export function checkCommand(input, lesson, matching = DEFAULT_MATCHING) {
  const n = t => normalize(t, matching);
  const typed = n(input);

  if (!typed) {
    return { ok: false, feedback: lesson.cat.hint };
  }

  if (lesson.accepted.some(a => n(a) === typed)) {
    return { ok: true, feedback: lesson.cat.success };
  }

  const mistake = (lesson.commonMistakes || []).find(m => n(m.input) === typed);
  return { ok: false, feedback: mistake ? mistake.feedback : lesson.cat.failure };
}

//  createing Command Box ---
export function createCommandBox(container, lesson, onResult, matching = DEFAULT_MATCHING) {
  const form = document.createElement('form');
  form.className = 'gg-command';
  form.dir = 'ltr';
  form.innerHTML = `
    <span class="gg-prompt">$</span>
    <input type="text" autocomplete="off" spellcheck="false" aria-label="Command">
    <button type="submit">Run</button>
  `;
  container.appendChild(form);

  const input = form.querySelector('input');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (input.disabled) return;

    const result = checkCommand(input.value, lesson, matching);
    input.disabled = true; 

    await onResult(result);

    if (!result.ok) {
      input.disabled = false;
      input.select();
    }
  });

  return {
    el: form,
    focus: () => input.focus()
  };
}