/* ============================================================
   RONIN PORTFOLIO — script.js
   GSAP entrance + scroll animations · Canvas leaf particles
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* === HERO ENTRANCE SEQUENCE === */
const hero = gsap.timeline({ defaults: { ease: 'power3.out' } });

hero
  .from('.sidebar-dot',      { opacity: 0, scale: 0, duration: 0.6, delay: 0.2 })
  .from('.s-btn',            { opacity: 0, x: -12, duration: 0.5, stagger: 0.07 }, '-=0.3')
  .from('.sidebar-social a', { opacity: 0, x: -8,  duration: 0.4, stagger: 0.07 }, '-=0.2')
  .from('.logo',             { opacity: 0, y: -16,  duration: 0.7 }, '-=0.6')
  .from('.nav-link',         { opacity: 0, y: -10,  duration: 0.6, stagger: 0.08 }, '-=0.5')
  .from('.sun-orb',          { opacity: 0, scale: 0.75, duration: 1.8, ease: 'power2.out' }, '-=0.8')
  .from('.ronin-img',        { opacity: 0, x: -50,  duration: 1.5, ease: 'power2.out' }, '-=1.4')
  .from('.bushido',          { opacity: 0, duration: 2 }, '-=1.2')
  .from('.ht-line',          { opacity: 0, x: 28, duration: 0.75, stagger: 0.16, ease: 'power2.out' }, '-=0.9')
  .from('.hero-rule',        { scaleX: 0, duration: 0.7, transformOrigin: 'left', ease: 'power2.out' }, '-=0.4')
  .from('.hero-tagline',     { opacity: 0, y: 10, duration: 0.6 }, '-=0.3')
  .from('.hero-cta',         { opacity: 0, y: 10, duration: 0.6 }, '-=0.35')
  .from('.ground',           { scaleX: 0, duration: 1.8, transformOrigin: 'left', ease: 'power2.out' }, '-=1.6');

/* === CHAPTER SCROLL REVEALS === */
gsap.utils.toArray('.chapter').forEach(section => {
  const els = [
    section.querySelector('.chapter-label'),
    section.querySelector('.chapter-title'),
    section.querySelector('.chapter-body')
  ].filter(Boolean);

  if (els.length) {
    gsap.from(els, {
      opacity: 0, y: 36, duration: 1, stagger: 0.14, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 68%', once: true }
    });
  }
});

gsap.utils.toArray('.stat').forEach((el, i) => {
  gsap.from(el, {
    opacity: 0, y: 20, duration: 0.7, delay: i * 0.14, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 85%', once: true }
  });
});

gsap.utils.toArray('.sword-card').forEach((el, i) => {
  gsap.from(el, {
    opacity: 0, y: 28, duration: 0.8, delay: i * 0.12, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 82%', once: true }
  });
});

gsap.utils.toArray('.battle-card').forEach((el, i) => {
  gsap.from(el, {
    opacity: 0, x: -20, duration: 0.75, delay: i * 0.1, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 85%', once: true }
  });
});

gsap.utils.toArray('.tl-item').forEach((el, i) => {
  gsap.from(el, {
    opacity: 0, x: -24, duration: 0.75, delay: i * 0.1, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%', once: true }
  });
});

gsap.utils.toArray('.contact-link').forEach((el, i) => {
  gsap.from(el, {
    opacity: 0, y: 16, duration: 0.6, delay: i * 0.1, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%', once: true }
  });
});

/* === RONIN SCROLL WALK + PARALLAX LAYERS === */
gsap.timeline({
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1.2,
  }
})
.to('.ronin-stage', { x: 170, ease: 'none' }, 0)
.to('.sun-orb',     { y: 40,  ease: 'none' }, 0)
.to('.fog-1',       { x: '18%', ease: 'none' }, 0)
.to('.fog-2',       { x: '-12%', ease: 'none' }, 0);

/* === RONIN VIDEO LOOP (first 50% only — clean walk cycle) === */
(function roninLoop() {
  const vid = document.querySelector('.ronin-img');
  if (!vid || vid.tagName !== 'VIDEO') return;
  vid.addEventListener('loadedmetadata', () => {
    const loopEnd = vid.duration * 0.50;
    vid.addEventListener('timeupdate', () => {
      if (vid.currentTime >= loopEnd) vid.currentTime = 0.05;
    });
  });
})();

/* === LEAF PARTICLES (canvas) === */
(function initLeaves() {
  const canvas = document.getElementById('leavesCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, leaves = [], animId = null;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function makeLeaf() {
    return {
      x:       Math.random() * W * 1.3,
      y:       -16,
      size:    3.5 + Math.random() * 5,
      vx:      -0.6 - Math.random() * 1.4,
      vy:      0.7  + Math.random() * 1.1,
      rot:     Math.random() * Math.PI * 2,
      spin:    (Math.random() - 0.5) * 0.035,
      sway:    Math.random() * Math.PI * 2,
      swaySpd: 0.012 + Math.random() * 0.018,
      alpha:   0.35  + Math.random() * 0.4,
      hue:     22    + Math.random() * 18
    };
  }

  for (let i = 0; i < 5; i++) {
    const l = makeLeaf();
    l.y = Math.random() * H;
    leaves.push(l);
  }

  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.globalAlpha = l.alpha;
    ctx.fillStyle = `hsl(${l.hue}, 55%, 40%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, l.size, l.size * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${l.hue}, 40%, 25%, 0.5)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-l.size, 0);
    ctx.lineTo(l.size, 0);
    ctx.stroke();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    if (Math.random() < 0.015 && leaves.length < 8) leaves.push(makeLeaf());
    leaves = leaves.filter(l => l.y < H + 24 && l.x > -40);
    for (const l of leaves) {
      l.sway += l.swaySpd;
      l.x    += l.vx + Math.sin(l.sway) * 0.45;
      l.y    += l.vy;
      l.rot  += l.spin;
      drawLeaf(l);
    }
    animId = requestAnimationFrame(tick);
  }

  tick();

  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (!animId) tick();
      } else {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }).observe(heroEl);
  }
})();

/* === ACTIVE NAV SYNC === */
(function syncNav() {
  const sections  = document.querySelectorAll('section[id]');
  const topLinks  = document.querySelectorAll('.nav-link');
  const sideLinks = document.querySelectorAll('.s-btn');

  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      topLinks.forEach(a  => a.classList.toggle('active',  a.getAttribute('href') === `#${id}`));
      sideLinks.forEach(a => a.classList.toggle('active',  a.getAttribute('href') === `#${id}`));
    });
  }, { threshold: 0.45 }).observe;

  sections.forEach(s => {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      const id = entries[0].target.id;
      topLinks.forEach(a  => a.classList.toggle('active',  a.getAttribute('href') === `#${id}`));
      sideLinks.forEach(a => a.classList.toggle('active',  a.getAttribute('href') === `#${id}`));
    }, { threshold: 0.45 }).observe(s);
  });
})();
