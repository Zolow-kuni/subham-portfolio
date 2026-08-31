/* ============================================================
   INVESTMENTS PAGE — investments.js
   Data-driven Portfolio Movement Tracker + scroll reveals
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   PORTFOLIO MOVEMENT DATA
   ------------------------------------------------------------
   To add a new entry, append an object to the array below.
   Fields:
     date        — display date, e.g. "31 Aug 2026"
     month       — grouping label, e.g. "August" (or "2026")
     type        — BUY / SELL / ADD / REDUCE / HOLD / REVIEW /
                   THESIS CHANGE / NEW CONCEPT / LESSON /
                   MISTAKE / STRATEGY CHANGE
     instrument  — the holding/concept (optional)
     capital     — string, capital deployed/withdrawn (optional)
     lines[]     — array of strings. Prefix a label with "|LABEL|"
                   to render it as a crimson tag, e.g.
                   "|Reason|Increasing diversification."
     newest first is automatic: entries render top-down as written.
   ============================================================ */
const INVESTMENT_EVENTS = [
  {
    date: '31 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'MOLOWVOL + NIFTYBEES',
    capital: '~₹586.88',
    lines: [
      '|Reason|Increasing diversified equity exposure.',
      '|Concept|Portfolio diversification.',
      '|Learning|A new purchase should strengthen what the portfolio lacks rather than simply chase recent performance.'
    ]
  },
  {
    date: '31 Aug 2026',
    month: 'August',
    type: 'REVIEW',
    instrument: 'Portfolio',
    lines: [
      '|Observation|SUZLON under pressure, TATAGOLD positive, TATSILV improved.',
      '|Lesson|A red day is not automatically a reason to sell.'
    ]
  },
  {
    date: '29 Aug 2026',
    month: 'August',
    type: 'NEW CONCEPT',
    instrument: 'Watchlist',
    lines: [
      '|Studied|TRENT, IOC, NIFTYBEES, MOLOWVOL as research, not trade signals.',
      '|Learning|Last-session figures are for research, not a reason to trade.'
    ]
  },
  {
    date: '28 Aug 2026',
    month: 'August',
    type: 'REVIEW',
    instrument: 'Portfolio',
    capital: '~₹630',
    lines: [
      '|Observation|Portfolio: ₹623 → ₹630 (+₹6.59 / +1.06%).',
      '|Lesson|Observe, don\'t react to every intraday movement.'
    ]
  },
  {
    date: 'Aug 2026',
    month: 'August',
    type: 'LEARN',
    instrument: 'MTF / Pledging',
    lines: [
      '|Concept|MTF is buying partly with borrowed money; it can amplify losses.',
      '|Lesson|Prefer delivery-based investing with own money rather than leverage.'
    ]
  },
  {
    date: 'Aug 2026',
    month: 'August',
    type: 'NEW CONCEPT',
    instrument: 'Gold & Silver',
    lines: [
      '|Studied|TATAGOLD, TATSILV, AONESILVER as diversification / commodity exposure.',
      '|Learning|Different ETFs move slightly differently; a small daily difference is not automatically arbitrage.'
    ]
  },
  {
    date: 'Aug 2026',
    month: 'August',
    type: 'THESIS CHANGE',
    instrument: 'Individual Stocks',
    lines: [
      '|Before|Buy a stock and forget it.',
      '|After|Invest small amounts at regular intervals, keep a diversified core, and review periodically.'
    ]
  }
];

/* ============================================================
   RENDER MOVEMENT TRACKER
   ============================================================ */
(function renderMovement() {
  const container = document.getElementById('movement');
  if (!container) return;

  let groups = new Map();
  INVESTMENT_EVENTS.forEach(ev => {
    if (!groups.has(ev.month)) groups.set(ev.month, []);
    groups.get(ev.month).push(ev);
  });

  let html = '';
  groups.forEach((events, month) => {
    html += '<div class="mv-group">';
    html += `<h3 class="mv-month">${month}</h3>`;
    events.forEach(ev => {
      html += '<div class="mv-item">';
      html += `<span class="mv-date">${ev.date}</span>`;
      html += '<div class="mv-card">';
      html += '<div class="mv-top">';
      html += `<span class="mv-type">${ev.type}</span>`;
      if (ev.instrument) html += `<span class="mv-instrument">${ev.instrument}</span>`;
      if (ev.capital)    html += `<span class="mv-capital">${ev.capital}</span>`;
      html += '</div>';
      html += '<div class="mv-lines">';
      ev.lines.forEach(line => {
        const m = line.match(/^\|([^|]+)\|(.*)$/);
        if (m) {
          html += `<p><span class="mv-label">${m[1]}</span> ${m[2]}</p>`;
        } else {
          html += `<p>${line}</p>`;
        }
      });
      html += '</div>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  });

  container.innerHTML = html;
})();

/* ============================================================
   SCROLL REVEALS
   ============================================================ */
gsap.utils.toArray('.inv-section-block').forEach(section => {
  gsap.from(section.querySelector('.inv-heading'), {
    opacity: 0, y: 28, duration: 0.8, ease: 'power2.out',
    scrollTrigger: { trigger: section, start: 'top 82%', once: true }
  });

  gsap.utils.toArray(
    section.querySelectorAll('.inv-principle, .inv-evo-item, .inv-holding, .mv-item, .inv-diary-day, .inv-rule-layer')
  ).forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 24, duration: 0.7, delay: (i % 6) * 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
});

gsap.from('.inv-final-quote', {
  opacity: 0, y: 40, duration: 1, ease: 'power3.out',
  scrollTrigger: { trigger: '.inv-final-quote', start: 'top 88%', once: true }
});

gsap.from('.inv-hero-title', {
  opacity: 0, y: 30, duration: 1, ease: 'power3.out',
  scrollTrigger: { trigger: '.inv-hero', start: 'top 80%', once: true }
});
