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
