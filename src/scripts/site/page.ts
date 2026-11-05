// Page-level enhancements for the main page. The page already works without
// any of this: links are plain anchors, tickets are native <details>, every
// project, note and certificate is in the DOM and visible.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)] as T[];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------- full menu dialog
const menu = document.getElementById('full-menu') as HTMLDialogElement | null;
let menuOpener: HTMLElement | null = null;
function openMenu(opener?: HTMLElement | null) {
  if (!menu || menu.open) return;
  menuOpener = opener ?? (document.activeElement as HTMLElement | null);
  menu.showModal();
}
menu?.addEventListener('close', () => {
  // Return focus unless a menu link already moved it to a section.
  if (menuOpener && !menu.dataset.navigated) menuOpener.focus({ preventScroll: true });
  delete menu.dataset.navigated;
});
menu?.addEventListener('click', (e) => {
  if (e.target === menu) menu.close(); // backdrop click
});

document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement;
  const opener = el.closest<HTMLElement>('[data-open-menu]');
  if (opener) { openMenu(opener); return; }
  const closer = el.closest<HTMLElement>('[data-close-menu]');
  if (closer && menu?.open) {
    if (closer.tagName === 'A') {
      menu.dataset.navigated = '1';
      const id = closer.getAttribute('href')?.slice(1);
      menu.close();
      // After the browser has followed the link, move focus to the heading.
      if (id) setTimeout(() => focusSection(id), 0);
    } else menu.close();
    return;
  }
  const copy = el.closest<HTMLButtonElement>('[data-copy]');
  if (copy) { copyLink(copy); return; }
  if (el.closest('[data-print]')) { window.print(); return; }
  // In-page links: make sure the target is visible (a project hidden by a
  // filter, a certificate past "show all"), then move focus to it for
  // keyboard and screen-reader users. Only on user clicks, never on load.
  const a = el.closest<HTMLAnchorElement>('a[href^="#"]');
  const id = a?.getAttribute('href')?.slice(1);
  if (id) {
    reveal(id);
    setTimeout(() => focusSection(id), 0);
  }
});

function focusSection(id: string) {
  const sec = document.getElementById(id);
  if (!sec) return;
  let t: HTMLElement | null;
  if (sec instanceof HTMLDetailsElement) t = sec.querySelector('summary');
  else if (sec.matches('h1,h2,h3,h4')) t = sec;
  else t = sec.querySelector<HTMLElement>('h1, h2, h3'); // first heading in document order
  t ??= sec;
  if (!t.matches('a[href], button, summary, input, select, textarea, [tabindex]')) t.setAttribute('tabindex', '-1');
  t.focus({ preventScroll: true });
}

/** Un-hide a filtered-out target before the browser scrolls to it. */
function reveal(id: string) {
  const t = document.getElementById(id);
  if (t?.matches('.proj') && t.hidden) setProjectFilter('all');
}

// ---------------------------------------------------------------- tickets: deep links + copy
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  reveal(id);
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) {
    el.open = true;
    // Re-align once the ticket is open and again after the web fonts settle
    // (rAF would wait forever in a background tab, so use timers/promises).
    const go = () => el.scrollIntoView({ block: 'start' });
    setTimeout(go, 0);
    document.fonts?.ready.then(() => setTimeout(go, 0));
  }
}
async function copyLink(btn: HTMLButtonElement) {
  const id = btn.dataset.copy!;
  const url = `${location.origin}${location.pathname}#${id}`;
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = 'Link copied ✓';
  } catch {
    history.replaceState(null, '', `#${id}`);
    btn.textContent = 'Link is in the address bar';
  }
  setTimeout(() => { btn.textContent = label; }, 2200);
}

// ---------------------------------------------------------------- all projects: tag filter + count
const pChips = $$<HTMLButtonElement>('[data-pfilter]');
const pCards = $$('.proj[data-tags]');
const pCount = document.querySelector<HTMLElement>('[data-pcount]');
function setProjectFilter(f: string) {
  pChips.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.pfilter === f)));
  let n = 0;
  pCards.forEach((b) => {
    const show = f === 'all' || b.dataset.tags!.split(' ').includes(f);
    b.hidden = !show;
    if (show) n++;
  });
  if (pCount) pCount.textContent = `Showing ${n} of ${pCards.length} projects`;
}
pChips.forEach((c) => c.addEventListener('click', () => setProjectFilter(c.dataset.pfilter!)));

// ---------------------------------------------------------------- experience: newest first / career order
const jobs = document.querySelector<HTMLOListElement>('[data-jobs]');
const orderBtns = $$<HTMLButtonElement>('[data-order]');
let order = 'newest';
orderBtns.forEach((b) =>
  b.addEventListener('click', () => {
    const want = b.dataset.order!;
    orderBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (want === order || !jobs) return;
    order = want;
    jobs.append(...[...jobs.children].reverse());
  }),
);

// ---------------------------------------------------------------- references: filter + read more
const rChips = $$<HTMLButtonElement>('[data-rfilter]');
const notes = $$('.note[data-station]');
const rStatus = document.querySelector<HTMLElement>('[data-rstatus]');
rChips.forEach((c) =>
  c.addEventListener('click', () => {
    const f = c.dataset.rfilter!;
    rChips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    let n = 0;
    notes.forEach((nt) => {
      const show = f === 'all' || nt.dataset.station === f;
      nt.hidden = !show;
      if (show) n++;
    });
    if (rStatus) rStatus.textContent = `${plural(n, 'recommendation')} shown.`;
  }),
);
$$<HTMLButtonElement>('.note .more').forEach((b) => {
  const note = b.closest('.note')!;
  note.classList.add('clamped');
  b.hidden = false;
  b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open));
    note.classList.toggle('clamped', !open);
    b.textContent = open ? 'Read less' : 'Read more';
  });
});

// ---------------------------------------------------------------- certificates: area filter + show all
const certList = document.querySelector<HTMLElement>('[data-certs]');
if (certList) {
  const certs = $$('.cert[data-area]', certList);
  const cChips = $$<HTMLButtonElement>('[data-cfilter]');
  const more = document.querySelector<HTMLButtonElement>('[data-cert-more]');
  const cStatus = document.querySelector<HTMLElement>('[data-cert-status]');
  const limit = Number(certList.dataset.show) || 5;
  let area = 'all';
  let all = false;
  const render = (announce = false) => {
    const match = certs.filter((c) => area === 'all' || c.dataset.area === area);
    certs.forEach((c) => { c.hidden = true; });
    match.forEach((c, i) => { c.hidden = !all && i >= limit; });
    const shown = all ? match.length : Math.min(limit, match.length);
    if (more) {
      more.hidden = match.length <= limit;
      more.setAttribute('aria-expanded', String(all));
      more.textContent = all ? 'Show fewer' : `Show all (${match.length})`;
    }
    if (announce && cStatus) cStatus.textContent = `${shown} of ${plural(match.length, 'certificate')} shown.`;
  };
  cChips.forEach((c) =>
    c.addEventListener('click', () => {
      area = c.dataset.cfilter!;
      all = false;
      cChips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      render(true);
    }),
  );
  more?.addEventListener('click', () => {
    all = !all;
    const firstNew = certs.find((c) => c.hidden && (area === 'all' || c.dataset.area === area));
    render(true);
    // Move focus to the first newly shown frame so keyboard users land on it.
    if (all && firstNew) {
      firstNew.setAttribute('tabindex', '-1');
      firstNew.focus({ preventScroll: false });
    }
  });
  render();
}

// ---------------------------------------------------------------- current section in the navs
const navLinks = $$<HTMLAnchorElement>('.hud-nav a, .chalkboard a, .tabbar a');
// Sub-sections light up their parent tab (e.g. How I work -> AI work).
const PARENT: Record<string, string> = {
  'how-i-work': 'ai-work',
  about: 'experience',
  credentials: 'experience',
  references: 'experience',
};
const sections = $$('main > section, main > header');
const io = new IntersectionObserver(
  (entries) => {
    const vis = entries.filter((e) => e.isIntersecting);
    if (!vis.length) return;
    const id = vis[0].target.id;
    navLinks.forEach((a) => {
      const href = a.getAttribute('href')!.slice(1);
      const viaParent = PARENT[id] === href && !a.closest('.chalkboard');
      if (href === id || viaParent) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  },
  { rootMargin: '-45% 0px -50% 0px' },
);
sections.forEach((s) => io.observe(s));

// ---------------------------------------------------------------- proof count-up
if (!reduce()) {
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end) || end < 2) return;
    const t0 = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const u = Math.min(1, (t - t0) / dur);
      // Stepped, not smooth: 8 visible steps.
      el.textContent = String(Math.round((Math.floor(u * 8) / 8) * end));
      if (u < 1) requestAnimationFrame(step);
      else el.textContent = String(end);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
    // rAF does not run in background tabs: never leave a "0" on screen.
    setTimeout(() => { el.textContent = String(end); }, dur + 400);
  });
}

// ---------------------------------------------------------------- deep links (last: filters are ready)
openFromHash();
addEventListener('hashchange', openFromHash);
