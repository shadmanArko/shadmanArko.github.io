/**
 * Career tour controller: autopilot, narration panel, tooltip, detail dialog, voice, keyboard.
 * All text comes from profile.json (embedded by Tour.astro as JSON + the server-rendered list).
 */
import { Engine } from './engine';
import { STOPS, TAKEOFF_X } from './world';

interface Station {
  id: string;
  kind: string;
  name: string;
  role: string;
  period: string;
  city: string;
  overview: string;
  narration: string[];
}

type Mode = 'intro' | 'walking' | 'holding' | 'done';

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;

export function initTour(root: HTMLElement) {
  const data: Station[] = JSON.parse($(root, '[data-ct-json]').textContent || '[]');
  if (!data.length) return;
  root.classList.add('js');

  const stage = $(root, '[data-stage]');
  const cv = $<HTMLCanvasElement>(root, '[data-canvas]');
  const layer = $(root, '[data-layer]');
  const tip = $(root, '[data-tip]');
  const panel = $(root, '[data-panel]');
  const live = $(root, '[data-live]');
  const kicker = $(root, '[data-kicker]');
  const pname = $(root, '[data-pname]');
  const pmeta = $(root, '[data-pmeta]');
  const bullets = $(root, '[data-bullets]');
  const prog = $(root, '[data-prog]');
  const more = $<HTMLButtonElement>(root, '[data-more]');
  const playBtn = $<HTMLButtonElement>(root, '[data-act="play"]');
  const voiceBtn = $<HTMLButtonElement>(root, '[data-act="voice"]');
  const controlsEl = $(root, '.ct-controls');
  const status = $(root, '[data-status]');
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
  const stops = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-stop]'));
  const dialog = $<HTMLDialogElement>(root, '[data-dialog]');
  const N = data.length;

  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const wideMQ = matchMedia('(min-width: 900px)');

  /* ------------------------------------------------------------- state */
  let mode: Mode = 'intro';
  let cur = 0;
  let playing = false;
  let speed = 1;
  const hold = { el: 0, dur: 8, after: 0 };
  let tipFor = -1;

  const engine = new Engine(
    cv,
    data.map((d) => STOPS[d.id].x),
    { reduced: reducedMQ.matches },
    {
      onArrive: (i) => arrive(i),
      onCamera: (camCss) => {
        layer.style.transform = `translate3d(${-camCss}px,0,0)`;
        if (tipFor >= 0) placeTip(tipFor);
      },
      onLayout: (k, oy) => {
        layer.style.setProperty('--k', String(k));
        layer.style.setProperty('--oy', oy + 'px');
      },
    },
  );

  /* ------------------------------------------------------------- panel */
  const holdFor = (i: number) => {
    const chars = data[i].narration.join(' ').length;
    return Math.min(12, Math.max(7, 2.5 + chars * 0.022));
  };
  const crossesFlight = (a: number, b: number) => (STOPS[data[a].id].x - TAKEOFF_X) * (STOPS[data[b].id].x - TAKEOFF_X) < 0;

  function setCurrent(i: number) {
    stops.forEach((b, k) => b.classList.toggle('is-current', k === i));
    dots.forEach((d, k) => {
      d.classList.toggle('is-on', k <= i);
      d.classList.toggle('is-now', k === i);
    });
    status.textContent = `Stop ${i + 1} of ${N}`;
  }

  function showStation(i: number) {
    const d = data[i];
    panel.classList.remove('is-walking');
    kicker.textContent = `Stop ${i + 1} of ${N} · ${d.city}`;
    pname.textContent = d.name;
    pmeta.textContent = `${d.role} · ${d.period}`;
    bullets.replaceChildren(
      ...d.narration.map((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        return li;
      }),
    );
    bullets.hidden = false;
    more.hidden = false;
    more.textContent = `Read more about ${d.name}`;
    more.dataset.i = String(i);
    restartFade();
    live.textContent = `Stop ${i + 1} of ${N}: ${d.name}. ${d.role}, ${d.period}. ${d.narration.join(' ')}`;
    setCurrent(i);
    setProgress(0);
  }

  function showWalking(from: number, to: number) {
    const d = data[to];
    panel.classList.add('is-walking');
    kicker.textContent = crossesFlight(from, to)
      ? to > from
        ? 'Flying from Dhaka to Berlin'
        : 'Flying back to Dhaka'
      : `On my way · stop ${to + 1} of ${N}`;
    pname.textContent = d.name;
    pmeta.textContent = `${d.role} · ${d.period}`;
    bullets.replaceChildren();
    bullets.hidden = true;
    more.hidden = true;
    restartFade();
    setCurrent(to);
    setProgress(0);
  }

  function restartFade() {
    panel.classList.remove('fade');
    void panel.offsetWidth;
    panel.classList.add('fade');
  }
  function setProgress(p: number) {
    prog.style.transform = `scaleX(${Math.max(0, Math.min(1, p)).toFixed(4)})`;
  }

  function syncButtons() {
    const label = playing ? 'Pause' : mode === 'done' ? 'Replay' : mode === 'intro' ? 'Play tour' : 'Play';
    $(playBtn, '[data-label]').textContent = label;
    playBtn.setAttribute('aria-label', playing ? 'Pause the tour' : mode === 'done' ? 'Replay the tour from the start' : 'Play the tour');
    playBtn.classList.toggle('is-playing', playing);
    root.classList.toggle('is-playing', playing);
    engine.setTalking(mode === 'holding' && (playing || speech.active));
  }

  /* ------------------------------------------------------------- flow */
  function arrive(i: number) {
    if (i !== cur) return;
    mode = 'holding';
    hold.el = 0;
    hold.after = 0;
    hold.dur = holdFor(i);
    showStation(i);
    if (voiceOn) speakFrom(i, 0);
    syncButtons();
    kick();
  }

  function goTo(i: number) {
    if (i < 0 || i >= N) return;
    stopSpeech();
    const from = mode === 'intro' ? 0 : cur;
    cur = i;
    mode = 'walking';
    showWalking(from, i);
    engine.setPaused(false);
    engine.walkTo(i);
    syncButtons();
  }

  function advance() {
    if (cur < N - 1) goTo(cur + 1);
    else finish();
  }

  function finish() {
    mode = 'done';
    playing = false;
    stopSpeech();
    kicker.textContent = `That's the tour · ${N} of ${N}`;
    setProgress(1);
    syncButtons();
  }

  function play() {
    // Pressing Play is an explicit request for the animation, so walk even when the OS asks for reduced motion.
    engine.setReduced(false);
    if (mode === 'done') {
      restart();
      return;
    }
    playing = true;
    engine.recenter();
    if (mode === 'intro') {
      cur = 0;
      if (engine.walking || Math.abs(engine.x - STOPS[data[0].id].x) > 0.5) goTo(0);
      else arrive(0);
    } else if (mode === 'walking') engine.setPaused(false);
    else if (mode === 'holding' && voiceOn && !speech.done) speakFrom(cur, speech.k);
    syncButtons();
    kick();
  }

  function pause() {
    playing = false;
    if (mode === 'walking') engine.setPaused(true);
    if (speech.active) {
      speech.token++;
      synth?.cancel();
      speech.active = false;
    }
    syncButtons();
  }

  function restart() {
    engine.setReduced(false);
    stopSpeech();
    playing = true;
    cur = 0;
    engine.jumpTo(0);
    arrive(0);
  }

  function next() {
    if (mode === 'intro') {
      cur = 0;
      if (engine.walking) goTo(0);
      else arrive(0);
      return;
    }
    if (cur < N - 1) goTo(cur + 1);
  }
  function prev() {
    if (mode === 'intro') return;
    if (cur > 0) goTo(cur - 1);
  }

  /* ------------------------------------------------------------- clock */
  let raf = 0;
  let last = 0;
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    raf = 0;
    const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
    last = now;
    if (mode !== 'holding') return;
    if (voiceOn) {
      setProgress(speechProgress());
      if (speech.done && playing) {
        hold.after += dt;
        if (hold.after > 1.2) return advance();
      }
    } else if (playing) {
      hold.el += dt * speed;
      setProgress(hold.el / hold.dur);
      if (hold.el >= hold.dur) return advance();
    }
    if (playing || speech.active) kick();
  }

  /* ------------------------------------------------------------- voice */
  const synth: SpeechSynthesis | null = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
  let voiceOn = false;
  let voice: SpeechSynthesisVoice | null = null;
  let maleVoice = false;
  const speech = { token: 0, k: 0, n: 0, active: false, done: true, t0: 0, est: 1, keep: null as SpeechSynthesisUtterance | null, timer: 0 };

  // macOS/iOS novelty voices that should never narrate a CV.
  const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Fred|Grandma|Grandpa|Rocko|Shelley|Sandy|Flo|Eddy|Reed/i;
  // Natural-sounding male English voices by platform:
  // Apple (macOS/iOS) · Microsoft (Windows, Edge "Natural") · Android Google TTS male voice codes.
  const MALE =
    /\b(Daniel|Arthur|Oliver|Tom|Evan|Nathan|Aaron|Alex|Rishi|Gordon|Lee|Microsoft (Ryan|Guy|Andrew|Brian|Christopher|Eric|Steffan|Thomas|Roger|William|Liam|David|George|Mark|James|Richard))\b|Google UK English Male|en-(us|gb|au|in)-x-(iol|iom|tpd|gbd|rjs|gbg|aud|ene)/i;
  const NATURAL = /natural|neural|premium|enhanced|online/i;
  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang) && !NOVELTY.test(v.name));
    const isEdge = /Edg\//.test(navigator.userAgent);
    const score = (v: SpeechSynthesisVoice) => {
      const name = `${v.name} ${v.voiceURI}`;
      // Chrome's online "Google ..." voices often fail silently; Edge's online "Natural" voices are reliable.
      const usable = v.localService || (isEdge && /Microsoft/i.test(v.name)) ? 8 : /Google/i.test(v.name) ? -15 : 0;
      return (
        usable +
        (MALE.test(name) ? 20 : 0) +
        (NATURAL.test(v.name) ? 6 : 0) +
        (/en[-_]GB/i.test(v.lang) ? 3 : /en[-_]US/i.test(v.lang) ? 2 : 1)
      );
    };
    voice = vs.sort((a, b) => score(b) - score(a))[0] || null;
    maleVoice = !!voice && MALE.test(`${voice.name} ${voice.voiceURI}`);
  }
  if (synth) {
    voiceBtn.hidden = false;
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  }

  function speakFrom(i: number, k: number) {
    if (!synth) return;
    speech.token++;
    const token = speech.token;
    synth.cancel();
    speech.n = data[i].narration.length;
    speech.k = k;
    speech.active = true;
    speech.done = false;
    hold.after = 0;
    window.setTimeout(() => speakBullet(token, i, k), 80);
    kick();
    syncButtons();
  }
  function speakBullet(token: number, i: number, k: number, fallback = false) {
    if (!synth || token !== speech.token) return;
    clearTimeout(speech.timer);
    highlight(k);
    if (k >= speech.n) {
      speech.active = false;
      speech.done = true;
      syncButtons();
      kick();
      return;
    }
    speech.k = k;
    const text = data[i].narration[k];
    const u = new SpeechSynthesisUtterance(text);
    const useVoice = fallback ? null : voice;
    if (useVoice) u.voice = useVoice;
    u.lang = useVoice?.lang || 'en-GB';
    u.rate = Math.min(1.5, Math.max(0.7, 0.95 * speed));
    // No male voice on this device: lower the default voice slightly for a deeper, calmer read.
    u.pitch = useVoice && maleVoice ? 1 : 0.85;
    speech.keep = u; // keep a reference: Chrome drops events of collected utterances
    speech.t0 = performance.now();
    speech.est = (text.length * 68) / u.rate + 400;
    let ended = false;
    let started = false;
    u.onstart = () => (started = true);
    const done = () => {
      if (ended || token !== speech.token) return;
      ended = true;
      // The chosen voice never actually spoke (silent failure): retry this bullet once with the device default voice.
      if (!started && !fallback) {
        clearTimeout(speech.timer);
        if (voice) voice = null; // stop using the broken voice for the rest of the tour
        return speakBullet(token, i, k, true);
      }
      speakBullet(token, i, k + 1);
    };
    u.onend = done;
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      done();
    };
    speech.timer = window.setTimeout(done, speech.est * 2 + 4000); // safety net if onend never fires
    if (synth.paused) synth.resume(); // Chrome can leave the queue paused after a tab switch
    synth.speak(u);
  }
  function speechProgress() {
    if (speech.done) return 1;
    const part = Math.min(0.95, (performance.now() - speech.t0) / speech.est);
    return (speech.k + part) / Math.max(1, speech.n);
  }
  function highlight(k: number) {
    Array.from(bullets.children).forEach((li, j) => li.classList.toggle('is-speaking', j === k && voiceOn));
  }
  function stopSpeech() {
    speech.token++;
    clearTimeout(speech.timer);
    if (synth && (speech.active || synth.speaking)) synth.cancel();
    speech.active = false;
    speech.done = true;
    highlight(-1);
  }
  function setVoice(on: boolean) {
    voiceOn = on && !!synth;
    voiceBtn.setAttribute('aria-pressed', String(voiceOn));
    $(voiceBtn, '[data-label]').textContent = voiceOn ? 'Voice on' : 'Voice off';
    if (voiceOn) {
      if (mode === 'holding') speakFrom(cur, 0);
    } else {
      const p = speechProgress();
      stopSpeech();
      if (mode === 'holding') hold.el = Math.max(hold.el, Math.min(p, 1) * hold.dur);
      kick();
    }
    syncButtons();
  }

  /* ------------------------------------------------------------- tooltip */
  function placeTip(i: number) {
    const b = stops[i];
    const sign = b.querySelector('.ct-sign') as HTMLElement;
    const sr = stage.getBoundingClientRect();
    const r = sign.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = r.left + r.width / 2 - sr.left - tw / 2;
    left = Math.max(8, Math.min(sr.width - tw - 8, left));
    let top = r.top - sr.top - th - 8;
    if (top < 8) top = r.bottom - sr.top + 8;
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
  function showTip(i: number) {
    tipFor = i;
    const d = data[i];
    tip.replaceChildren();
    const s = document.createElement('strong');
    s.textContent = d.name;
    const p = document.createElement('span');
    p.textContent = d.overview;
    const h = document.createElement('em');
    h.textContent = 'Click for details';
    tip.append(s, p, h);
    tip.hidden = false;
    placeTip(i);
  }
  function hideTip() {
    tipFor = -1;
    tip.hidden = true;
  }

  /* ------------------------------------------------------------- dialog */
  let opener: HTMLElement | null = null;
  let resumeAfter = false;
  function openDetail(i: number, from: HTMLElement) {
    hideTip();
    const d = data[i];
    opener = from;
    resumeAfter = playing;
    if (playing) pause();
    $(dialog, '[data-dkicker]').textContent = `${d.kind === 'education' ? 'Education' : 'Work'} · ${d.city}`;
    $(dialog, '[data-dtitle]').textContent = d.name;
    $(dialog, '[data-dmeta]').textContent = `${d.role} · ${d.period}`;
    const src = root.querySelector(`[data-detail="${d.id}"] .ct-d-body`);
    const body = $(dialog, '[data-dbody]');
    body.replaceChildren(src ? src.cloneNode(true) : document.createTextNode(d.overview));
    body.scrollTop = 0;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    ($(dialog, '[data-close]') as HTMLElement).focus();
  }
  function closeDetail() {
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener('close', () => {
    opener?.focus();
    opener = null;
    if (resumeAfter) {
      resumeAfter = false;
      play();
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDetail(); // backdrop
  });
  $(dialog, '[data-close]').addEventListener('click', closeDetail);
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(
      (el) => el.offsetParent !== null,
    );
    if (!f.length) return;
    const first = f[0];
    const lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ------------------------------------------------------------- wiring */
  stops.forEach((b, i) => {
    b.addEventListener('click', () => openDetail(i, b));
    b.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') showTip(i);
    });
    b.addEventListener('pointerleave', () => {
      if (tipFor === i && document.activeElement !== b) hideTip();
    });
    b.addEventListener('focus', () => {
      showTip(i);
      // keep a focused station on screen
      const x = engine.screenX(STOPS[data[i].id].x);
      const w = stage.clientWidth;
      if (x < 40 || x > w - 40) engine.panBy(w / 2 - x);
    });
    b.addEventListener('blur', () => {
      if (tipFor === i) hideTip();
    });
  });
  // iOS Safari only lets a page speak if the first speak() happens synchronously inside a tap.
  // Speak a silent utterance in the gesture once; later (timer-driven) narration then works.
  let speechPrimed = false;
  function primeSpeech() {
    if (!synth || speechPrimed) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
      speechPrimed = true;
    } catch {
      /* ignore */
    }
  }

  more.addEventListener('click', () => openDetail(Number(more.dataset.i || cur), more));

  root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'voice' && !voiceOn) primeSpeech();
      if ((a === 'play' || a === 'bigplay' || a === 'restart') && voiceOn) primeSpeech();
      const starting = a === 'bigplay' || (a === 'play' && !playing);
      if (a === 'play') (playing ? pause : play)();
      if (a === 'bigplay') play();
      // On phones, bring controls + map fully into view (clear of the bottom tab bar) when the tour starts.
      if (starting && !wideMQ.matches) controlsEl.scrollIntoView({ block: 'start', behavior: reducedMQ.matches ? 'auto' : 'smooth' });
      if (a === 'prev') prev();
      if (a === 'next') next();
      if (a === 'restart') restart();
      if (a === 'voice') setVoice(!voiceOn);
      if (a === 'speed') {
        speed = Number(b.dataset.speed) || 1;
        engine.speed = speed;
        root.querySelectorAll('[data-act="speed"]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      }
    }),
  );

  root.addEventListener('keydown', (e) => {
    if (dialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement;
    const interactive = t.closest('a, input, select, textarea, [data-list]');
    if (e.key === 'Escape') {
      hideTip();
      return;
    }
    if (interactive) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      // buttons keep their own Space behaviour; elsewhere Space plays / pauses
      if (t.closest('button')) return;
      e.preventDefault();
      (playing ? pause : play)();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  });

  // drag / swipe to look around (the walker keeps his place)
  // focus must never scroll the clipped stage itself (older browsers without overflow: clip)
  stage.addEventListener('scroll', () => {
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
  });
  let drag: { id: number; x: number; moved: boolean } | null = null;
  let suppressClick = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-panel]')) return;
    drag = { id: e.pointerId, x: e.clientX, moved: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 7) return;
    if (!drag.moved) {
      drag.moved = true;
      hideTip();
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      stage.classList.add('is-dragging');
    }
    drag.x = e.clientX;
    engine.panBy(dx);
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
    }
    stage.classList.remove('is-dragging');
    drag = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        e.stopPropagation();
        e.preventDefault();
        suppressClick = false;
      }
    },
    true,
  );
  stage.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1) {
        e.preventDefault();
        engine.panBy(-e.deltaX);
      }
    },
    { passive: false },
  );

  /* ------------------------------------------------------------- layout + visibility */
  const updateInset = () => {
    const sr = stage.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const overlay = wideMQ.matches && pr.top < sr.bottom && pr.right > sr.left;
    engine.setInset(overlay ? pr.right - sr.left + 12 : 0);
  };
  const ro = new ResizeObserver(() => {
    engine.layout();
    updateInset();
    if (tipFor >= 0) placeTip(tipFor);
  });
  ro.observe(stage);
  ro.observe(panel);
  wideMQ.addEventListener?.('change', updateInset);
  reducedMQ.addEventListener?.('change', () => engine.setReduced(reducedMQ.matches));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => engine.setVisible(es[0].isIntersecting), { rootMargin: '100px' }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) kick();
  });

  setCurrent(0);
  updateInset();
  // Voice is on by default: narration starts with the first press of Play (a user gesture).
  if (synth) setVoice(true);
  syncButtons();
  root.classList.add('is-ready');

  // test hook (read-only state for automated checks)
  (root as HTMLElement & { _tour?: unknown })._tour = {
    get state() {
      return { mode, cur, playing, speed, x: engine.x, voiceOn };
    },
  };
}
