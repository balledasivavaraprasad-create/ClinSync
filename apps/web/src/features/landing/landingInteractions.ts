/**
 * ClinSync Landing Page Interaction Layer
 * Recreated with 100% fidelity from clinsync-landing.vercel.app
 */

export interface LandingInteractionCallbacks {
  onLaunchApp: (tab?: 'kiosk' | 'ledger' | 'appointments' | 'doctor') => void;
}

export function initLandingInteractions(
  container: HTMLElement,
  callbacks: LandingInteractionCallbacks
): () => void {
  const $ = (s: string, c: ParentNode = container): HTMLElement | null => c.querySelector(s);
  const $$ = (s: string, c: ParentNode = container): HTMLElement[] => Array.from(c.querySelectorAll(s));
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const reduced = hasMatchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const fine = hasMatchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;

  const SafeIO = typeof IntersectionObserver !== 'undefined'
    ? IntersectionObserver
    : (class {
        callback: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
        constructor(callback: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void) {
          this.callback = callback;
        }
        observe(target: Element) {
          this.callback([{ isIntersecting: true, target }]);
        }
        unobserve() {}
        disconnect() {}
      } as unknown as typeof IntersectionObserver);

  document.body.classList.add('clinsync-landing-active', 'is-loading');

  // Maintain active theme preference from ThemeProvider if set; fallback to light if unset
  if (!document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  const cleanupFns: Array<() => void> = [];

  /* cross-module scroll hooks */
  let scrollyHook: (() => void) | null = null;
  let chapterHook: ((y: number) => void) | null = null;
  let navHook: ((y: number) => void) | null = null;

  /* ----------------------------------------------------------
     1. PRELOADER
     ---------------------------------------------------------- */
  const preloader = $('#preloader');
  const plBar = $('#plBar');
  const plPct = $('#plPct');
  let prog = 0;

  const paintPreloader = (p: number) => {
    const rounded = Math.round(p);
    if (plBar) plBar.style.width = rounded + '%';
    if (plPct) plPct.textContent = rounded + '%';
  };

  const tick = setInterval(() => {
    prog = Math.min(94, prog + Math.random() * 12 + 4);
    paintPreloader(prog);
  }, 100);

  const finishPreloader = () => {
    clearInterval(tick);
    paintPreloader(100);
    if (preloader) preloader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
  };

  const timerSafety = setTimeout(finishPreloader, 50);
  cleanupFns.push(() => {
    clearInterval(tick);
    clearTimeout(timerSafety);
  });

  /* ----------------------------------------------------------
     2. WORD SPLITTING for editorial headings
     ---------------------------------------------------------- */
  function splitWords(root: HTMLElement) {
    const ATOMIC: Record<string, boolean> = { EM: true, I: true, STRONG: true };
    const makeWord = (text: string) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word__in';
      inner.textContent = text;
      outer.appendChild(inner);
      return outer;
    };
    const walk = (node: Node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = (child.textContent || '').split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((w) => {
            if (w.trim() === '') frag.appendChild(document.createTextNode(w));
            else frag.appendChild(makeWord(w));
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          const el = child as HTMLElement;
          if (ATOMIC[el.tagName]) {
            const outer = document.createElement('span');
            outer.className = 'word';
            const inner = document.createElement('span');
            inner.className = 'word__in';
            outer.appendChild(inner);
            node.replaceChild(outer, child);
            inner.appendChild(child);
          } else {
            walk(child);
          }
        }
      });
    };
    walk(root);
    root.classList.add('split-words');
    root.classList.remove('reveal');
    $$('.word', root).forEach((w, i) => {
      const inner = $('.word__in', w);
      if (inner) inner.style.transitionDelay = i * 55 + 'ms';
    });
  }

  $$('.sec-title, .metric__title, .cta__title, .promise__lines p').forEach(splitWords);

  /* ----------------------------------------------------------
     3. REVEAL ON SCROLL
     ---------------------------------------------------------- */
  const revealTargets = $$('.reveal, .split-words');
  const io = new SafeIO(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
  );
  revealTargets.forEach((t) => io.observe(t));
  cleanupFns.push(() => io.disconnect());

  /* stagger siblings inside grids */
  $$('.problem__grid, .trust__grid, .stats__grid, .evidence__pillars').forEach((grid) => {
    $$('.reveal', grid).forEach((el, i) => {
      el.style.transitionDelay = i * 70 + 'ms';
    });
  });
  $$('.flow').forEach((flow) => {
    $$('.flow__step', flow).forEach((el, i) => (el.style.transitionDelay = i * 60 + 'ms'));
  });
  $$('#timeline').forEach((tl) => {
    $$('.tl-event', tl).forEach((el, i) => (el.style.transitionDelay = i * 80 + 'ms'));
  });

  /* ----------------------------------------------------------
     4. COUNTERS
     ---------------------------------------------------------- */
  const counters = $$('[data-counter]');
  const counterIO = new SafeIO(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const target = parseFloat(el.dataset.counter || '0');
        const suffix = el.dataset.suffix || '';
        const valEl = $('.stat__val', el);
        if (!valEl) return;
        const dur = 1500;
        let start: number | null = null;
        function step(ts: number) {
          if (!start) start = ts;
          const t = clamp((ts - start) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          valEl!.textContent = Math.round(eased * target) + suffix;
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        counterIO.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => counterIO.observe(c));
  cleanupFns.push(() => counterIO.disconnect());

  /* metric bars */
  const metricIO = new SafeIO(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        $$('.meter__fill', e.target).forEach((f, i) => {
          setTimeout(() => {
            (f as HTMLElement).style.width = (f as HTMLElement).dataset.w || '0%';
          }, i * 220);
        });
        metricIO.unobserve(e.target);
      });
    },
    { threshold: 0.4 }
  );
  const metricSection = $('#metric');
  if (metricSection) metricIO.observe(metricSection);
  cleanupFns.push(() => metricIO.disconnect());

  /* ----------------------------------------------------------
     5. SCROLL ENGINE (progress, nav, parallax, rails)
     ---------------------------------------------------------- */
  const nav = $('#nav');
  const scrollBar = $('#scrollBar');
  const heroEl = $('#hero');
  const heroVideos = $$('.hero__video');
  const flowEl = $('#workflow');
  const flowRail = $('#flowRail');
  const tlEl = $('#timeline');
  const tlRail = $('#tlRail');
  const briefDoc = $('#briefDoc');

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function smoothTo(top: number, dur?: number) {
    if (reduced) {
      window.scrollTo(0, top);
      return;
    }
    const startY = window.scrollY;
    const dist = top - startY;
    const d = dur || Math.min(1400, Math.max(550, Math.abs(dist) * 0.55));
    let t0: number | null = null;
    function step(ts: number) {
      if (t0 === null) t0 = ts;
      const t = clamp((ts - t0) / d, 0, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, startY + dist * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fillRail(section: HTMLElement | null, rail: HTMLElement | null) {
    if (!section || !rail) return;
    const r = section.getBoundingClientRect();
    const total = r.height;
    const progress = clamp((window.innerHeight * 0.5 - r.top) / total, 0, 1);
    rail.style.height = progress * 100 + '%';
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? clamp(y / h, 0, 1) : 0;

    if (scrollBar) scrollBar.style.width = p * 100 + '%';
    if (nav) nav.classList.toggle('is-stuck', y > 40);

    // hero parallax + zoom out
    if (heroEl && !reduced) {
      const hp = clamp(y / window.innerHeight, 0, 1);
      const op = 0.9 - hp * 0.55;
      heroVideos.forEach((v) => {
        v.style.transform = `scale(${1.08 + hp * 0.12}) translateY(${hp * -6}%)`;
        v.style.setProperty('--hero-op', op.toFixed(3));
      });
    }

    fillRail(flowEl, flowRail);
    fillRail(tlEl, tlRail);

    if (briefDoc && !reduced) {
      const r = briefDoc.getBoundingClientRect();
      const c = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      briefDoc.style.transform = `translateY(${clamp(c, -1, 1) * -18}px)`;
    }

    if (scrollyHook) scrollyHook();
    if (chapterHook) chapterHook(y);
    if (navHook) navHook(y);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  cleanupFns.push(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  });
  update();

  /* ----------------------------------------------------------
     6. NAV: burger, active link, smooth scroll
     ---------------------------------------------------------- */
  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');
  if (burger && mobileMenu) {
    const toggleBurger = () => {
      const open = mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', toggleBurger);
    cleanupFns.push(() => burger.removeEventListener('click', toggleBurger));

    $$('#mobileMenu a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        burger.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  const navLinks = $$('.nav__links a');
  const navSections = navLinks
    .map((a) => {
      const href = a.getAttribute('href');
      return { a, el: href && href.startsWith('#') ? $(href) : null };
    })
    .filter((x): x is { a: HTMLElement; el: HTMLElement } => Boolean(x.el));

  let currentNav = '';
  function updateNavActive(y: number) {
    const line = y + window.innerHeight * 0.35;
    const ordered = navSections.slice().sort((a, b) => a.el.offsetTop - b.el.offsetTop);
    let active = '';
    for (const s of ordered) {
      if (s.el.offsetTop <= line) active = s.a.getAttribute('href') || '';
    }
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (y >= h - 4 && ordered.length) active = ordered[ordered.length - 1].a.getAttribute('href') || '';
    if (active === currentNav) return;
    currentNav = active;
    navLinks.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === active));
  }
  navHook = updateNavActive;
  updateNavActive(window.scrollY);

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href') || '';
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      smoothTo(top);
    });
  });

  /* ----------------------------------------------------------
     7. CUSTOM CURSOR
     ---------------------------------------------------------- */
  if (fine) {
    const dot = $('#cursor');
    const ring = $('#cursorRing');
    const label = ring ? $('.cursor-ring__label', ring) : null;
    let mx = window.innerWidth / 2,
      my = window.innerHeight / 2;
    let rx = mx,
      ry = my;
    let animId: number;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot) dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    };
    window.addEventListener('mousemove', onMouseMove);
    cleanupFns.push(() => window.removeEventListener('mousemove', onMouseMove));

    const ringLoop = () => {
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      animId = requestAnimationFrame(ringLoop);
    };
    animId = requestAnimationFrame(ringLoop);
    cleanupFns.push(() => cancelAnimationFrame(animId));

    const interactive = 'a, button, [data-tilt], [data-cursor], .claim, .mini-btn';
    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(interactive) as HTMLElement | null;
      if (!target || !ring || !label) return;
      const txt = target.dataset.cursor || '';
      label.textContent = txt;
      ring.classList.toggle('is-active', Boolean(txt));
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!ring || !label) return;
      const rel = e.relatedTarget as HTMLElement | null;
      if (!rel || !rel.closest(interactive)) {
        ring.classList.remove('is-active');
        label.textContent = '';
      }
    };
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    cleanupFns.push(() => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
    });
  }

  /* ----------------------------------------------------------
     8. TILT CARDS & MAGNETIC BUTTONS
     ---------------------------------------------------------- */
  if (fine && !reduced) {
    $$('[data-tilt]').forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 5}deg) rotateX(${-py * 5}deg) translateY(-6px)`;
        card.style.transition = 'transform .12s linear';
      };
      const onLeave = () => {
        card.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
        card.style.transform = '';
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });

    $$('.btn').forEach((btn) => {
      const onMove = (e: MouseEvent) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${x * 0.12}px, ${y * 0.2}px)`;
      };
      const onLeave = () => (btn.style.transform = '');
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
    });
  }

  /* ----------------------------------------------------------
     9. VOICE WAVEFORM
     ---------------------------------------------------------- */
  const wave = $('#voiceWave');
  if (wave) {
    wave.innerHTML = '';
    const bars = 42;
    const els: HTMLElement[] = [];
    for (let i = 0; i < bars; i++) {
      const s = document.createElement('span');
      wave.appendChild(s);
      els.push(s);
    }
    let t = 0;
    const waveInterval = setInterval(() => {
      t += 0.28;
      els.forEach((s, i) => {
        const v = Math.abs(Math.sin(i * 0.45 + t)) * Math.abs(Math.sin(t * 0.7 + i));
        s.style.height = 8 + v * 44 + 'px';
        s.style.opacity = String(0.45 + v * 0.55);
      });
    }, 70);
    cleanupFns.push(() => clearInterval(waveInterval));
  }

  /* ----------------------------------------------------------
     10. DYNAMIC INTAKE CHAT
     ---------------------------------------------------------- */
  const chat = $('#chat');
  const chatLog = $('#chatLog');
  const chatPhase = $('#chatPhase');
  const chatScript = [
    { who: 'ai', text: "Hi — I'm ClinSync. Tell us what's bothering you today.", phase: 'listening', fields: [] },
    { who: 'patient', text: 'I have stomach pain.', phase: 'extracting known information', fields: ['chief_complaint'] },
    { who: 'ai', text: 'When did the pain begin?', phase: 'missing → duration', fields: ['chief_complaint'] },
    { who: 'patient', text: 'About a week ago.', phase: 'extracting known information', fields: ['chief_complaint', 'duration'] },
    { who: 'ai', text: 'Where do you feel the pain most strongly?', phase: 'missing → location', fields: ['chief_complaint', 'duration'] },
    { who: 'patient', text: 'Upper abdomen.', phase: 'extracting known information', fields: ['chief_complaint', 'duration', 'location'] },
    { who: 'ai', text: 'Does anything make it worse?', phase: 'missing → triggers', fields: ['chief_complaint', 'duration', 'location'] },
    { who: 'patient', text: 'After eating.', phase: 'extracting known information', fields: ['chief_complaint', 'duration', 'location', 'triggers'] },
    { who: 'ai', text: 'Have you experienced nausea or vomiting?', phase: 'missing → associated symptoms', fields: ['chief_complaint', 'duration', 'location', 'triggers'] },
    { who: 'patient', text: 'A little nausea, no vomiting.', phase: 'sufficient information collected', fields: ['chief_complaint', 'duration', 'location', 'triggers', 'associated'] },
  ];

  function setFields(list: string[]) {
    if (!chat) return;
    $$('.cf', chat).forEach((c) => c.classList.toggle('is-known', list.includes(c.dataset.f || '')));
  }

  function addBubble(step: { who: string; text: string }) {
    if (!chatLog) return;
    const b = document.createElement('div');
    b.className = 'bubble bubble--' + (step.who === 'ai' ? 'ai' : 'patient');
    b.textContent = step.text;
    chatLog.appendChild(b);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function runChat() {
    let i = 0;
    const next = () => {
      if (i >= chatScript.length || !chatLog || !chatPhase) return;
      const step = chatScript[i++];
      chatPhase.textContent = step.phase;
      setFields(step.fields);

      if (step.who === 'ai') {
        const typing = document.createElement('div');
        typing.className = 'chat__typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        chatLog.appendChild(typing);
        chatLog.scrollTop = chatLog.scrollHeight;
        setTimeout(() => {
          typing.remove();
          addBubble(step);
          setTimeout(next, 900);
        }, 750);
      } else {
        addBubble(step);
        setTimeout(next, 1000);
      }
    };
    next();
  }

  if (chat) {
    let played = false;
    const chatIO = new SafeIO(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !played) {
            played = true;
            runChat();
            chatIO.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    chatIO.observe(chat);
    cleanupFns.push(() => chatIO.disconnect());
  }

  /* ----------------------------------------------------------
     11. EVIDENCE CLAIM SWITCHING
     ---------------------------------------------------------- */
  const claims = $$('.claim');
  const sources = $$('.source');
  claims.forEach((c) => {
    c.addEventListener('click', () => {
      claims.forEach((x) => x.classList.toggle('is-active', x === c));
      sources.forEach((s) => s.classList.toggle('is-active', s.dataset.src === c.dataset.src));
    });
  });

  /* ----------------------------------------------------------
     12. CHAPTER NAVIGATOR
     ---------------------------------------------------------- */
  const chapterData = [
    { id: 'hero', label: 'Overview' },
    { id: 'problem', label: 'The problem' },
    { id: 'manifesto', label: 'Philosophy' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'intake', label: 'Dynamic intake' },
    { id: 'memory', label: 'Clinical memory' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'brief', label: 'Doctor brief' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'cta', label: 'Get started' },
  ];
  const chaptersNav = $('#chapters');
  const chaptersTrack = $('#chaptersTrack');
  if (chaptersNav && chaptersTrack) {
    chaptersTrack.innerHTML = '';
    chapterData.forEach((c) => {
      const a = document.createElement('a');
      a.className = 'chapter';
      a.href = '#' + c.id;
      a.dataset.chapter = c.id;
      a.innerHTML = `<span class="chapter__dot"></span><span class="chapter__tip">${c.label}</span>`;
      chaptersTrack.appendChild(a);
    });
    const chapterEls = $$('.chapter', chaptersTrack);
    const chapterPts = chapterData
      .map((c) => {
        const el = document.getElementById(c.id);
        return el ? { id: c.id, el } : null;
      })
      .filter(Boolean) as Array<{ id: string; el: HTMLElement }>;
    let currentChapter = '';

    function updateChapter(y: number) {
      const line = y + window.innerHeight * 0.42;
      let id = chapterPts[0] ? chapterPts[0].id : '';
      for (const c of chapterPts) {
        if (c.el.offsetTop <= line) id = c.id;
      }
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (y >= h - 4 && chapterPts.length) id = chapterPts[chapterPts.length - 1].id;
      if (id === currentChapter) return;
      currentChapter = id;
      chapterEls.forEach((el) => el.classList.toggle('is-current', el.dataset.chapter === id));
    }

    chapterHook = updateChapter;
    updateChapter(window.scrollY);

    const heroSec = document.getElementById('hero');
    if (heroSec) {
      const heroWatch = new SafeIO(
        (entries) => entries.forEach((e) => chaptersNav.classList.toggle('is-visible', !e.isIntersecting)),
        { threshold: 0.55 }
      );
      heroWatch.observe(heroSec);
      cleanupFns.push(() => heroWatch.disconnect());
    }
  }

  /* ----------------------------------------------------------
     13. MOUSE SPOTLIGHT
     ---------------------------------------------------------- */
  if (fine && !reduced) {
    const spot = $('#spotlight');
    if (spot) {
      spot.classList.add('is-on');
      let sx = 0,
        sy = 0,
        tx = window.innerWidth / 2,
        ty = window.innerHeight / 2;
      const onMove = (e: MouseEvent) => {
        tx = e.clientX;
        ty = e.clientY;
      };
      window.addEventListener('mousemove', onMove);
      cleanupFns.push(() => window.removeEventListener('mousemove', onMove));

      let spotAnim: number;
      const spotLoop = () => {
        sx = lerp(sx, tx, 0.07);
        sy = lerp(sy, ty, 0.07);
        spot.style.setProperty('--mx', sx + 'px');
        spot.style.setProperty('--my', sy + 'px');
        spotAnim = requestAnimationFrame(spotLoop);
      };
      spotAnim = requestAnimationFrame(spotLoop);
      cleanupFns.push(() => cancelAnimationFrame(spotAnim));
    }
  }

  /* ----------------------------------------------------------
     14. SCROLL-LIT MANIFESTO
     ---------------------------------------------------------- */
  const manifesto = $('#manifestoText');
  if (manifesto) {
    const words = manifesto.textContent?.trim().split(/\s+/) || [];
    manifesto.innerHTML = words
      .map((w) => {
        const accent = /doctor|authority|AI/i.test(w.replace(/[.,—]/g, ''));
        return `<span class="mword${accent ? ' mword--accent' : ''}">${w}</span>`;
      })
      .join(' ');
    const mwords = $$('.mword', manifesto);
    const mIO = new SafeIO(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            mwords.forEach((w, i) => setTimeout(() => w.classList.add('is-lit'), i * 26));
            mIO.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    mIO.observe(manifesto);
    cleanupFns.push(() => mIO.disconnect());
  }

  /* ----------------------------------------------------------
     15. SCROLLYTELLING PIPELINE
     ---------------------------------------------------------- */
  const scrolly = $('#scrolly');
  if (scrolly) {
    const viewport = $('.scrolly__viewport', scrolly);
    const steps = $$('.sc-step', scrolly);
    const docscan = $('#docscan');
    const docStatus = $('#docscanStatus');
    const docPct = $('#docscanPct');
    const scBar = $('#scrollyBar');
    const statusByStep = ['UPLOADED', 'CLASSIFYING', 'OCR / VISION', 'EXTRACTING', 'VALIDATING', 'CLINICAL MEMORY'];
    const pctByStep = [8, 26, 48, 70, 88, 100];
    let current = -1;

    function setScrollyStep(i: number) {
      if (i === current) return;
      current = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      if (docscan) {
        docscan.dataset.active = String(i);
        docscan.classList.toggle('is-scanning', i === 2);
      }
      if (docStatus) docStatus.textContent = statusByStep[i] || statusByStep[0];
      if (docPct) docPct.textContent = (pctByStep[i] || 0) + '%';
    }

    function updateScrolly() {
      if (!viewport) return;
      const r = viewport.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = clamp(-r.top / (total || 1), 0, 1);
      if (scBar) scBar.style.width = p * 100 + '%';
      const i = Math.min(steps.length - 1, Math.floor(p * steps.length));
      setScrollyStep(i);
    }
    scrollyHook = updateScrolly;
    setScrollyStep(0);
  }

  /* ----------------------------------------------------------
     16. WIRE PROTOTYPE LAUNCHER BUTTONS
     ---------------------------------------------------------- */
  const launchButtons = $$('[data-action="launch-app"]');
  launchButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = btn.dataset.tab as 'kiosk' | 'doctor' | 'ledger' | 'appointments' | undefined;
      callbacks.onLaunchApp(targetTab || 'kiosk');
    });
  });

  return () => {
    cleanupFns.forEach((fn) => fn());
    document.body.classList.remove('clinsync-landing-active', 'is-loading', 'is-ready');
  };
}
