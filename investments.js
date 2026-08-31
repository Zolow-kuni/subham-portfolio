/* ============================================================
   INVESTMENTS PAGE — investments.js
   Data-driven Investment Journal
   ------------------------------------------------------------
   Snapshot     = where the portfolio is now
   Movement     = how it got here
   Diary        = why the decisions were made
   Learning     = what the decisions taught
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   PORTFOLIO SNAPSHOT DATA
   ------------------------------------------------------------
   qty, avg, ltp, position may be null when not yet recorded.
   Unrecorded fields render as an em-dash (never fabricated).
   ============================================================ */
const PORTFOLIO_HOLDINGS = [
  { name: 'NIFTYBEES',   role: 'Broad-market core',      qty: null, avg: null, ltp: null, pos: null },
  { name: 'MOLOWVOL',    role: 'Diversified equity',     qty: 4,    avg: '₹36.63', ltp: '₹36.61', pos: '-₹0.08' },
  { name: 'TATAGOLD',    role: 'Gold',                   qty: 9,    avg: '₹14.53', ltp: '₹15.36', pos: '+₹7.47' },
  { name: 'TATSILV',     role: 'Silver',                 qty: 3,    avg: '₹22.74', ltp: '₹23.37', pos: '+₹1.89' },
  { name: 'AONESILVER',  role: 'Silver',                 qty: 1,    avg: '₹9.31',  ltp: '₹9.20',  pos: '-₹0.11' },
  { name: 'MMTC',        role: 'Commodity / PSU',        qty: 2,    avg: '₹64.21', ltp: '₹63.07', pos: '-₹2.28' },
  { name: 'SUZLON',      role: 'Renewable-energy growth',qty: 3,    avg: '₹46.89', ltp: '₹46.79', pos: '-₹0.30' }
];

/* ============================================================
   INVESTMENT DIARY DATA
   ------------------------------------------------------------
   Each entry renders as an editorial card (collapsed).
   `full` is revealed when the user expands the entry.
   Newest entries first — place them at the TOP of the array.
   ============================================================ */
const DIARY_ENTRIES = [
  {
    num: 'Entry 03',
    date: 'August 31, 2026',
    title: 'The Strategy in Action',
    summary: 'The philosophy turned into a regular contribution — 1 MOLOWVOL and 2 NIFTYBEES added, then a red morning observed without panic.',
    metrics: ['New capital ~₹586.88', 'Invested ~₹1,210–1,211'],
    lesson: 'A red day is not automatically a reason to sell.',
    full: [
      'The journey shifted from "buy a stock and forget it" to "invest some money at regular intervals."',
      'Morning plan: buy 1 MOLOWVOL and 2 NIFTYBEES. The orders were initially pending, then executed.',
      'After execution, about ₹586.88 of new capital was added, taking invested capital to roughly ₹1,210–₹1,211 before minor charges and rounding.',
      'Intraday: 9:19 AM ₹1,205 (-₹6.26 / -0.52%); 10:26 AM ₹1,203 (-₹7.81 / -0.64%); 11:03 AM ₹1,204 (-₹7.02 / -0.58%).',
      'SUZLON came under pressure, TATAGOLD remained a positive contributor, and TATSILV improved somewhat. No exits were recorded.',
      'A loss of a few rupees on a roughly ₹1,200 portfolio is normal short-term noise. The important variable is the long-term contribution schedule and the quality and diversification of the holdings — not whether one morning finishes green or red.'
    ]
  },
  {
    num: 'Entry 02',
    date: 'August 28, 2026',
    title: 'The Market Moved. The Plan Didn\u2019t.',
    summary: 'From ₹623 opening to ₹630 at the close — a positive day reached purely by observing, with no trades made.',
    metrics: ['₹623 → ₹630', '+₹6.59 overall', '+1.06%'],
    lesson: 'Observe rather than react to every intraday movement.',
    full: [
      'Starting point: ₹623 invested. The market opened weak; the decision was to let the day develop rather than panic over early red numbers.',
      '9:24 AM: ~₹623, overall gain +₹3.86 (+0.62%).',
      '12:09 PM: ~₹628, overall gain +₹4.13 (+0.66%). TATAGOLD was the strongest contributor; MMTC was weaker; other positions moved near their averages.',
      '1:55 PM: ~₹630, overall gain +₹6.50 (+1.04%), today +₹0.88 (+0.14%). TATAGOLD and TATSILV were positive; MMTC remained the biggest negative.',
      '3:48 PM close: ₹630, invested ₹623, overall +₹6.59 (+1.06%), today +₹0.97 (+0.15%).',
      'Individual holdings moved in different directions at the same time. A few red positions did not mean the whole portfolio was performing badly.',
      'The portfolio moved from early weakness to a positive day without any trades being made.'
    ]
  },
  {
    num: 'Entry 01',
    date: 'August 24, 2026',
    title: 'Day One \u2014 The Habit Starts',
    summary: 'A very small portfolio begun with personal capital: MMTC, TATAGOLD and TATSILV first, then SUZLON and silver exposure. No MTF.',
    metrics: ['Invested ~₹477', 'Portfolio ~₹490', '+₹12.74 (+2.67%)'],
    lesson: 'No MTF. No panic selling. No chasing.',
    full: [
      'The portfolio started with three holdings: MMTC (2 @ ₹64.21), TATAGOLD (9 @ ₹14.53), and TATSILV (3 @ ₹22.74).',
      'At one point the portfolio was worth about ₹341 against ₹327 invested — a gain of about ₹13.64.',
      'Decided to look at Suzlon. Instead of borrowing, added ₹150 of own money and bought 3 Suzlon shares at ₹46.80 each.',
      'Learned about MTF (Margin Trading Facility) — buying with borrowed money. Decided against it; this portfolio is built with 100% personal capital.',
      'Bought AONESILVER (1 @ ₹9.29) to explore other ways of getting silver exposure.',
      'End of day: AONESILVER 1, MMTC 2, SUZLON 3, TATAGOLD 9, TATSILV 3. Invested ~₹477, portfolio ~₹490, overall gain ~₹12.74 (+2.67%).',
      'The biggest lesson was not about which stock went up or down, but how I want to invest: small, deliberate, understood.',
      'Owning two different ETFs does not necessarily mean diversifying — TATSILV and AONESILVER both give silver exposure through different products. The same applies to gold.'
    ]
  }
];

/* ============================================================
   LEARNING TIMELINE DATA
   ------------------------------------------------------------
   Concepts derived from the diary. Each is a short lesson.
   ============================================================ */
const LEARNING = [
  'Building the habit of investing',
  'Using personal capital',
  'Avoiding unnecessary leverage',
  'Understanding MTF',
  'Diversification',
  'Overlap between ETFs',
  'Gold exposure',
  'Silver exposure',
  'Patience',
  'Avoiding panic selling',
  'Avoiding price chasing',
  'Observing portfolio behavior',
  'How individual holdings affect the overall portfolio'
];

/* ============================================================
   PORTFOLIO MOVEMENT DATA
   ------------------------------------------------------------
   Append a new object to add an entry (renders automatically).
   Fields: date, month, type, instrument, capital, lines[].
   `lines` may use "|LABEL|text" for a crimson field tag.
   IMPORTANT: do not invent transaction dates, quantities or
   prices that are not recorded in the journal. Use lines that
   state a value is not yet recorded where data is missing.
   ============================================================ */
const INVESTMENT_EVENTS = [
  {
    date: '31 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'MOLOWVOL + NIFTYBEES',
    capital: '~₹586.88',
    lines: [
      '|Reason|Adding regular diversification to equity exposure.',
      '|Concept|Portfolio diversification.',
      '|Learning|A new purchase should strengthen what the portfolio lacks rather than chase recent performance.'
    ]
  },
  {
    date: '28 Aug 2026',
    month: 'August',
    type: 'REVIEW',
    instrument: 'Portfolio',
    capital: '~₹630',
    lines: [
      '|Observation|₹623 → ₹630 (+₹6.59 / +1.06%). No trades.',
      '|Lesson|Observe rather than react to every intraday movement.'
    ]
  },
  {
    date: '24 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'MMTC',
    capital: '2 @ ₹64.21',
    lines: [
      '|Reason|Started the portfolio; commodity / PSU exposure.',
      '|Recorded|Quantity and average price are from the Day 1 journal.'
    ]
  },
  {
    date: '24 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'TATAGOLD',
    capital: '9 @ ₹14.53',
    lines: [
      '|Reason|Gold exposure / diversification.'
    ]
  },
  {
    date: '24 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'TATSILV',
    capital: '3 @ ₹22.74',
    lines: [
      '|Reason|Silver exposure.'
    ]
  },
  {
    date: '24 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'SUZLON',
    capital: '3 @ ₹46.80 (₹150 own capital)',
    lines: [
      '|Reason|Renewable-energy growth. Funded with own money to avoid MTF.'
    ]
  },
  {
    date: '24 Aug 2026',
    month: 'August',
    type: 'BUY',
    instrument: 'AONESILVER',
    capital: '1 @ ₹9.29',
    lines: [
      '|Reason|Explored another silver product.',
      '|Learning|Two silver ETFs still mean one asset class — not diversification by itself.'
    ]
  },
  {
    date: 'Aug 2026',
    month: 'August',
    type: 'NEW CONCEPT',
    instrument: 'MTF / Pledging',
    lines: [
      '|Studied|MTF and how borrowed money can amplify losses.',
      '|Decision|Delivery-based investing with own money; no leverage.'
    ]
  },
  {
    date: 'Aug 2026',
    month: 'August',
    type: 'NEW CONCEPT',
    instrument: 'Gold & Silver',
    lines: [
      '|Studied|TATAGOLD, TATSILV, AONESILVER as commodity exposure.',
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
      '|After|Invest at regular intervals, keep a diversified core, and review periodically.'
    ]
  }
];

/* ============================================================
   RENDER PORTFOLIO SNAPSHOT
   ============================================================ */
(function renderSnapshot() {
  const container = document.getElementById('snapshot');
  if (!container) return;

  const dash = '<span class="unavailable">—</span>';
  const cell = v => (v == null ? dash : `<span>${v}</span>`);

  let html = '<div class="inv-snap-table">';
  html += '<div class="inv-snap-row inv-snap-head"><span>Holding</span><span>Role</span><span>Qty</span><span>Avg</span><span>LTP</span><span>Position</span></div>';
  PORTFOLIO_HOLDINGS.forEach(h => {
    const posClass = h.pos && h.pos.startsWith('+') ? 'inv-pos inv-pos--pos' : 'inv-pos';
    html += '<div class="inv-snap-row">';
    html += `<span class="inv-snap-name">${h.name}</span>`;
    html += `<span class="inv-snap-role">${cell(h.role)}</span>`;
    html += `<span>${cell(h.qty)}</span>`;
    html += `<span>${cell(h.avg)}</span>`;
    html += `<span>${cell(h.ltp)}</span>`;
    html += `<span class="${posClass}">${h.pos == null ? dash : h.pos}</span>`;
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
})();

/* ============================================================
   RENDER INVESTMENT DIARY (editorial, expandable)
   ============================================================ */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

(function renderDiary() {
  const container = document.getElementById('diary');
  if (!container) return;

  let html = '';
  DIARY_ENTRIES.forEach((e, i) => {
    html += '<article class="inv-diary-card">';
    html += '<div class="inv-diary-meta">';
    html += `<span class="inv-diary-num">${e.num}</span>`;
    html += `<span class="inv-diary-date">${e.date}</span>`;
    html += '</div>';
    html += `<h3 class="inv-diary-card-title">${e.title}</h3>`;
    html += `<p class="inv-diary-summary">${e.summary}</p>`;
    html += '<div class="inv-diary-metrics">';
    e.metrics.forEach(m => html += `<span class="inv-diary-metric">${m}</span>`);
    html += '</div>';
    html += `<p class="inv-diary-card-lesson">${e.lesson}</p>`;
    html += `<div class="inv-diary-full" id="diary-full-${i}" hidden>`;
    e.full.forEach(p => html += `<p>${escapeHtml(p)}</p>`);
    html += '</div>';
    html += `<button class="inv-diary-toggle" data-target="diary-full-${i}" aria-expanded="false">`;
    html += '<span class="inv-diary-toggle-text">READ ENTRY</span><span class="cta-arrow"></span>';
    html += '</button>';
    html += '</article>';
  });

  container.innerHTML = html;
})();

/* ============================================================
   DIARY EXPAND / COLLAPSE TOGGLE
   ============================================================ */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.inv-diary-toggle');
  if (!btn) return;
  const panel = document.getElementById(btn.dataset.target);
  if (!panel) return;
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  btn.setAttribute('aria-expanded', String(willOpen));
  const text = btn.querySelector('.inv-diary-toggle-text');
  if (text) text.textContent = willOpen ? 'COLLAPSE' : 'READ ENTRY';
});

/* ============================================================
   RENDER LEARNING TIMELINE
   ============================================================ */
(function renderLearning() {
  const container = document.getElementById('learning');
  if (!container) return;

  let html = '<div class="inv-learning-list">';
  LEARNING.forEach((item, i) => {
    html += `<div class="inv-learning-item"><span class="inv-learning-num">${String(i + 1).padStart(2, '0')}</span><span class="inv-learning-text">${item}</span></div>`;
  });
  html += '</div>';
  container.innerHTML = html;
})();

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
    section.querySelectorAll('.inv-principle, .inv-evo-item, .mv-item, .inv-diary-card, .inv-learning-item, .inv-rule-layer')
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
