/* ─────────────────────────────────────────────────────────────
   Se Yeon Choi — portfolio
   ───────────────────────────────────────────────────────────── */
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1 · every visit gets its own accent colour ────────── */
  const hue = Math.floor(Math.random() * 360);
  const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;
  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const accent = hslToHex(hue, 52, 52);
  document.documentElement.style.setProperty('--accent', accent);

  /* ── 2 · theme (light = seungmee, dark = andychung) ────── */
  const root = document.documentElement;
  const saved = localStorage.getItem('sy-theme');
  if (saved) root.dataset.theme = saved;
  $('#theme').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('sy-theme', next);
  });

  /* ── 3 · character-by-character reveal ─────────────────── */
  const charSpan = (c, delay, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c;
    s.style.setProperty('--d', `${delay}ms`);
    s.style.setProperty('--cd', `${i * 14}ms`);   // hover colour sweep
    return s;
  };

  /* flat text (project titles) */
  const split = (el, start = 0, step = 22) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((c, i) => el.appendChild(charSpan(c, start + i * step, i)));
    return start + text.length * step;
  };

  /* prose: walk the tree so links and <br> survive, and keep whole
     words together so inline-block characters cannot break mid-word */
  const splitTree = (node, state) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'w';
          [...part].forEach(c => { w.appendChild(charSpan(c, state.t, 0)); state.t += state.step; });
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR' && !child.dataset.nosplit) {
        splitTree(child, state);
      }
    });
  };

  /* ── 4 · prose panels ──────────────────────────────────── */
  const panels  = { bio: $('#panel-bio'), about: $('#panel-about'), contact: $('#panel-contact') };
  const section = $('#section');
  const labels  = { bio: ['PROJECTS', '프로젝트'], about: ['ABOUT', '소개'], contact: ['CONTACT', '연락'] };
  let current = 'bio';
  let lang = 'en';

  const applyLang = panel => {
    $$('.lang-en', panel).forEach(el => { el.hidden = lang !== 'en'; });
    $$('.lang-kr', panel).forEach(el => { el.hidden = lang !== 'kr'; });
  };

  /* restore the untouched markup, then re-split the visible language */
  const typeset = (panel, start = 0) => {
    if (panel._raw == null) panel._raw = panel.innerHTML;
    panel.innerHTML = panel._raw;
    applyLang(panel);
    if (reduced) return;
    const block = $(lang === 'en' ? '.lang-en' : '.lang-kr', panel);
    const state = { t: start, step: 4 };
    splitTree(block, state);
    /* the experience rows come in as whole lines, after the prose has typed */
    $$('.exp li', block).forEach((li, i) => li.style.setProperty('--rd', `${state.t + 60 + i * 70}ms`));
  };

  const show = (key, delay = 0) => {
    current = key;
    Object.entries(panels).forEach(([k, el]) => {
      const on = k === key;
      el.hidden = !on;
      if (on) { typeset(el, delay); void el.offsetWidth; }   // reflow, so the fade still runs
      el.classList.toggle('is-on', on);
    });
    section.textContent = labels[key][lang === 'en' ? 0 : 1];
    fit();
    $$('.pnav[data-panel]').forEach(b => b.classList.toggle('is-on', b.dataset.panel === key));
  };

  $$('.pnav[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => show(current === btn.dataset.panel ? 'bio' : btn.dataset.panel));
  });

  $('#home').addEventListener('click', () => show('bio'));   // the name goes home

  /* her own thumbnail component, with the still behind it so it is never blank */
  const liveStage = (thumb, still) => {
    const stage = document.createElement('div');
    stage.className = 'thumb-stage';
    if (still) stage.style.backgroundImage = `url("${still}")`;
    if (thumb && customElements.get('live-frame')) {
      stage.appendChild(document.createElement(thumb));
      stage.classList.add('is-live');
      setTimeout(() => {                       /* her boot queue waits on an observer a
                                                  nested scroller can leave asleep */
        const host = stage.firstElementChild;
        const lf = host && host.shadowRoot && host.shadowRoot.querySelector('live-frame');
        if (lf && !lf.querySelector('iframe') && lf._boot) lf._boot();
      }, 600);
    }
    return stage;
  };

  /* ── 5 · project hover → preview on the left ───────────── */
  const preview = $('#preview');
  const media   = $('#preview-media');
  const pTitle  = $('#preview-title');
  const pDesc   = $('#preview-desc');

  const stages = {};                       /* one live thumbnail per project, kept alive */

  const fill = row => {
    const i    = $$('.row').indexOf(row);
    const name = row.dataset[lang] || $('.name', row).textContent;
    const year = row.dataset.year || '';
    const desc = row.dataset[lang === 'en' ? 'descEn' : 'descKr'] || '';
    const img  = row.dataset.img;

    pTitle.textContent = year ? `${name} / ${year}` : name;
    pDesc.textContent  = desc;

    if (row.dataset.thumb || img) {
      if (!stages[i]) {
        stages[i] = liveStage(row.dataset.thumb, img);
        media.appendChild(stages[i]);
      }
      Object.entries(stages).forEach(([k, st]) => { st.hidden = +k !== i; });
      media.classList.add('has-img');
      media.style.backgroundImage = '';
    } else {
      media.classList.remove('has-img');
      const h = (hue + i * 24) % 360;
      media.style.backgroundImage =
        `linear-gradient(140deg, ${hsl(h, 58, 62)}, ${hsl((h + 46) % 360, 50, 44)})`;
    }
  };

  $$('.row').forEach(row => {
    const on = () => {
      fill(row);
      preview.classList.add('is-on');
      preview.setAttribute('aria-hidden', 'false');
      document.body.classList.add('previewing');
    };
    const off = () => {
      preview.classList.remove('is-on');
      preview.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('previewing');
    };
    row.addEventListener('mouseenter', on);
    row.addEventListener('mouseleave', off);
    row.addEventListener('focusin', on);
    row.addEventListener('focusout', off);
  });

  /* ── 5b · click a project → the case study, layered over the page ── */
  const sheet = $('#sheet');
  const caseEl = $('#case');
  const sideEl = $('#case-side');
  const heroEl = $('#case-hero');
  const bodyEl = $('#sheet-body');
  let cases = null;            /* cases.json, loaded once */
  let openIdx = -1;
  let lastFocus = null;
  let closing = 0;                 /* pending hide, cancelled if it reopens first */

  const closePreview = () => {
    preview.classList.remove('is-on');
    preview.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('previewing');
  };

  /* videos load only when they scroll into the layer, then loop quietly */
  const seen = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        v.muted = true;
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { root: null, rootMargin: '400px', threshold: .01 }) : null;
  const watchVideo = v => { if (seen) seen.observe(v); };

  const EYEBROW = { en: 'The question', kr: '질문' };

  const renderCase = () => {
    if (openIdx < 0 || !cases) return;
    const c = cases[openIdx];
    const d = c[lang] || c.en;
    const frag = document.createDocumentFragment();
    const add = (tag, text, cls) => {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      el.textContent = text;
      frag.appendChild(el);
      return el;
    };

    const side = document.createDocumentFragment();
    const hero = document.createDocumentFragment();
    const put = (frag, tag, text, cls) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      frag.appendChild(n);
      return n;
    };
    const tagRow = () => {
      if (!d.tags || !d.tags.length) return null;
      const row = document.createElement('p');
      row.className = 'case-tags';
      d.tags.forEach(t => { const n = document.createElement('span'); n.textContent = t; row.appendChild(n); });
      return row;
    };

    const metaRow = () => {
      const row = document.createElement('div');
      row.className = 'case-meta';
      (d.meta || []).forEach(([k, v]) => {
        const s = document.createElement('span');
        const b = document.createElement('b'); b.textContent = k;
        s.appendChild(b); s.appendChild(document.createTextNode(v));
        row.appendChild(s);
      });
      return row;
    };

    /* the opening hero: her live thumbnail, the still showing until it boots */
    const heroStage = liveStage(c.thumb, c.cover);
    heroStage.classList.add('case-cover');
    hero.appendChild(heroStage);
    const heroTags = tagRow();
    if (heroTags) hero.appendChild(heroTags);
    put(hero, 'p', EYEBROW[lang] || EYEBROW.en, 'case-eyebrow');
    put(hero, 'h1', d.question);
    if (d.meta && d.meta.length) hero.appendChild(metaRow());

    /* the pinned column, once you start reading */
    const sideStage = liveStage(c.thumb, c.cover);
    sideStage.classList.add('case-cover');
    side.appendChild(sideStage);
    const sideTags = tagRow();
    if (sideTags) side.appendChild(sideTags);
    put(side, 'p', EYEBROW[lang] || EYEBROW.en, 'case-eyebrow');
    put(side, 'h1', d.question);
    if (d.meta && d.meta.length) side.appendChild(metaRow());

    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    const drawBars = b => {
      const box = el('div', 'c-box');
      if (b.cap) box.appendChild(el('p', 'c-cap', b.cap));
      b.rows.forEach(([label, pct, note], i) => {
        const row = el('div', 'c-bar' + (i === b.rows.length - 1 ? ' is-key' : ''));
        row.appendChild(el('span', 'c-bar-label', label));
        const track = el('span', 'c-track');
        const fill = el('span', 'c-fill');
        fill.style.width = pct + '%';
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('span', 'c-bar-note', note));
        box.appendChild(row);
      });
      return box;
    };

    const drawStats = b => {
      const box = el('div', 'c-stats');
      b.rows.forEach(([v, cap]) => {
        const cell = el('div', 'c-stat');
        cell.appendChild(el('b', null, v));
        cell.appendChild(el('span', null, cap));
        box.appendChild(cell);
      });
      return box;
    };

    const drawSteps = (b, cls) => {
      const box = el('div', 'c-box');
      if (b.cap) box.appendChild(el('p', 'c-cap', b.cap));
      const grid = el('div', cls);
      b.rows.forEach(([k, h, x]) => {
        const cell = el('div', 'c-step');
        cell.appendChild(el('span', 'c-step-k', k));
        cell.appendChild(el('strong', null, h));
        if (x) cell.appendChild(el('span', 'c-step-x', x));
        grid.appendChild(cell);
      });
      box.appendChild(grid);
      if (b.note) box.appendChild(el('p', 'c-note', b.note));
      return box;
    };

    const drawJourney = b => {
      const grid = el('div', 'c-journey');
      /* the original lays this out as a matrix: rows like Actions / Painpoints */
      const rows = (b.rows || []).filter(r => !/^touchpoints?$|^emotions?$/i.test(r));
      b.items.forEach(it => {
        const cell = el('div', 'c-step');
        cell.appendChild(el('span', 'c-step-k', it.k));
        cell.appendChild(el('strong', null, it.h));
        it.lines.forEach((l, k) => {
          if (rows[k]) cell.appendChild(el('span', 'c-row-k', rows[k]));
          cell.appendChild(el('span', 'c-step-x', l));
        });
        grid.appendChild(cell);
      });
      return grid;
    };

    const drawCta = b => {
      const url = /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(b.note) ? 'https://' + b.note : null;
      const box = el(url ? 'a' : 'div', 'c-cta');
      if (url) { box.href = url; box.target = '_blank'; box.rel = 'noopener'; }
      box.appendChild(el('span', 'c-cta-play', '\u25B6'));
      const t = el('span', 'c-cta-t');
      t.appendChild(el('strong', null, b.x));
      if (b.note) t.appendChild(el('span', null, b.note));
      box.appendChild(t);
      return box;
    };

    const drawWire = b => {
      const box = el('div', 'c-box c-wire');
      const tabs = el('div', 'c-wire-tabs');
      const on = b.tabs.findIndex(t => (b.cap || '').toLowerCase().startsWith(t.toLowerCase()));
      b.tabs.forEach((t, i) => tabs.appendChild(el('span', i === (on < 0 ? 0 : on) ? 'is-on' : null, t)));
      box.appendChild(tabs);
      const cols = el('div', 'c-wire-cols');
      const mk = (title, bars, chips) => {
        const col = el('div', 'c-wire-col');
        col.appendChild(el('p', 'c-cap', title));
        if (chips && chips.length) {
          const cr = el('div', 'c-chips');
          chips.forEach(c => cr.appendChild(el('span', null, c)));
          col.appendChild(cr);
        }
        bars.forEach(w => {
          const l = el('span', 'c-skel');
          l.style.width = w + '%';
          col.appendChild(l);
        });
        return col;
      };
      cols.appendChild(mk('SOURCE', b.src, null));
      cols.appendChild(mk('SUMMARY', b.sum, b.chips));
      box.appendChild(cols);
      if (b.cap) box.appendChild(el('p', 'c-note', b.cap));
      return box;
    };

    /* the original page groups these into visual sets; rebuild those groups */
    const UP = /^[A-Z0-9 ·&'’\-—+]+$/;
    const group = bs => {
      bs = bs.filter(b => {
        if (b.t !== 'label') return true;
        if (/^©/.test(b.x)) return false;
        const solid = (b.x.match(/[A-Za-z0-9가-힣]/g) || []).length;   /* drops emoticon labels */
        return solid / Math.max(1, b.x.replace(/\s/g, '').length) >= .5;
      });
      const out = [];
      const at = (i, t) => bs[i] && bs[i].t === t;
      const lab = (i, re) => bs[i] && bs[i].t === 'label' && re.test(bs[i].x);
      let i = 0;
      while (i < bs.length) {
        const b = bs[i];

        if (lab(i, /^PHASE\s*\d+/i) && at(i + 1, 'p')) {
          const items = [];
          while (lab(i, /^PHASE\s*\d+/i) && at(i + 1, 'p')) { items.push([bs[i].x, bs[i + 1].x]); i += 2; }
          out.push({ g: 'phases', items }); continue;
        }
        if (lab(i, /^\d+$/) && at(i + 1, 'h4') && at(i + 2, 'p')) {
          const items = [];
          while (lab(i, /^\d+$/) && at(i + 1, 'h4') && at(i + 2, 'p')) { items.push([bs[i].x, bs[i + 1].x, bs[i + 2].x]); i += 3; }
          out.push({ g: 'cards', items }); continue;
        }
        if (lab(i, /^\d+\s*·/) && at(i + 1, 'h4')) {
          const f = { g: 'feature', k: b.x, h: bs[i + 1].x, body: [], media: null };
          i += 2;
          while (at(i, 'p')) { f.body.push(bs[i].x); i++; }
          if (at(i, 'video')) { f.media = bs[i]; i++; }
          out.push(f); continue;
        }
        if (b.t === 'label' && at(i + 1, 'p') && lab(i + 2, /^→/)) {
          const items = [];
          while (bs[i] && bs[i].t === 'label' && at(i + 1, 'p') && lab(i + 2, /^→/)) {
            items.push([bs[i].x, bs[i + 1].x, bs[i + 2].x.replace(/^→\s*/, '')]); i += 3;
          }
          out.push({ g: 'personas', items }); continue;
        }
        if (b.t === 'label' && !UP.test(b.x) && at(i + 1, 'p')) {
          let j = i, n = 0;
          while (bs[j] && bs[j].t === 'label' && !UP.test(bs[j].x) && at(j + 1, 'p')) { j += 2; n++; }
          if (n >= 3) {
            const items = [];
            for (let k = i; k < j; k += 2) items.push([bs[k].x, bs[k + 1].x]);
            i = j; out.push({ g: 'walk', items }); continue;
          }
        }
        if (b.t === 'label' && UP.test(b.x) && at(i + 1, 'p')) {
          const c = { g: 'callout', k: b.x, body: [] }; i++;
          while (at(i, 'p')) { c.body.push(bs[i].x); i++; }
          out.push(c); continue;
        }
        if (b.t === 'label' && /^→/.test(b.x)) {
          out.push({ g: 'tag', x: b.x.replace(/^→\s*/, '') }); i++; continue;
        }
        if (b.t === 'label' && at(i + 1, 'label') && at(i + 2, 'label') && !UP.test(b.x)) {
          let j = i;
          while (bs[j] && bs[j].t === 'label' && bs[j].x.length < 22 && !/\d/.test(bs[j].x)) j++;
          if (j - i >= 3) {
            const names = bs.slice(i, j).map(x => x.x);
            i = j;
            if (bs[i] && bs[i].t === 'journey') { bs[i] = Object.assign({}, bs[i], { rows: names }); continue; }
            out.push({ g: 'legend', items: names }); continue;
          }
        }
        if (b.t === 'p' && /^[“"']/.test(b.x) && at(i + 1, 'cite')) {
          out.push({ g: 'quote', x: b.x, by: bs[i + 1].x }); i += 2; continue;
        }
        if ((b.t === 'h3' || b.t === 'h4') && at(i + 1, 'p')) {
          let j = i, n = 0;
          while (bs[j] && bs[j].t === b.t && at(j + 1, 'p')) { j += 2; n++; }
          if (n >= 2) {
            const items = [];
            for (let k = i; k < j; k += 2) items.push([bs[k].x, bs[k + 1].x]);
            i = j; out.push({ g: 'takeaways', items }); continue;
          }
        }
        if (b.t === 'li') {
          const items = [];
          while (at(i, 'li')) { items.push(bs[i].x.replace(/^→\s*/, '')); i++; }
          out.push({ g: 'list', items }); continue;
        }
        out.push({ g: 'raw', b }); i++;
      }
      return out;
    };

    const cell = (cls, parts) => {
      const n = el('div', cls);
      parts.forEach(([tag, c, t]) => { if (t) n.appendChild(el(tag, c, t)); });
      return n;
    };

    const drawGroup = n => {
      switch (n.g) {
        case 'phases': {
          const box = el('ol', 'c-phases');
          n.items.forEach(([k, x]) => {
            const li = el('li');
            const m = k.match(/^(\S+\s*\d+)\s*·?\s*(.*)$/) || [null, k, ''];
            li.appendChild(el('span', 'c-phase-n', (m[1].match(/\d+/) || [''])[0]));
            const body = el('div');
            body.appendChild(el('strong', null, m[2] || k));
            body.appendChild(el('p', null, x));
            li.appendChild(body);
            box.appendChild(li);
          });
          return box;
        }
        case 'cards': {
          const grid = el('div', 'c-cards');
          n.items.forEach(([k, h, x]) => grid.appendChild(
            cell('c-step', [['span', 'c-step-k', k], ['strong', null, h], ['span', 'c-step-x', x]])));
          return grid;
        }
        case 'feature': {
          const box = el('section', 'c-feature');
          box.appendChild(el('p', 'c-step-k', n.k));
          box.appendChild(el('h4', null, n.h));
          n.body.forEach(t => box.appendChild(el('p', null, t)));
          if (n.media) {
            const v = document.createElement('video');
            v.className = 'case-media';
            v.loop = true; v.playsInline = true; v.controls = true;
            v.preload = 'metadata';                /* so the first frame is there to see */
            v.defaultMuted = true; v.muted = true;
            v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
            v.src = n.media.src;
            box.appendChild(v);
          }
          return box;
        }
        case 'personas': {
          const grid = el('div', 'c-personas');
          n.items.forEach(([name, x, tag]) => {
            const c = cell('c-persona-card', [['strong', null, name], ['p', null, x]]);
            c.appendChild(el('span', 'c-tag', tag));
            grid.appendChild(c);
          });
          return grid;
        }
        case 'walk': {
          const box = el('ol', 'c-walk');
          n.items.forEach(([h, x], k) => {
            const li = el('li');
            li.appendChild(el('span', 'c-phase-n', String(k + 1).padStart(2, '0')));
            const body = el('div');
            body.appendChild(el('strong', null, h));
            body.appendChild(el('p', null, x));
            li.appendChild(body);
            box.appendChild(li);
          });
          return box;
        }
        case 'callout': {
          const box = el('div', 'c-callout');
          box.appendChild(el('p', 'c-cap', n.k));
          n.body.forEach(t => box.appendChild(el('p', null, t)));
          return box;
        }
        case 'quote': {
          const box = el('blockquote', 'c-quote');
          box.appendChild(el('p', null, n.x));
          box.appendChild(el('cite', null, n.by));
          return box;
        }
        case 'takeaways': {
          const grid = el('div', 'c-takeaways');
          n.items.forEach(([h, x]) => grid.appendChild(
            cell('c-takeaway', [['strong', null, h], ['p', null, x]])));
          return grid;
        }
        case 'tag': {
          const p = el('p', 'c-outcome');
          p.appendChild(el('span', null, n.x));
          return p;
        }
        case 'legend': {
          const p = el('p', 'c-legend');
          n.items.forEach(t => p.appendChild(el('span', null, t)));
          return p;
        }
        case 'list': {
          const ul = el('ul', 'c-list');
          n.items.forEach(t => ul.appendChild(el('li', null, t)));
          return ul;
        }
      }
      return null;
    };

    const rest = d.blocks.slice();
    if (rest[0] && rest[0].t === 'p') {                 /* the standfirst reads as overview */
      put(hero, 'p', rest.shift().x, 'case-intro');
    }

    group(rest).forEach(n => {
      if (n.g !== 'raw') { const node = drawGroup(n); if (node) frag.appendChild(node); return; }
      const b = n.b;
      switch (b.t) {
        case 'img': {
          const fig = el('figure', 'c-figure');
          const im = el('img', 'case-media');
          im.src = b.src; im.alt = b.cap || ''; im.loading = 'lazy';
          fig.appendChild(im);
          if (b.cap) fig.appendChild(el('figcaption', 'cap', b.cap));
          frag.appendChild(fig);
          return;
        }
        case 'video': {
          const v = document.createElement('video');
          v.className = 'case-media';
          v.loop = true; v.playsInline = true; v.controls = true;
          v.preload = 'metadata';                  /* so the first frame is there to see */
          v.defaultMuted = true; v.muted = true;
          v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
          v.src = b.src;
          frag.appendChild(v);
          return;
        }
        case 'link': {
          const a = el('a', 'case-link', b.x);
          a.href = b.href; a.target = '_blank'; a.rel = 'noopener';
          frag.appendChild(a);
          return;
        }
        case 'cite':    frag.appendChild(el('p', 'c-cite', b.x)); return;
        case 'persona': {
          const p = el('p', 'c-persona');
          p.appendChild(el('strong', null, b.x));
          if (b.k) p.appendChild(el('span', null, b.k));
          frag.appendChild(p);
          return;
        }
        case 'bars':    frag.appendChild(drawBars(b)); return;
        case 'stats':   frag.appendChild(drawStats(b)); return;
        case 'steps':   frag.appendChild(drawSteps(b, 'c-steps')); return;
        case 'flow':    frag.appendChild(drawSteps(b, 'c-flow')); return;
        case 'journey': frag.appendChild(drawJourney(b)); return;
        case 'cta':     frag.appendChild(drawCta(b)); return;
        case 'wire':    frag.appendChild(drawWire(b)); return;
        case 'label':       add('p', b.x, 'case-kicker'); return;
        case 'figcaption':  add('p', b.x, 'cap'); return;
        default:            add(b.t, b.x);
      }
    });

    heroEl.textContent = '';
    heroEl.appendChild(hero);
    sideEl.textContent = '';
    sideEl.appendChild(side);
    caseEl.textContent = '';
    caseEl.appendChild(frag);

    $$('video.case-media', caseEl).forEach(v => watchVideo(v));
    $('#sheet-title').textContent = cases[openIdx].title;
    bodyEl.scrollTop = 0;
    onScroll();
  };

  const loadCases = () => cases
    ? Promise.resolve(cases)
    : fetch('cases.json').then(r => r.json()).then(j => (cases = j));

  const openSheet = row => {
    const n = $$('.row').indexOf(row);
    openIdx = n;
    $('#sheet-num').textContent   = String(n + 1).padStart(2, '0');
    $('#sheet-title').textContent = row.dataset[lang];

    caseEl.textContent = '';
    loadCases().then(renderCase).catch(() => {
      caseEl.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'fail';
      p.textContent = lang === 'en'
        ? 'Could not load the case study. Please try again.'
        : '케이스 스터디를 불러오지 못했습니다. 다시 시도해 주세요.';
      caseEl.appendChild(p);
    });

    closePreview();
    clearTimeout(closing);           /* reopening during the close animation */
    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    void sheet.offsetWidth;                       /* reflow, so the rise animates */
    sheet.classList.add('is-on');
    document.body.classList.add('sheeting');

    lastFocus = document.activeElement;
    $('#sheet-close').focus();
  };

  const stopMedia = () => {
    $$('video', caseEl).forEach(v => {
      v.pause();
      if (seen) seen.unobserve(v);
      v.removeAttribute('src');
      v.load();                                  /* nothing keeps playing behind the layer */
    });
  };

  /* opening on a full-width hero, settling into the two columns as you read */
  const onScroll = () => {
    const h = heroEl.offsetHeight || 1;
    const p = Math.min(1, bodyEl.scrollTop / Math.max(1, h * .92));
    sheet.style.setProperty('--p', p.toFixed(3));
    sheet.classList.toggle('is-read', p > .995);
  };
  bodyEl.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  const closeSheet = () => {
    if (sheet.hidden) return;
    stopMedia();
    sheet.classList.remove('is-on');
    document.body.classList.remove('sheeting');
    closing = setTimeout(() => {
      sheet.hidden = true;
      sheet.setAttribute('aria-hidden', 'true');
      openIdx = -1;
    }, 420);
    if (lastFocus) lastFocus.focus();
  };

  addEventListener('pagehide', stopMedia);
  document.addEventListener('visibilitychange', () => { if (document.hidden) $$('video', caseEl).forEach(v => v.pause()); });

  $('#sheet-close').addEventListener('click', closeSheet);
  $('#sheet-back').addEventListener('click', closeSheet);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  $$('.row').forEach(row => {
    $('a', row).addEventListener('click', e => {
      e.preventDefault();
      openSheet(row);
    });
  });

  /* ── 6 · EN / KR ───────────────────────────────────────── */
  const setLang = next => {
    lang = next;
    root.lang = lang === 'en' ? 'en' : 'ko';
    $('#lang').textContent      = lang === 'en' ? 'KR' : 'EN';
    $('#sheet-lang').textContent = lang === 'en' ? 'KR' : 'EN';

    $$('[data-i18n]').forEach(el => { el.textContent = el.dataset[lang]; });
    $$('.row').forEach(row => {
      const name = $('.name', row);
      name.textContent = row.dataset[lang];
      if (!reduced) split(name, 0, 0);
    });
    show(current);
    renderCase();
  };

  $('#lang').addEventListener('click', () => setLang(lang === 'en' ? 'kr' : 'en'));
  $('#sheet-lang').addEventListener('click', () => setLang(lang === 'en' ? 'kr' : 'en'));

  /* ── 7 · loose objects: missing files, dragging ── */
  $$('.obj img').forEach(img => {
    img.addEventListener('error', () => {
      const ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = img.dataset.fallback || 'missing image';
      img.replaceWith(ph);
    });
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
  });

  let top = 10;
  $$('.obj').forEach(obj => {
    const num = v => parseFloat(getComputedStyle(obj).getPropertyValue(v)) || 0;
    obj.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;          // let the play button work
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY;
      const ox = num('--x'), oy = num('--y');
      try { obj.setPointerCapture(e.pointerId); } catch (_) {}
      obj.classList.add('is-held');
      obj.style.zIndex = ++top;

      const move = ev => {
        obj.style.setProperty('--x', `${ox + ev.clientX - sx}px`);
        obj.style.setProperty('--y', `${oy + ev.clientY - sy}px`);
      };
      const up = () => {
        obj.classList.remove('is-held');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  });

  /* keep the objects clear of the prose: shrink the group if room runs short */
  const objects = $('#objects');
  const fit = () => {
    if (matchMedia('(max-width: 900px)').matches) return;
    const panel = $('.panel.is-on');
    if (!panel) return;
    /* measure untransformed: the group is mid-transition whenever --os is animating */
    const height = objects.offsetHeight;
    const bottom = innerHeight - parseFloat(getComputedStyle(objects).bottom);
    const space  = bottom - panel.getBoundingClientRect().bottom - 28;
    const k      = space / height;
    /* shrink a little to make room; if the panel is long enough that they would
       have to shrink a lot (ABOUT with the experience list), step aside instead */
    objects.classList.toggle('is-away', k < .62);
    objects.style.setProperty('--os', Math.min(1, Math.max(.62, k)));
  };
  addEventListener('resize', fit);

  /* ── 8 · run ───────────────────────────────────────────── */
  $$('[data-seq]').forEach(el =>
    el.addEventListener('animationend', () => el.removeAttribute('data-seq'), { once: true }));

  typeset(panels.bio, 120);
  if (!reduced) {
    $('.pill').style.setProperty('--sd', '900ms');
    $$('.obj').forEach((o, i) => {                       /* they land with the list */
      const art = $('img', o) || $('.ph', o);
      if (art) art.style.setProperty('--od', `${820 + i * 140}ms`);
    });
    $$('.row').forEach((row, i) => {
      row.style.setProperty('--rd', `${520 + i * 70}ms`);
      split($('.name', row), 580 + i * 70, 16);
    });
  }
  fit();
})();
