import './style.css';

const pageOneDate = new Date('2026-11-27T00:00:00+07:00');
const openButton = document.querySelector('.open-invitation');
const invitation = document.querySelector('#invitation');
const guestName = document.querySelector('.guest-name');
const countdownCells = {
  days: document.querySelector('[data-countdown="days"]'),
  hours: document.querySelector('[data-countdown="hours"]'),
  minutes: document.querySelector('[data-countdown="minutes"]'),
  seconds: document.querySelector('[data-countdown="seconds"]'),
};

const rawName = new URLSearchParams(window.location.search).get('nama')?.trim().slice(0, 50);
if (guestName && rawName) {
  guestName.textContent = rawName;
}

const pad = (value) => String(value).padStart(2, '0');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* Tear-off-calendar timing, sized against the reference clip (~200-250ms end to
   end). The fall accelerates like a real sheet under gravity; the short dissolve
   is what lifts the landed leaf away and uncovers the new lower half. */
const FLIP_FALL_MS = 135;
const FLIP_DISSOLVE_MS = 65;
const FLIP_EASE_FALL = 'cubic-bezier(.4,.02,.7,.42)';
const FLIP_EASE_DISSOLVE = 'cubic-bezier(.4,0,.2,1)';

const FALL_KEYFRAMES = [
  { transform: 'rotateX(0deg) translateZ(0)', offset: 0 },
  /* a small lift off the surface before it drops — the cue that reads as a
     physical board being flicked rather than a picture being crossfaded */
  { transform: 'rotateX(-16deg) translateZ(1.2cqw)', offset: 0.12 },
  { transform: 'rotateX(-90deg) translateZ(0)', offset: 0.5 },
  { transform: 'rotateX(-180deg) translateZ(0)', offset: 1 },
];
const SHADE_IN_KEYFRAMES = [
  { opacity: 0, offset: 0 },
  { opacity: 1, offset: 1 },
];
const DISSOLVE_KEYFRAMES = [{ opacity: 1 }, { opacity: 0 }];

const createFlip = (card) => {
  const top = card?.querySelector('.page-one__cd-half--top');
  const bottom = card?.querySelector('.page-one__cd-half--bottom');
  const oldBottom = card?.querySelector('.page-one__cd-old-bottom');
  const leafFront = card?.querySelector('.page-one__cd-leaf-face--front');
  const leaf = card?.querySelector('.page-one__cd-leaf');
  const shade = card?.querySelector('.page-one__cd-leaf-shade');
  if (!top || !bottom || !oldBottom || !leaf || !leafFront) return null;

  const write = (host, next) => {
    const digit = host.querySelector('.page-one__cd-digit');
    if (digit) digit.textContent = next;
  };

  let value = top.querySelector('.page-one__cd-digit')?.textContent ?? '';
  let running = [];
  let timers = [];

  /* Return every layer to rest. Used on first paint, on reduced motion, and to
     settle a run cut short by a throttled background tab. */
  const settle = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
    running.forEach((animation) => animation.cancel());
    running = [];
    leaf.style.transform = '';
    leaf.style.opacity = '';
    if (shade) shade.style.opacity = '';
    oldBottom.style.opacity = '';
    write(top, value);
    write(bottom, value);
  };

  return {
    prime(next) {
      value = next;
      settle();
    },
    set(next) {
      if (next === value) return;
      const outgoing = value;
      settle();
      value = next;

      if (reduceMotion.matches) {
        write(top, value);
        write(bottom, value);
        return;
      }

      /* Both static halves now carry the incoming digits; the outgoing lower
         half is laid back on top so the card still reads as one whole old
         digit for the first half of the fall. */
      write(top, value);
      write(bottom, value);
      write(oldBottom, outgoing);
      write(leafFront, outgoing);
      oldBottom.style.opacity = '1';
      leaf.style.opacity = '1';

      running.push(leaf.animate(FALL_KEYFRAMES, {
        duration: FLIP_FALL_MS,
        easing: FLIP_EASE_FALL,
        fill: 'both',
      }));
      if (shade) {
        running.push(shade.animate(SHADE_IN_KEYFRAMES, {
          duration: FLIP_FALL_MS,
          fill: 'both',
        }));
      }

      /* Landed: the leaf lies over the lower half showing its bare back. Drop
         the outgoing lower half — invisible, it is fully covered — then let the
         leaf dissolve so the new lower half shows through. */
      timers.push(window.setTimeout(() => {
        oldBottom.style.opacity = '0';
        running.push(leaf.animate(DISSOLVE_KEYFRAMES, {
          duration: FLIP_DISSOLVE_MS,
          easing: FLIP_EASE_DISSOLVE,
          fill: 'both',
        }));
        if (shade) {
          running.push(shade.animate(DISSOLVE_KEYFRAMES, {
            duration: FLIP_DISSOLVE_MS,
            fill: 'both',
          }));
        }
      }, FLIP_FALL_MS));

      timers.push(window.setTimeout(settle, FLIP_FALL_MS + FLIP_DISSOLVE_MS + 30));
    },
  };
};

const countdown = {
  days: createFlip(countdownCells.days),
  hours: createFlip(countdownCells.hours),
  minutes: createFlip(countdownCells.minutes),
  seconds: createFlip(countdownCells.seconds),
};

/* ---------- Page 1 reveal ---------- */

const HANDOVER_MS = 700;

/* The hidden start state lives under `.has-motion`, and only main.js adds that
   class — and only when the visitor has not asked for reduced motion. So the
   page is never left blank by a missing observer or a blocked script. */
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('has-motion');
}

let revealObserver = null;

/* Safety net. The observer alone once stranded `.page-one__music`: bottom-of-page
   elements can sit where a negative bottom root-margin is never satisfied once
   the page is scrolled to its end — the element stays at opacity 0, i.e.
   invisible. Anything whose box is on screen is therefore also revealed by a
   cheap rect test, so a missed intersection can never hide content. */
const sweepReveals = () => {
  document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => {
    const rect = el.getBoundingClientRect();
    /* At or above the lower viewport edge — on screen, or already scrolled
       past. A fast flick or anchor jump can carry an element from below the
       viewport to above it between two observer ticks, so the deep-margin
       observer never sees it intersect; anything that high up must be shown. */
    if (rect.top < window.innerHeight) {
      el.classList.add('is-revealed');
      revealObserver?.unobserve(el);
    }
  });
};

let sweepQueued = false;

/* The paper plane's flight is bound to scroll progress, not a trigger: --fly
   goes 0 -> 1 while the doodle crosses the lower ~55% of the viewport, and CSS
   derives its transform/opacity from it, so the plane glides into its parked
   position under the user's thumb (and eases back when they scroll up). */
const flyEl = document.querySelector('.page-one__doodle');
const updateFly = () => {
  if (!flyEl || !document.documentElement.classList.contains('has-motion')) return;
  const rect = flyEl.getBoundingClientRect();
  /* Start as the plane enters the viewport, land once it climbs to 70% of the
     viewport height. The window is deliberately short so the flight completes
     even on tall phones where Page 1 only scrolls a couple hundred pixels. */
  const start = window.innerHeight;
  const end = window.innerHeight * 0.7;
  const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
  flyEl.style.setProperty('--fly', progress.toFixed(4));
};

const queueSweep = () => {
  if (sweepQueued) return;
  sweepQueued = true;
  window.requestAnimationFrame(() => {
    sweepQueued = false;
    sweepReveals();
    updateFly();
  });
};

const observeReveals = () => {
  if (!document.documentElement.classList.contains('has-motion')) return;

  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      revealObserver.unobserve(entry.target);
    });
  }, {
    /* Deep trigger: the element must clear the bottom 12% of the viewport and
       15% of it must be visible before its reveal starts, so the animation is
       still in motion while the guest watches instead of finishing the moment
       the element peeks in. The sweep above is the safety net for anything
       this margin can never satisfy (bottom-of-page elements). */
    rootMargin: '0px 0px -12% 0px',
    threshold: 0.15,
  });

  document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => revealObserver.observe(el));
  /* No synchronous sweep here: at click time the entrance zoom is mid-flight
     (canvas scaled 0.94), so element rects sit higher than at rest and the
     sweep would prematurely reveal below-the-fold elements. The observer
     covers the first viewport; the 2600ms sweep in openPageOne catches
     anything the deep margin can never satisfy. */
  updateFly();
};

window.addEventListener('scroll', queueSweep, { passive: true });
window.addEventListener('resize', queueSweep);

let primed = false;

const updateCountdown = () => {
  const remaining = Math.max(0, pageOneDate.getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (countdownCells.days) {
    countdownCells.days.classList.toggle('is-wide', String(days).length >= 3);
  }

  const values = {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };

  for (const [key, value] of Object.entries(values)) {
    if (primed) {
      countdown[key]?.set(value);
    } else {
      countdown[key]?.prime(value);
    }
  }
  primed = true;
};

const openPageOne = () => {
  if (document.body.dataset.state) return;
  document.body.dataset.state = 'closing';
  openButton?.setAttribute('aria-expanded', 'true');
  if (invitation) invitation.hidden = false;
  window.scrollTo(0, 0);
  observeReveals();

  window.setTimeout(() => {
    document.body.dataset.state = 'open';
  }, HANDOVER_MS);

  /* Only sweep once the entrance zoom has fully settled (2400ms): while the
     canvas is still scaled, every child's rect sits higher than at rest and
     the sweep would prematurely reveal below-the-fold elements. The observer
     handles the first viewport during the animation. */
  [2600].forEach((ms) => window.setTimeout(sweepReveals, ms));
};

openButton?.addEventListener('click', openPageOne);

/* Floating music toggle. No audio asset exists yet, so the button only flips
   its pressed state (play/pause glyphs); wiring an <audio> element later is a
   matter of playing/pausing inside this handler. */
const musicFab = document.querySelector('.music-fab');
musicFab?.addEventListener('click', () => {
  const playing = musicFab.getAttribute('aria-pressed') === 'true';
  musicFab.setAttribute('aria-pressed', String(!playing));
  musicFab.setAttribute('aria-label', playing ? 'Putar musik' : 'Jeda musik');
});

updateCountdown();
window.setInterval(updateCountdown, 1000);

/* Gallery lightbox. Any Page 4 photo opens the viewer at its own index;
   Prev/Next cycle with wrap-around; Esc, the ✕ button and the backdrop
   all close. Arrow keys navigate while open. */
const galleryPhotos = [...document.querySelectorAll('.page-four__ph')];
const lightbox = document.querySelector('.lightbox');

if (galleryPhotos.length && lightbox) {
  const lbImg = lightbox.querySelector('.lightbox__img');
  const btnPrev = lightbox.querySelector('.lightbox__nav--prev');
  const btnNext = lightbox.querySelector('.lightbox__nav--next');
  let lbIndex = 0;
  let lbLastFocus = null;

  const lbShow = (i) => {
    lbIndex = (i + galleryPhotos.length) % galleryPhotos.length;
    const src = galleryPhotos[lbIndex];
    lbImg.src = src.currentSrc || src.src;
    lbImg.alt = src.alt;
  };

  const lbOpen = (i) => {
    lbLastFocus = document.activeElement;
    lbShow(i);
    lightbox.hidden = false;
    document.body.classList.add('lightbox-lock');
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    lightbox.querySelector('.lightbox__close').focus();
  };

  const lbClose = () => {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('lightbox-lock');
    window.setTimeout(() => { lightbox.hidden = true; }, 230);
    lbLastFocus?.focus?.();
  };

  galleryPhotos.forEach((img, i) => {
    img.addEventListener('click', () => lbOpen(i));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        lbOpen(i);
      }
    });
  });

  btnPrev.addEventListener('click', () => lbShow(lbIndex - 1));
  btnNext.addEventListener('click', () => lbShow(lbIndex + 1));
  lightbox.querySelectorAll('[data-lightbox-close]').forEach((el) => el.addEventListener('click', lbClose));

  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
    else if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
  });
}

/* ============================================================
   PAGE 5 — Amplop Digital & Ucapan dan Do'a
   ============================================================

   - "Klik Disini" grows the canvas: the two flattened design
     backgrounds crossfade, the amplop cards appear and the
     Ucapan panel slides down (+2456 design px).
   - The guestbook name syncs with the invitation link (?nama=,
     the same param that fills the Page Awal greeting).
   - Clicking Hadir / Tidak Hadir submits the message with a
     real-time timestamp, prepends it to the list and updates
     the Hadir / Tidak Hadir counters.
   - Storage: with VITE_GUESTBOOK_URL + VITE_GUESTBOOK_KEY set, entries
     are permanent and shared across all visitors — either a Google
     Apps Script Web App backed by a Google Sheet (provider "sheet",
     auto-detected from the URL) or Supabase REST; without them it
     falls back to localStorage, a per-device demo mode. */

const pageFive = document.querySelector('.page-five');

if (pageFive) {
  const GUESTBOOK_URL = (import.meta.env.VITE_GUESTBOOK_URL ?? '').replace(/\/+$/, '');
  const GUESTBOOK_KEY = import.meta.env.VITE_GUESTBOOK_KEY ?? '';
  /* Provider is picked automatically: a Google Apps Script Web App URL
     (Google Sheets backend) or a Supabase REST base; empty = local demo. */
  const GB_PROVIDER = import.meta.env.VITE_GUESTBOOK_PROVIDER
    ?? (/script\.google\.com/.test(GUESTBOOK_URL) ? 'sheet' : GUESTBOOK_URL ? 'supabase' : 'local');
  const LS_KEY = 'wedding-guestbook-v1';

  const p5Input = pageFive.querySelector('.page-five__input');
  const p5Textarea = pageFive.querySelector('.page-five__textarea');
  const p5List = pageFive.querySelector('.page-five__list');
  const p5CounterHadir = pageFive.querySelector('[data-counter="hadir"]');
  const p5CounterTidak = pageFive.querySelector('[data-counter="tidak"]');
  const p5Toast = pageFive.querySelector('.page-five__toast');

  /* Sync the guest name with the Page Awal greeting (?nama= link param). */
  if (p5Input && rawName) p5Input.value = rawName;

  /* --- state toggle ------------------------------------------ */

  const p5Toggle = pageFive.querySelector('.page-five__toggle');
  p5Toggle.addEventListener('click', () => {
    const open = pageFive.classList.toggle('is-open');
    p5Toggle.setAttribute('aria-expanded', String(open));
  });

  /* --- toast --------------------------------------------------- */

  let p5ToastTimer;
  const p5ShowToast = (message) => {
    p5Toast.textContent = message;
    p5Toast.hidden = false;
    p5Toast.classList.add('is-show');
    clearTimeout(p5ToastTimer);
    p5ToastTimer = setTimeout(() => p5Toast.classList.remove('is-show'), 1800);
  };

  /* --- copy rekening ------------------------------------------ */

  pageFive.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const number = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(number);
      } catch {
        /* Clipboard API can be unavailable (http / older webview):
           fall back to a hidden textarea + execCommand. */
        const helper = document.createElement('textarea');
        helper.value = number;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
      }
      p5ShowToast('Nomor rekening tersalin');
    });
  });

  /* --- guestbook storage --------------------------------------- */

  const GB_HEADERS = { apikey: GUESTBOOK_KEY, Authorization: `Bearer ${GUESTBOOK_KEY}` };

  const seedEntries = () => {
    const seeds = [
      { name: 'Keluarga Besar Mempelai Pria', message: 'Selamat menempuh hidup baru, semoga menjadi keluarga sakinah, mawaddah, warahmah.', attendance: 'hadir' },
      { name: 'Sahabat Kost Kedoya', message: 'Samawa kak!! Semoga langgeng selamanya.', attendance: 'hadir' },
      { name: 'Rekan Kerja Annisa', message: 'Maaf belum bisa hadir, doa terbaik untuk kalian berdua.', attendance: 'tidak' },
    ];
    const now = Date.now();
    return seeds.map((s, i) => ({ ...s, created_at: new Date(now - (i + 1) * 86400000).toISOString() }));
  };

  const gbLoad = async () => {
    if (GB_PROVIDER === 'sheet') {
      /* GET without custom headers → no CORS preflight, which Apps Script
         cannot answer. The secret rides as a query parameter. */
      const res = await fetch(`${GUESTBOOK_URL}?secret=${encodeURIComponent(GUESTBOOK_KEY)}`);
      if (!res.ok) throw new Error('guestbook load failed');
      const data = await res.json();
      if (!data.ok) throw new Error('guestbook load error');
      return data.entries.map((e) => ({
        name: e.name,
        message: e.message,
        attendance: e.attendance,
        created_at: e.created_at,
      }));
    }
    if (GB_PROVIDER === 'supabase') {
      const res = await fetch(
        `${GUESTBOOK_URL}/rest/v1/guestbook?select=*&order=created_at.desc&limit=100`,
        { headers: GB_HEADERS },
      );
      if (!res.ok) throw new Error('guestbook load failed');
      return res.json();
    }
    const local = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null');
    if (Array.isArray(local)) return local;
    const seeded = seedEntries();
    localStorage.setItem(LS_KEY, JSON.stringify(seeded));
    return seeded;
  };

  const gbSave = async (entry) => {
    if (GB_PROVIDER === 'sheet') {
      /* text/plain content-type avoids the CORS preflight Apps Script
         cannot answer; Google's redirect chain delivers the JSON reply. */
      const res = await fetch(GUESTBOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret: GUESTBOOK_KEY, ...entry }),
      });
      if (!res.ok) throw new Error('guestbook save failed');
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) throw new Error('guestbook save error');
      return;
    }
    if (GB_PROVIDER === 'supabase') {
      const res = await fetch(`${GUESTBOOK_URL}/rest/v1/guestbook`, {
        method: 'POST',
        headers: { ...GB_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error('guestbook save failed');
      return;
    }
    const all = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    all.unshift(entry);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  };

  /* --- rendering ------------------------------------------------ */

  const AVATAR_SVG = `
    <svg viewBox="0 0 48 48" fill="none" stroke="#f5eddc" stroke-width="3.4"
      stroke-linecap="round" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="21" />
      <circle cx="24" cy="18.5" r="6.4" />
      <path d="M11.5 39.5c2.4-6.2 7-9.4 12.5-9.4s10.1 3.2 12.5 9.4" />
    </svg>`;

  const p5FormatTime = (iso) => {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}.${p(d.getMinutes())}`;
  };

  const p5RenderEntry = (entry) => {
    const li = document.createElement('li');
    li.className = 'page-five__entry';
    li.innerHTML = `
      <span class="page-five__avatar">${AVATAR_SVG}</span>
      <div>
        <p class="page-five__entry-name"></p>
        <time class="page-five__entry-time" datetime="${entry.created_at}"></time>
        <p class="page-five__entry-msg"></p>
      </div>`;
    li.querySelector('.page-five__entry-name').textContent = entry.name;
    li.querySelector('.page-five__entry-time').textContent = p5FormatTime(entry.created_at);
    li.querySelector('.page-five__entry-msg').textContent = entry.message;
    return li;
  };

  const p5RenderAll = (entries) => {
    p5List.innerHTML = '';
    if (!entries.length) {
      const li = document.createElement('li');
      li.className = 'page-five__empty';
      li.textContent = 'Jadilah yang pertama memberikan ucapan dan do\u2019a.';
      p5List.appendChild(li);
    } else {
      entries.forEach((entry) => p5List.appendChild(p5RenderEntry(entry)));
    }
    p5CounterHadir.textContent = entries.filter((e) => e.attendance === 'hadir').length;
    p5CounterTidak.textContent = entries.filter((e) => e.attendance === 'tidak').length;
  };

  /* --- submit on attendance click -------------------------------- */

  const p5Pills = pageFive.querySelectorAll('.page-five__pill');
  let p5Busy = false;

  p5Pills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      if (p5Busy) return;
      const message = p5Textarea.value.trim();
      if (!message) {
        p5Textarea.classList.remove('is-shake');
        void p5Textarea.offsetWidth; /* restart the animation */
        p5Textarea.classList.add('is-shake');
        p5Textarea.focus();
        return;
      }
      p5Busy = true;
      const attendance = pill.classList.contains('page-five__pill--hadir') ? 'hadir' : 'tidak';
      const entry = {
        name: p5Input.value.trim().slice(0, 50) || 'Tamu',
        message: message.slice(0, 500),
        attendance,
        created_at: new Date().toISOString(),
      };
      try {
        await gbSave(entry);
        /* Optimistic update — render immediately instead of re-reading:
           Google Sheets can lag a few seconds between append and read. */
        p5List.querySelector('.page-five__empty')?.remove();
        p5List.prepend(p5RenderEntry(entry));
        (attendance === 'hadir' ? p5CounterHadir : p5CounterTidak).textContent =
          String(Number((attendance === 'hadir' ? p5CounterHadir : p5CounterTidak).textContent) + 1);
        p5Textarea.value = '';
        p5ShowToast('Ucapan dan do\u2019a terkirim');
        pill.classList.add('is-sent');
        setTimeout(() => pill.classList.remove('is-sent'), 1200);
      } catch {
        p5ShowToast('Gagal mengirim, coba lagi');
      } finally {
        p5Busy = false;
      }
    });
  });

  /* --- initial load ------------------------------------------------ */

  gbLoad()
    .then(p5RenderAll)
    .catch(() => p5RenderAll([]));
}
