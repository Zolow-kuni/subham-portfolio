// ===== Preloader =====
// Hides the branded loading screen once the page has fully loaded (or after
// a short minimum so it doesn't just flash on fast connections).
(function () {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const MIN_VISIBLE = 500; // ms — avoid an awkward flash on instant loads
  const shownAt = performance.now();

  function hide() {
    const elapsed = performance.now() - shownAt;
    const wait = Math.max(0, MIN_VISIBLE - elapsed);
    setTimeout(() => preloader.classList.add('is-hidden'), wait);
  }

  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide);
})();

// ===== Scroll progress bar =====
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.appendChild(progressBar);

function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// ===== Scroll-reveal animations =====
const revealEls = document.querySelectorAll(
  '.card, .skill-group, .exp-item, .cert-list li, .section h2, .section-lead, .hero-inner > *'
);
revealEls.forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${Math.min(i % 6, 5) * 70}ms`;
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

// ===== Animated stat counters =====
// Looks for elements with [data-counter="<target>"] and counts up when visible
const counters = document.querySelectorAll('[data-counter]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const decimals = el.dataset.counter.includes('.') ? 1 : 0;
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

counters.forEach(el => counterObserver.observe(el));

// ===== Active nav link highlighting =====
const sections = document.querySelectorAll('section[id], footer[id]');
const navLinks = document.querySelectorAll('.nav nav a[href^="#"]');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.getAttribute('id');
    const link = document.querySelector(`.nav nav a[href="#${id}"]`);
    if (!link) return;
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { threshold: 0.4, rootMargin: '-80px 0px -50% 0px' });

sections.forEach(s => navObserver.observe(s));

// ===== Wandering rōnin — original ink-wash silhouette figure =====
// A broad-shouldered, hooded swordsman seen from behind: spiky hair with a
// trailing headband, a blade slung across the back, and two more crossed at
// the hip — an original design (not a likeness of any copyrighted character),
// rendered as filled SVG shapes with a code-driven walk-cycle. Pure SVG/CSS.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const track = document.createElement('div');
  track.className = 'wanderer-track';
  track.setAttribute('aria-hidden', 'true');

  const wanderer = document.createElement('div');
  wanderer.className = 'wanderer';
  wanderer.innerHTML = `
    <svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
      <!-- back arm (drawn first so the torso overlaps it) -->
      <path class="ronin-limb ronin-arm-back" d="M23 22 C 19 28, 17 36, 16 46 L 19 46 C 21 37, 23 29, 26 22 Z"></path>

      <g class="ronin-body">
        <!-- spiky hair -->
        <path class="ronin-hair" d="M22 10 L24 2 L27 9 L30 1 L33 9 L36 2 L38 10 Z"></path>
        <!-- trailing headband ribbon -->
        <path class="ronin-band" d="M37 9 C 44 7, 51 9, 47 14 C 49 11, 44 15, 40 13 Z"></path>
        <!-- head -->
        <circle class="ronin-head" cx="30" cy="13" r="6"></circle>
        <!-- broad-shouldered torso tapering to the waist -->
        <path class="ronin-torso" d="M20 20 C 20 18, 40 18, 40 20 L 37 46 L 23 46 Z"></path>
        <!-- blade slung diagonally across the back -->
        <rect class="ronin-blade ronin-back-blade" x="14" y="15" width="32" height="2.6" rx="1.3" transform="rotate(38 30 30)"></rect>
        <!-- two more blades crossed and fanned at the hip -->
        <rect class="ronin-blade ronin-hip-blade" x="-4" y="45" width="34" height="2.4" rx="1.2" transform="rotate(30 30 46)"></rect>
        <rect class="ronin-blade ronin-hip-blade" x="30" y="45" width="34" height="2.4" rx="1.2" transform="rotate(-30 30 46)"></rect>
      </g>

      <!-- back leg -->
      <path class="ronin-limb ronin-leg-back" d="M25 47 C 23 58, 21 71, 20 85 L 24 85 C 26 71, 27 58, 29 47 Z"></path>
      <!-- front leg -->
      <path class="ronin-limb ronin-leg-front" d="M31 47 C 33 58, 35 71, 36 85 L 40 85 C 39 71, 37 58, 35 47 Z"></path>
      <!-- front arm (drawn last, on top of the torso) -->
      <path class="ronin-limb ronin-arm-front" d="M34 22 C 38 28, 40 36, 41 46 L 38 46 C 36 37, 34 29, 31 22 Z"></path>
    </svg>
  `;

  track.appendChild(wanderer);
  hero.appendChild(track);
})();

// ===== Three Sword Style — katana slash cursor trail =====
// A small homage to Zoro: quick green "blade" streaks follow fast mouse movement.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch devices

  const POOL_SIZE = 6;
  const pool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'slash-trail';
    document.body.appendChild(el);
    pool.push({ el, busy: false });
  }

  let lastX = null, lastY = null, lastT = 0;
  const MIN_DIST = 70; // only slash on a fast/long swipe

  window.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (lastX !== null) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist > MIN_DIST && now - lastT > 60) {
        const slot = pool.find(s => !s.busy) || pool[0];
        slot.busy = true;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const len = Math.min(dist, 160);
        slot.el.style.width = `${len}px`;
        slot.el.style.left = `${lastX}px`;
        slot.el.style.top = `${lastY}px`;
        slot.el.style.transform = `rotate(${angle}deg) scaleX(1)`;
        slot.el.style.transition = 'none';
        slot.el.style.opacity = '0.85';
        requestAnimationFrame(() => {
          slot.el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          slot.el.style.transform = `rotate(${angle}deg) scaleX(1.4)`;
          slot.el.style.opacity = '0';
        });
        setTimeout(() => { slot.busy = false; }, 380);
        lastT = now;
      }
    }
    lastX = e.clientX;
    lastY = e.clientY;
  }, { passive: true });
})();

// ===== Code-rain hero background =====
// Faint columns of real SQL/Python snippets from Subham's stack, drifting
// slowly downward behind the hero text. Pure DOM/CSS, no canvas needed.
(function () {
  const rain = document.querySelector('.code-rain');
  if (!rain) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth <= 760) return;

  const SNIPPETS = [
    "SELECT customer_id, SUM(amount)",
    "FROM transactions",
    "GROUP BY customer_id",
    "WINDOW w AS (ORDER BY order_date)",
    "df.groupby('segment').agg(",
    "  {'revenue': 'sum'})",
    "import pandas as pd",
    "z_score = (x - mean) / std",
    "WHERE fraud_score > 80",
    "JOIN orders ON o.id = c.order_id",
    "model.fit(X_train, y_train)",
    "CTE AS (SELECT * FROM cohort)",
    "RFM segmentation: recency,",
    "  frequency, monetary",
    "ALTER TABLE staging ADD",
    "np.where(df['flag'] == 1, 1, 0)",
    "dbt run --select stg_orders",
    "ROC AUC: 0.837",
    "LAG(revenue) OVER (ORDER BY mo)",
    "validate_schema(df, rules)",
  ];

  const colCount = Math.max(3, Math.floor(window.innerWidth / 240));
  for (let i = 0; i < colCount; i++) {
    const col = document.createElement('div');
    col.className = 'code-rain-col';
    col.style.left = `${(i / colCount) * 100}%`;

    const lines = [];
    for (let j = 0; j < 24; j++) {
      lines.push(SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)]);
    }
    col.textContent = lines.join('\n');

    const duration = 38 + Math.random() * 24;
    col.style.animationDuration = `${duration}s`;
    col.style.animationDelay = `-${Math.random() * duration}s`;

    rain.appendChild(col);
  }
})();

// ===== Character-reveal hero headline =====
// Wraps each character of the heading (preserving inner spans like .accent)
// in its own <span class="char"> and staggers a fade/rise-in on load.
(function () {
  const heading = document.querySelector('.reveal-chars');
  if (!heading) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function wrapChars(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...child.textContent].forEach(ch => {
          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = ch === ' ' ? ' ' : ch;
          frag.appendChild(span);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        wrapChars(child);
      }
    });
  }
  wrapChars(heading);

  const chars = heading.querySelectorAll('.char');
  chars.forEach((span, i) => {
    span.style.transitionDelay = `${i * 18}ms`;
  });
  setTimeout(() => {
    chars.forEach(span => span.classList.add('char-visible'));
  }, 50);
})();

// ===== Magnetic hover on buttons =====
// Buttons drift toward the cursor within their bounds, snapping back on leave.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.btn').forEach(btn => {
    btn.classList.add('btn-magnetic');
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

// ===== Hamburger mobile menu =====
(function () {
  const btn = document.getElementById('hamburger-btn');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when any nav link is clicked
  nav.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
      nav.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
})();

// ===== Subtle tilt effect on project cards =====
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / rect.height) * -6;
    const rotateY = ((x - rect.width / 2) / rect.width) * 6;
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});
