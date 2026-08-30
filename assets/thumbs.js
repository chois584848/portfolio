/* Her own case-study thumbnails, lifted from seyeonchoi.work: a branded stage with
   the REAL app running inside via <live-frame>. Only the app URLs were made absolute.
   Regenerate with _dev/get_thumbs.py if she ships new ones. */

// <live-frame src="..."> — embeds a real app inside a card at a scaled-down size.
// Auto-boots like a live thumbnail: apps load once, one at a time (staggered queue,
// starting only after the host page has settled), and never unload — no thrash loops.
(function () {
  if (customElements.get('live-frame')) return;
  const queue = [];
  let pumping = false;
  const pump = () => {
    if (pumping) return;
    pumping = true;
    const next = () => {
      const el = queue.shift();
      if (!el) { pumping = false; return; }
      el._boot();
      setTimeout(next, 120); // minimal stagger
    };
    next();
  };
  // wait for the host page to settle before booting anything
  let settled = false;
  const settle = () => { if (!settled) { settled = true; pump(); } };
  settle();

  class LiveFrame extends HTMLElement {
    connectedCallback() {
      this._src = this.getAttribute('src') || '';
      this._dw = parseFloat(this.getAttribute('design-width') || '1440');
      this.style.display = 'block';
      this.style.overflow = 'hidden';
      this.style.background = '#14141a';
      this.addEventListener('click', (e) => e.stopPropagation());
      // enqueue when near the viewport; load once, never unload
      this._io = new IntersectionObserver((ents) => {
        for (const e of ents) {
          if (e.isIntersecting && !this._queued) {
            this._queued = true;
            this._io.disconnect();
            queue.push(this);
            if (settled) pump();
          }
        }
      }, { rootMargin: '2000px 0px' });
      this._io.observe(this);
    }
    _boot() {
      if (this._fr || !this.isConnected) return;
      const fr = document.createElement('iframe');
      this._fr = fr;
      fr.setAttribute('title', this.getAttribute('label') || 'live demo');
      Object.assign(fr.style, { border: '0', width: this._dw + 'px', transformOrigin: '0 0', display: 'block', position: 'absolute', left: '0', top: '0', opacity: '1' });
      fr.addEventListener('load', () => { fr.style.opacity = '1'; this._lastW = 0; fit(); setTimeout(fit, 60); setTimeout(fit, 300); });
      fr.src = this._src;
      this.style.position = 'relative';
      this.appendChild(fr);
      this._lastW = 0; this._lastH = 0;
      const fit = () => {
        const w = this.clientWidth, h = this.clientHeight;
        if (!w || !h || (w === this._lastW && h === this._lastH)) return;
        this._lastW = w; this._lastH = h;
        const s = w / this._dw;
        fr.style.height = (h / s) + 'px';
        fr.style.transform = 'scale(' + s + ')';
      };
      fit();
      requestAnimationFrame(fit);
      setTimeout(fit, 200);
      this._ro = new ResizeObserver(() => fit());
      this._ro.observe(this);
    }
    disconnectedCallback() {
      if (this._io) this._io.disconnect();
      if (this._ro) this._ro.disconnect();
      const i = queue.indexOf(this);
      if (i >= 0) queue.splice(i, 1);
    }
  }
  customElements.define('live-frame', LiveFrame);
})();

// Case-study thumbnails, marketing-shot style (per Mei's refs):
// soft brand-gradient stage + the REAL app embedded live (via <live-frame>) in a large
// rounded window that bleeds off the bottom, with one floating accent element on top.
// The embedded apps are fully interactive — real input, real UI, zero mockup.
(function () {
  const FONT = "'Hanken Grotesk', -apple-system, sans-serif";
  const base = (el, bg, glow, deco) => {
    const sh = el.attachShadow({ mode: 'open' });
    el.style.display = 'block'; el.style.width = '100%'; el.style.height = '100%';
    el.addEventListener('click', (e) => e.stopPropagation());
    const st = document.createElement('style');
    st.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { display: block; }
      .bg { width: 100%; height: 100%; position: relative; overflow: hidden; background: ${bg}; font-family: ${FONT}; container-type: inline-size; -webkit-font-smoothing: antialiased; }
      .deco { position: absolute; inset: 0; z-index: 0; pointer-events: none; ${deco || ''} }
      .win { position: absolute; left: 7%; right: 7%; top: 11%; bottom: -14%; border-radius: 1.3cqw; overflow: hidden; box-shadow: 0 3cqw 9cqw rgba(30,20,10,0.35); background: #fff; }
      .win live-frame { position: absolute; inset: 0; width: 100%; height: 100%; }
      .win { transition: box-shadow 0.55s ease; }
      .bg:hover .win { box-shadow: 0 3cqw 9cqw rgba(30,20,10,0.35), 0 0 7cqw 0.4cqw ${glow}; }
    `;
    sh.appendChild(st);
    const root = document.createElement('div');
    root.className = 'bg';
    sh.appendChild(root);
    return root;
  };

  const def = (tag, bg, glow, deco, src, dw) => {
    if (customElements.get(tag)) return;
    customElements.define(tag, class extends HTMLElement {
      connectedCallback() {
        const r = base(this, bg, glow, deco);
        r.innerHTML = `
          <div class="deco"></div>
          <div class="win"><live-frame src="${src}" design-width="${dw}" label="live demo"></live-frame></div>`;
      }
    });
  };

  // Q1 · Autoview — the real app (dark, mint). Cool mint-on-cream stage.
  def('thumb-autoview',
    'radial-gradient(95% 140% at 15% 0%, #17332e 0%, #0b0c0d 62%)',
    'rgba(45,212,191,0.2)',
    'background-image: linear-gradient(rgba(45,212,191,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.07) 1px, transparent 1px); background-size: 5cqw 5cqw;',
    'https://seyeonchoi.work/autoview/index.html?boot=editor', 1440);

  // Q2 · AI Summarizer — the real wrtn app. Warm orange stage + Supporter callout (per ref).
  def('thumb-summarizer',
    'radial-gradient(100% 135% at 2% -8%, #ff7a45 0%, #ff9560 30%, #ffb488 55%, #ffd2b2 78%, #ffe9db 100%)',
    'rgba(240,90,60,0.22)',
    'background: repeating-radial-gradient(circle at -6% -10%, transparent 0 8cqw, rgba(255,255,255,0.2) 8cqw 8.15cqw, transparent 8.15cqw 16cqw);',
    'https://seyeonchoi.work/ai-summarizer/index.html?theme=light&boot=result', 1440);

  // Q3 · Text Humanizer — the real wrtn app. Lime→orange stage.
  def('thumb-humanizer',
    'radial-gradient(118% 132% at 8% 6%, #6fd3a6 0%, #a7de73 38%, #eef1a8 74%, #fbf7cf 100%)',
    'rgba(140,214,120,0.22)',
    'background: repeating-radial-gradient(circle at 50% 50%, transparent 0 5cqw, rgba(255,255,255,0.14) 5cqw 5.15cqw, transparent 5.15cqw 10cqw);',
    'https://seyeonchoi.work/text-humanizer/index.html?boot=result', 1440);

  // Q4 · Context Generator — the real Figma plugin demo (canvas + plugin window).
  def('thumb-figplugin',
    'radial-gradient(118% 138% at 88% -12%, #5a95f0 0%, #83b0f5 34%, #accdf8 62%, #cfe0fb 84%, #eaf1fb 100%)',
    'rgba(56,150,255,0.3)',
    'background-image: radial-gradient(rgba(255,255,255,0.5) 1.5px, transparent 1.5px); background-size: 3.4cqw 3.4cqw;',
    'https://seyeonchoi.work/design-to-dev/index.html', 1100);
})();
