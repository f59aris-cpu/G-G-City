






































const SKILL_CSS = `
#cat-arm { transform-origin: top center; }

.is-charging #cat-arm { transform: rotate(-135deg); }
.is-charging { filter: drop-shadow(0 0 15px gold); }

.spell-ok { filter: drop-shadow(0 0 20px lime); }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.spell-fail {
  filter: drop-shadow(0 0 20px red);
  animation: shake 0.2s ease-in-out infinite;
}

.gg-cat { position: relative; }
.gg-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 2px solid #333;
  border-radius: 10px;
  background: white;
  padding: 10px;
  opacity: 0;
  transition: opacity 0.3s;
  white-space: pre-line;
}
.gg-bubble.show { opacity: 1; }
.gg-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
}
`;

function addSkills(cat) {
  // حقن CSS المهارات مرة واحدة تماماً كما حدث في C1
  if (!document.getElementById('skill-css')) {
    document.head.insertAdjacentHTML("beforeend", `<style id="skill-css">${SKILL_CSS}</style>`);
  }

  // المهمة 1+2: تشغيل الأنيميشن وإرجاع Promise
  function play(cls, ms) {
    return new Promise(resolve => {
      cat.el.classList.remove(cls);
      void cat.el.offsetWidth; // إجبار المتصفح على إعادة رسم الحركة (reflow) لتتمكن من إعادة التشغيل
      cat.el.classList.add(cls);
      
      setTimeout(() => { 
        cat.el.classList.remove(cls); 
        resolve(cat); 
      }, ms);
    });
  }

  cat.charge = () => play('is-charging', 900);
  cat.spell = ok => play(ok ? 'spell-ok' : 'spell-fail', 700);

  // المهمة 3: فقاعة الكلام كابن لعنصر القطة لتتحرك معها
  const bubble = document.createElement('div');
  bubble.className = 'gg-bubble';
  bubble.dir = 'auto'; // تحديد الاتجاه تلقائياً (RTL للعربية و LTR للإنجليزية)
  cat.el.appendChild(bubble);

  let hideTimer;
  cat.say = (text, ms = 4000) => {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(hideTimer);
    
    // إذا كان ms = 0 فستبقى الفقاعة ظاهرة
    if (ms) {
      hideTimer = setTimeout(() => bubble.classList.remove('show'), ms);
    }
    return cat;
  };
}