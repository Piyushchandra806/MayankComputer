/* =========================================================================
   Sketchbook – Vanilla JS
   Exact physics port from ThreeUI / @designcodeio (source rev 3938bc8).
   Runtime: DOM + CSS 3D. No canvas, no React, no three.js required.
   Adapted for Mayank Computer — uses local product images as spread pages.
   ========================================================================= */

export class Sketchbook {
  /**
   * @param {HTMLElement} container  – element that will host the sketchbook
   * @param {object}      options
   *   pages       – array of { url, title, caption } objects
   *   assetBase   – prefix prepended to all relative image URLs (default '')
   */
  constructor(container, options = {}) {
    this.container = container;

    const defaults = {
      pages: [
        { url: 'wedding-card-showcase.jpg',      title: 'Shadi Cards',         caption: 'Royal Wedding Invitations' },
        { url: 'letterhead-showcase.jpg',         title: 'Letterheads',         caption: 'Executive Stationery'      },
        { url: 'poster-art-showcase.jpg',         title: 'Poster Art',          caption: 'Bold Print & Flex'         },
        { url: 'print-production-showcase.jpg',   title: 'Print Production',    caption: 'Offset & Digital Press'    },
        { url: 'card-front.jpg',                  title: 'Visiting Cards (Front)', caption: 'Premium Business Cards' },
        { url: 'card-back.jpg',                   title: 'Visiting Cards (Back)', caption: 'Metallic Finishes'       },
        { url: 'id-card.jpg',                     title: 'ID Cards',            caption: 'PVC School & Staff Cards'  },
        { url: 'hero.jpg',                        title: 'Mayank Computer',     caption: 'Indirapuram, Ghaziabad'    },
      ],
      assetBase: '',
    };

    const opts = { ...defaults, ...options };
    this.PAGES = opts.pages.map(p => ({
      ...p,
      url: p.url.startsWith('http') ? p.url : (opts.assetBase + p.url),
    }));
    this.M = this.PAGES.length;

    /* ── physics constants (match ThreeUI source exactly) ── */
    this.N    = 18;     // strip count — smooth curve
    this.SPAN = 0.449;  // gutter → outer edge fraction
    this.BETA = 0.60;   // peak curl angle, radians

    this.idx   = 0;
    this.turn  = null;
    this.strips = [];

    /* ── view state ── */
    const TILT_X = 4.5, TILT_Y = 7;
    this.TILT_X = TILT_X; this.TILT_Y = TILT_Y;
    this.ZOOM_MIN = 0.9; this.ZOOM_MAX = 1.5;
    this.view = { rx:0, ry:0, z:1, trx:0, try_:0, tz:1 };
    this.viewActive = false;
    this._lastZ = 1;

    /* ── spring / raf ── */
    this.spring = null;
    this._raf = null;
    this._last = 0;

    /* ── loupe ── */
    this.loupeOn = true;
    this.lx = null; this.ly = null;
    this.lgrab = null; this.lTarget = null;
    this.MAG = 2.3;

    /* ── drag ── */
    this.drag = null;

    /* ── caption elements (updated each paint) ── */
    this.capOut = null; this.capIn = null;

    /* ── reduced motion ── */
    this.REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._build();
    this._bindEvents();
    this._boot();
  }

  /* ══════════════════════════════════════════════════════
     DOM BUILD
  ══════════════════════════════════════════════════════ */

  _build() {
    /* inject required styles once */
    if (!document.getElementById('__sb-styles')) {
      const s = document.createElement('style');
      s.id = '__sb-styles';
      s.textContent = SKETCHBOOK_CSS;
      document.head.appendChild(s);
    }

    const root = document.createElement('div');
    root.className = 'sb-root';
    this.rootEl = root;

    /* stage row */
    const stage = document.createElement('div');
    stage.className = 'sb-stage';
    this.stageEl = stage;

    const leftBtn = document.createElement('button');
    leftBtn.className = 'sb-arrow sb-arrow--left';
    leftBtn.setAttribute('aria-label', 'Previous page');
    leftBtn.innerHTML = `<svg viewBox="0 0 14 44" width="14" height="44" fill="none"><polyline points="11,3 3,22 11,41" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const rightBtn = document.createElement('button');
    rightBtn.className = 'sb-arrow sb-arrow--right';
    rightBtn.setAttribute('aria-label', 'Next page');
    rightBtn.innerHTML = `<svg viewBox="0 0 14 44" width="14" height="44" fill="none"><polyline points="3,3 11,22 3,41" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    /* 3‑D container */
    const sb3d = document.createElement('div');
    sb3d.className = 'sb-3d';
    this.sb3dEl = sb3d;

    const tilt = document.createElement('div');
    tilt.className = 'sb-tilt';
    this.tiltEl = tilt;

    /* ambient shadows */
    ['ambient','contact','hair'].forEach(k => {
      const d = document.createElement('div');
      d.className = `sb-cast sb-cast--${k}`;
      d.setAttribute('aria-hidden','true');
      tilt.appendChild(d);
    });

    const book = document.createElement('div');
    book.className = 'sb-book';
    this.bookEl = book;
    tilt.appendChild(book);
    sb3d.appendChild(tilt);

    /* zoom layer */
    const zoomWrap = document.createElement('div');
    zoomWrap.className = 'sb-zoomwrap';
    zoomWrap.setAttribute('aria-hidden','true');
    this.zoomWrapEl = zoomWrap;

    const zoomInner = document.createElement('div');
    zoomInner.className = 'sb-zoominner';
    this.zoomInnerEl = zoomInner;
    zoomWrap.appendChild(zoomInner);
    sb3d.appendChild(zoomWrap);

    /* magnifier / loupe */
    const loupe = document.createElement('div');
    loupe.className = 'sb-loupe';
    this.loupeEl = loupe;

    const grip = document.createElement('span');
    grip.className = 'sb-loupe__grip';

    const ring = document.createElement('span');
    ring.className = 'sb-loupe__ring';

    const lens = document.createElement('span');
    lens.className = 'sb-loupe__lens';
    this.lensEl = lens;

    ring.appendChild(lens);
    loupe.appendChild(grip);
    loupe.appendChild(ring);
    sb3d.appendChild(loupe);

    stage.appendChild(leftBtn);
    stage.appendChild(sb3d);
    stage.appendChild(rightBtn);
    root.appendChild(stage);

    /* caption row */
    const capBox = document.createElement('div');
    capBox.className = 'sb-captions';
    this.capBoxEl = capBox;
    root.appendChild(capBox);

    /* toolbar */
    const tools = document.createElement('div');
    tools.className = 'sb-tools';
    tools.setAttribute('role','group');
    tools.setAttribute('aria-label','View controls');

    const zOut = document.createElement('button');
    zOut.className = 'sb-tool';
    zOut.id = 'sbZOut';
    zOut.setAttribute('aria-label','Zoom out');
    zOut.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17.4 17.4M6.2 8.6h4.8"/></svg>`;
    this.zOutBtn = zOut;

    const zRead = document.createElement('span');
    zRead.className = 'sb-zoom-read';
    zRead.textContent = '100%';
    this.zReadEl = zRead;

    const zIn = document.createElement('button');
    zIn.className = 'sb-tool';
    zIn.id = 'sbZIn';
    zIn.setAttribute('aria-label','Zoom in');
    zIn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17.4 17.4M6.2 8.6h4.8M8.6 6.2v4.8"/></svg>`;
    this.zInBtn = zIn;

    const sep = document.createElement('span');
    sep.className = 'sb-tool-sep';
    sep.setAttribute('aria-hidden','true');

    const loupeBtn = document.createElement('button');
    loupeBtn.className = 'sb-tool';
    loupeBtn.setAttribute('aria-label','Magnifier');
    loupeBtn.setAttribute('aria-pressed','true');
    loupeBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8.8" cy="8.8" r="5.8"/><path d="M13 13l4.4 4.4"/><path d="M6.4 7.2a3.2 3.2 0 0 1 2.4-1.4" opacity=".55"/></svg>`;
    this.loupeBtnEl = loupeBtn;

    tools.appendChild(zOut);
    tools.appendChild(zRead);
    tools.appendChild(zIn);
    tools.appendChild(sep);
    tools.appendChild(loupeBtn);
    root.appendChild(tools);

    /* hint */
    const hint = document.createElement('p');
    hint.className = 'sb-hint';
    hint.textContent = 'Drag page to turn · Drag glass to move it';
    this.hintEl = hint;
    root.appendChild(hint);

    this.leftBtn = leftBtn;
    this.rightBtn = rightBtn;
    this.container.appendChild(root);
  }

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */

  _el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  _imgEl(i, side) {
    const im = new Image();
    im.className = 'sb-half-img' + (side === 'right' ? ' sb-half-img--right' : '');
    im.draggable = false;
    im.alt = '';
    im.src = this.PAGES[i].url;
    return im;
  }

  _halfEl(pos, i) {
    const d = this._el('div', `sb-half sb-half--${pos}`);
    d.appendChild(this._imgEl(i, pos));
    d.appendChild(this._el('div', `sb-gutter-shade sb-gutter-shade--${pos}`));
    return d;
  }

  /* ══════════════════════════════════════════════════════
     CURL (nested strip chain)
  ══════════════════════════════════════════════════════ */

  _buildCurl(dir, from, to) {
    this.strips = [];
    const c = this._el('div', `sb-curl sb-curl--${dir}`);
    c.style.setProperty('--n', this.N);
    c.style.setProperty('--span', this.SPAN);

    let host = c;
    for (let i = 0; i < this.N; i++) {
      const s = this._el('div', 'sb-strip');
      s.style.setProperty('--i', i);

      const gut = 'calc(var(--bw) * 0.5)';
      const sw  = `calc(var(--bw) * ${this.SPAN} / ${this.N})`;
      const A   = `calc(-1 * (${gut} + ${i} * ${sw}))`;
      const B   = `calc(${i+1} * ${sw} - ${gut})`;

      const f = this._el('div','sb-face sb-face--front');
      const b = this._el('div','sb-face sb-face--back');

      const dress = (e, url, px) => {
        e.style.backgroundImage = `url(${url})`;
        e.style.backgroundPositionX = px;
      };
      dress(f, this.PAGES[from].url, dir === 'next' ? A : B);
      dress(b, this.PAGES[to].url,   dir === 'next' ? B : A);

      f.appendChild(this._el('div','sb-sh'));
      f.appendChild(this._el('div','sb-gl'));
      b.appendChild(this._el('div','sb-sh'));
      b.appendChild(this._el('div','sb-gl'));

      s.appendChild(f);
      s.appendChild(b);
      if (i === this.N - 1) s.classList.add('sb-strip--edge');

      host.appendChild(s);
      host = s;
      this.strips.push(s);
    }
    return c;
  }

  /* ══════════════════════════════════════════════════════
     PHYSICS — applyTurn
  ══════════════════════════════════════════════════════ */

  _applyTurn(t) {
    const D = 180 / Math.PI;
    const th   = Math.PI * t;
    const beta = this.BETA * Math.sin(Math.PI * t);
    const tt   = th + beta;
    const td   = 2 * beta / this.N;

    this.sb3dEl.style.setProperty('--tt',    (tt * D).toFixed(2) + 'deg');
    this.sb3dEl.style.setProperty('--td',    (td * D).toFixed(3) + 'deg');
    this.sb3dEl.style.setProperty('--shade', Math.sin(Math.PI * t).toFixed(3));

    this._fadeCaption(t);

    for (let i = 0; i < this.strips.length; i++) {
      const l1 = Math.abs(Math.cos(tt - i * td));
      const l2 = Math.abs(Math.cos(tt - (i + 1) * td));
      const st = this.strips[i].style;
      st.setProperty('--lit', l1.toFixed(3));
      st.setProperty('--a1',  ((1 - l1) * 0.62).toFixed(3));
      st.setProperty('--a2',  ((1 - l2) * 0.62).toFixed(3));
    }
  }

  /* ══════════════════════════════════════════════════════
     PAINT — rebuild book DOM
  ══════════════════════════════════════════════════════ */

  _paint() {
    this.bookEl.textContent = '';
    if (!this.turn) {
      const f  = this._el('div','sb-full');
      const im = new Image();
      im.src = this.PAGES[this.idx].url;
      im.alt = this.PAGES[this.idx].title;
      im.draggable = false;
      f.appendChild(im);
      this.bookEl.appendChild(f);
      this.sb3dEl.style.setProperty('--shade','0');
    } else {
      const next = this.turn.dir === 'next';
      this.bookEl.appendChild(this._halfEl('left',  next ? this.turn.from : this.turn.to));
      this.bookEl.appendChild(this._halfEl('right', next ? this.turn.to   : this.turn.from));
      this.bookEl.appendChild(this._buildCurl(this.turn.dir, this.turn.from, this.turn.to));
      this._applyTurn(this.turn.t);
    }
    const za = this._el('button','sb-zone sb-zone--prev');
    za.setAttribute('aria-label','Previous page');
    const zb = this._el('button','sb-zone sb-zone--next');
    zb.setAttribute('aria-label','Next page');
    this.bookEl.appendChild(za);
    this.bookEl.appendChild(zb);
    this._layout();
    this._caption();
    this._marks();
    this._syncZoomLayer();
    this._placeLoupe();
  }

  _caption() {
    this.capBoxEl.textContent = '';
    this.capOut = this.capIn = null;
    if (this.turn) {
      this.capOut = this._el('p','sb-caption sb-caption--live');
      this.capOut.textContent = this.PAGES[this.turn.from].title;
      this.capBoxEl.appendChild(this.capOut);
      this.capIn  = this._el('p','sb-caption sb-caption--live');
      this.capIn.textContent  = this.PAGES[this.turn.to].title;
      this.capBoxEl.appendChild(this.capIn);
      this._fadeCaption(this.turn.t);
    } else {
      const p = this._el('p','sb-caption');
      p.textContent = this.PAGES[this.idx].title;
      this.capBoxEl.appendChild(p);
    }
  }

  _fadeCaption(t) {
    if (!this.capOut || !this.capIn) return;
    const out = 1 - Math.max(0, Math.min(1, (t - 0.10) / 0.28));
    const inn =     Math.max(0, Math.min(1, (t - 0.56) / 0.30));
    this.capOut.style.opacity = out.toFixed(3);
    this.capIn.style.opacity  = inn.toFixed(3);
  }

  _layout() {
    this.sb3dEl.style.setProperty('--bw', this.bookEl.clientWidth + 'px');
  }

  _marks() {
    // no plate list in this embedded version — extend if needed
  }

  /* ══════════════════════════════════════════════════════
     SPRING / RAF LOOP
  ══════════════════════════════════════════════════════ */

  _animateTo(target, onDone, k = 150, c = 22) {
    this.spring = { kind: 'spring', v: 0, target, done: onDone, k, c };
    this._kick();
  }

  _tweenTo(target, dur, onDone) {
    this.spring = { kind: 'tween', from: this.turn ? this.turn.t : 0, target, dur, e: 0, done: onDone };
    this._kick();
  }

  _kick() {
    if (this._raf === null) {
      this._last = performance.now();
      this._raf = requestAnimationFrame(ts => this._tick(ts));
    }
  }

  _tick(now) {
    this._raf = null;
    const dt = Math.min(0.032, (now - this._last) / 1000 || 0.016);
    this._last = now;

    if (this.spring && this.turn) {
      const s = this.spring;
      if (s.kind === 'tween') {
        s.e += dt;
        const k = Math.min(1, s.e / s.dur);
        this.turn.t = s.from + (s.target - s.from) * k;
        this._applyTurn(this.turn.t);
        if (k >= 1) { this.spring = null; s.done && s.done(); }
      } else {
        const x = this.turn.t - s.target;
        s.v += (-s.k * x - s.c * s.v) * dt;
        this.turn.t += s.v * dt;
        if (Math.abs(this.turn.t - s.target) < 0.002 && Math.abs(s.v) < 0.02) {
          this.turn.t = s.target;
          this.spring = null;
          this._applyTurn(this.turn.t);
          const d = s.done; d && d();
        } else {
          this._applyTurn(this.turn.t);
        }
      }
    }

    this._viewSpring();
    const lmoved = this._loupeEase();

    if ((this.spring || this.viewActive || lmoved) && this._raf === null) {
      this._raf = requestAnimationFrame(ts => this._tick(ts));
    }
  }

  /* ══════════════════════════════════════════════════════
     VIEW — tilt + zoom
  ══════════════════════════════════════════════════════ */

  _applyView() {
    this.tiltEl.style.setProperty('--rx',   this.view.rx.toFixed(2)  + 'deg');
    this.tiltEl.style.setProperty('--ry',   this.view.ry.toFixed(2)  + 'deg');
    this.tiltEl.style.setProperty('--zoom', this.view.z.toFixed(3));
    if (this.view.z !== this._lastZ) { this._lastZ = this.view.z; this._placeLoupe(); }
  }

  _viewSpring() {
    const e = 0.14;
    let moved = false;
    for (const [k, t] of [['rx','trx'],['ry','try_'],['z','tz']]) {
      const d = this.view[t] - this.view[k];
      if (Math.abs(d) > 0.0006) { this.view[k] += d * e; moved = true; }
      else this.view[k] = this.view[t];
    }
    if (moved) this._applyView();
    this.viewActive = moved;
    return moved;
  }

  _setView(rx, ry, z) {
    this.view.trx  = Math.max(-this.TILT_X, Math.min(this.TILT_X, rx));
    this.view.try_ = Math.max(-this.TILT_Y, Math.min(this.TILT_Y, ry));
    this.view.tz   = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, z));
    this.viewActive = true;
    this._kick();
    this._syncZoom();
  }

  _tiltTo(cx, cy) {
    if (this.drag) return;
    const r = this.bookEl.getBoundingClientRect();
    if (!r.width) return;
    const nx = Math.max(-1, Math.min(1, (cx - (r.left + r.width  / 2)) / (r.width  * 0.62)));
    const ny = Math.max(-1, Math.min(1, (cy - (r.top  + r.height / 2)) / (r.height * 0.9)));
    this._setView(-ny * this.TILT_X, nx * this.TILT_Y, this.view.tz);
  }

  /* ══════════════════════════════════════════════════════
     DRAG / POINTER (page turning)
  ══════════════════════════════════════════════════════ */

  _hideHint() { this.hintEl.classList.add('sb-hint--gone'); }

  _startTurn(dir, t = 0) {
    this.spring = null;
    if (this.turn) { this.idx = this.turn.to; this.turn = null; }
    this._shoveLoupe(dir);
    const from = this.idx;
    this.turn = {
      dir, from,
      to: dir === 'next' ? (from + 1) % this.M : (from - 1 + this.M) % this.M,
      t: t || 0,
    };
    this._paint();
  }

  _commit() {
    if (!this.turn) return;
    if (this.REDUCED) { this.idx = this.turn.to; this.turn = null; this._paint(); return; }
    this._animateTo(1, () => { this.idx = this.turn.to; this.turn = null; this._paint(); }, 170, 26);
    this._kick();
  }

  _cancel() {
    if (!this.turn) return;
    this._animateTo(0, () => { this.turn = null; this._paint(); }, 150, 24);
    this._kick();
  }

  _step(dir) {
    if (this.turn) { this.idx = this.turn.to; this.turn = null; }
    this._startTurn(dir, 0);
    this._commit();
  }

  goTo(i) {
    if (i === this.idx) return;
    if (this.turn) { this.idx = this.turn.to; this.turn = null; }
    const fwd  = (i - this.idx + this.M) % this.M;
    const back = (this.idx - i + this.M) % this.M;
    if (Math.min(fwd, back) === 1) { this._step(fwd === 1 ? 'next' : 'prev'); return; }
    this.idx = i; this._paint();
  }

  /* ══════════════════════════════════════════════════════
     LOUPE
  ══════════════════════════════════════════════════════ */

  _loupeSize() {
    return Math.round(Math.max(130, Math.min(220, this.bookEl.clientWidth * 0.22)));
  }

  _bookBox() {
    return { x: 0, y: 0, w: this.bookEl.clientWidth, h: this.bookEl.clientHeight };
  }

  _restLoupe() {
    const b = this._bookBox();
    this.lx = b.x + b.w * 0.88;
    this.ly = b.y + b.h * 0.855;
    this._placeLoupe();
  }

  _syncZoomLayer() {
    this.zoomInnerEl.textContent = '';
    for (const c of this.bookEl.children) {
      if (c.classList.contains('sb-zone--prev') || c.classList.contains('sb-zone--next')) continue;
      this.zoomInnerEl.appendChild(c.cloneNode(true));
    }
  }

  _placeLoupe() {
    if (this.lx === null) return;
    const B = this._bookBox(), bw = B.w, bh = B.h;
    if (!bw) return;
    const R = this._loupeSize() / 2, bez = R * 2 * 0.058;
    this.loupeEl.style.setProperty('--lr', R * 2 + 'px');
    this.loupeEl.style.transform = `translate3d(${(this.lx - R).toFixed(1)}px,${(this.ly - R).toFixed(1)}px,0)`;
    if (this.loupeOn) this.loupeEl.classList.add('sb-loupe--on');

    const z = this.view.z, cx = bw / 2, cy = bh / 2;
    const x0 = cx + (bw * 0.051 - cx) * z, x1 = cx + (bw * 0.949 - cx) * z;
    const y0 = cy + (bh * 0.218 - cy) * z, y1 = cy + (bh * 0.782 - cy) * z;
    const nx = Math.max(x0, Math.min(this.lx, x1));
    const ny = Math.max(y0, Math.min(this.ly, y1));
    const inside = (this.lx > x0 && this.lx < x1 && this.ly > y0 && this.ly < y1)
      ? Math.min(this.lx - x0, x1 - this.lx, this.ly - y0, y1 - this.ly)
      : -Math.hypot(this.lx - nx, this.ly - ny);
    const k = Math.max(0, Math.min(1, (inside + R * 0.30) / (R * 0.55)));

    this.zoomWrapEl.style.opacity = (this.loupeOn ? k : 0).toFixed(3);
    if (k <= 0.002) return;

    const r = (R - bez).toFixed(1);
    const mask = `radial-gradient(circle ${r}px at ${this.lx.toFixed(1)}px ${this.ly.toFixed(1)}px,#000 calc(100% - 1px),transparent 100%)`;
    this.zoomWrapEl.style.webkitMaskImage = mask;
    this.zoomWrapEl.style.maskImage       = mask;

    const px = cx + (this.lx - cx) / z, py = cy + (this.ly - cy) / z, s = this.MAG * z;
    this.zoomInnerEl.style.transform =
      `translate(${(this.lx - px * s).toFixed(1)}px,${(this.ly - py * s).toFixed(1)}px) scale(${s.toFixed(4)})`;
  }

  _shoveLoupe(dir) {
    if (!this.loupeOn || this.lx === null || this.lgrab) return;
    const b = this._bookBox();
    const nx = (b.w / 2 + (this.lx - b.x - b.w / 2) / this.view.z) / b.w;
    const ny = (b.h / 2 + (this.ly - b.y - b.h / 2) / this.view.z) / b.h;
    if (nx < 0.02 || nx > 0.98 || ny < 0.17 || ny > 0.83) return;
    this.lTarget = { x: b.x + b.w * (dir === 'next' ? 0.12 : 0.88), y: b.y + b.h * 0.855 };
    this._kick();
  }

  _loupeEase() {
    if (!this.lTarget) return false;
    if (this.lgrab) { this.lTarget = null; return false; }
    const dx = this.lTarget.x - this.lx, dy = this.lTarget.y - this.ly;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      this.lx = this.lTarget.x; this.ly = this.lTarget.y;
      this.lTarget = null; this._placeLoupe(); return false;
    }
    this.lx += dx * 0.17; this.ly += dy * 0.17; this._placeLoupe();
    return true;
  }

  /* ══════════════════════════════════════════════════════
     ZOOM TOOLBAR
  ══════════════════════════════════════════════════════ */

  _syncZoom() {
    this.zReadEl.textContent = Math.round(this.view.tz * 100) + '%';
    this.zOutBtn.disabled = this.view.tz <= this.ZOOM_MIN + 0.001;
    this.zInBtn.disabled  = this.view.tz >= this.ZOOM_MAX - 0.001;
  }

  /* ══════════════════════════════════════════════════════
     EVENT BINDING
  ══════════════════════════════════════════════════════ */

  _bindEvents() {
    /* arrow buttons */
    this.leftBtn.addEventListener('click', () => this._step('prev'));
    this.rightBtn.addEventListener('click', () => this._step('next'));

    /* tilt on mouse move */
    this.rootEl.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      this._tiltTo(e.clientX, e.clientY);
    }, { passive: true });
    this.rootEl.addEventListener('pointerout', e => {
      if (!e.relatedTarget) this._setView(0, 0, this.view.tz);
    });
    window.addEventListener('blur', () => this._setView(0, 0, this.view.tz));

    /* double-click resets zoom */
    this.stageEl.addEventListener('dblclick', () => this._setView(this.view.trx, this.view.try_, 1));

    /* page turn drag */
    this.stageEl.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const onBook = e.target.closest('.sb-zone--prev, .sb-zone--next');
      this.stageEl.setPointerCapture(e.pointerId);
      this._hideHint();
      if (!onBook) return;
      const r   = this.bookEl.getBoundingClientRect();
      const dir = (e.clientX - r.left) / r.width > 0.5 ? 'next' : 'prev';
      this._startTurn(dir, 0);
      this.drag = { dir, x0: e.clientX, w: r.width, moved: 0, vel: 0, tPrev: performance.now() };
    });

    this.stageEl.addEventListener('pointermove', e => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x0;
      this.drag.moved = Math.max(this.drag.moved, Math.abs(dx));
      const raw = (this.drag.dir === 'next' ? -dx : dx) / (this.drag.w * 0.62);
      const t   = Math.max(0, Math.min(1, raw));
      const now = performance.now();
      this.drag.vel = (t - (this.turn ? this.turn.t : 0)) / Math.max(0.001, (now - this.drag.tPrev) / 1000);
      this.drag.tPrev = now;
      if (this.turn) { this.turn.t = t; this._applyTurn(t); }
    });

    const endDrag = () => {
      if (!this.drag) return;
      const d = this.drag; this.drag = null;
      if (!this.turn) return;
      if (d.moved < 6) { this._commit(); return; }
      (this.turn.t > 0.42 || d.vel > 1.1) ? this._commit() : this._cancel();
    };
    this.stageEl.addEventListener('pointerup',     endDrag);
    this.stageEl.addEventListener('pointercancel', endDrag);
    this.stageEl.addEventListener('dragstart',     e => e.preventDefault());
    this.stageEl.addEventListener('selectstart',   e => e.preventDefault());

    /* keyboard */
    window.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); this._hideHint();
      this._step(e.key === 'ArrowRight' ? 'next' : 'prev');
    });

    /* loupe drag */
    this.loupeEl.addEventListener('pointerdown', e => {
      if (!this.loupeOn || e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      this.lTarget = null;
      this.lgrab = { cx: e.clientX, cy: e.clientY, lx0: this.lx, ly0: this.ly };
      this.loupeEl.classList.add('sb-loupe--held');
      this.loupeEl.setPointerCapture(e.pointerId);
      this._hideHint();
    });
    this.loupeEl.addEventListener('pointermove', e => {
      if (!this.lgrab) return;
      const b = this._bookBox(), R = this._loupeSize() / 2;
      this.lx = Math.max(b.x - R * 0.7, Math.min(b.x + b.w + R * 0.7, this.lgrab.lx0 + (e.clientX - this.lgrab.cx)));
      this.ly = Math.max(b.y - R * 0.7, Math.min(b.y + b.h + R * 1.0, this.lgrab.ly0 + (e.clientY - this.lgrab.cy)));
      this._placeLoupe();
    });
    const dropLoupe = () => { this.lgrab = null; this.loupeEl.classList.remove('sb-loupe--held'); };
    this.loupeEl.addEventListener('pointerup',     dropLoupe);
    this.loupeEl.addEventListener('pointercancel', dropLoupe);

    /* loupe toggle */
    this.loupeBtnEl.addEventListener('click', () => {
      this.loupeOn = !this.loupeOn;
      this.loupeBtnEl.setAttribute('aria-pressed', String(this.loupeOn));
      this.loupeEl.classList.toggle('sb-loupe--on', this.loupeOn);
      if (this.loupeOn && this.lx === null) this._restLoupe();
    });

    /* zoom buttons */
    this.zInBtn.addEventListener('click',  () => { this._setView(this.view.trx, this.view.try_, this.view.tz * 1.16); this._hideHint(); });
    this.zOutBtn.addEventListener('click', () => { this._setView(this.view.trx, this.view.try_, this.view.tz / 1.16); this._hideHint(); });

    /* resize */
    window.addEventListener('resize', () => { this._layout(); this.lx = null; this._restLoupe(); });
  }

  /* ══════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════ */

  async _boot() {
    this._paint();
    this._applyView();

    /* preload all pages */
    await Promise.all(this.PAGES.map(p => {
      const im = new Image(); im.src = p.url;
      return im.decode ? im.decode().catch(() => {}) : new Promise(r => { im.onload = im.onerror = r; });
    }));

    if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
    this._syncZoom();
    this._restLoupe();
  }

  /* public API */
  destroy() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this.rootEl.remove();
  }
}

/* ══════════════════════════════════════════════════════
   INJECTED CSS
   (exact visual match to ThreeUI threeui.css .sketchbook block
    + the inline styles from sketchbookDocument.js, adapted for
    vanilla-DOM usage and BEM-prefixed to avoid collisions)
══════════════════════════════════════════════════════ */
const SKETCHBOOK_CSS = `
/* ── root ───────────────────────────────── */
.sb-root {
  display: grid;
  justify-items: center;
  gap: 14px;
  width: 100%;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
}
.sb-root img { -webkit-user-drag: none; user-drag: none; }

/* ── stage ──────────────────────────────── */
.sb-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  touch-action: pan-y;
}
.sb-arrow {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 2px;
  border: 0;
  background: transparent;
  color: rgba(43,39,33,.36);
  cursor: pointer;
  transition: color .2s;
  -webkit-tap-highlight-color: transparent;
  z-index: 8;
}
.sb-arrow:hover { color: #2b2721; }

/* ── 3D container + tilt ────────────────── */
.sb-3d {
  position: relative;
  flex: 1 1;
  min-width: 0;
  max-width: 900px;
  perspective: 1750px;
  perspective-origin: 50% 46%;
}
.sb-tilt {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) scale(var(--zoom,1));
  will-change: transform;
}
.sb-book {
  position: relative;
  width: 100%;
  aspect-ratio: 1760/1240;
  transform-style: preserve-3d;
  z-index: 1;
}

/* ── ambient pool shadows ───────────────── */
.sb-cast { position: absolute; pointer-events: none; z-index: 0; }
.sb-cast--ambient {
  left: 5%; right: 5%; top: 27%; bottom: 2%;
  background: radial-gradient(50% 50% at 50% 58%,rgba(58,44,26,.34) 0%,rgba(58,44,26,.19) 40%,rgba(58,44,26,0) 74%);
  filter: blur(26px);
  opacity: calc(1 - var(--shade,0) * .42);
}
.sb-cast--contact {
  left: 9%; right: 9%; top: 62%; bottom: 10%;
  background: radial-gradient(50% 44% at 50% 42%,rgba(44,32,14,.40) 0%,rgba(44,32,14,.17) 48%,rgba(44,32,14,0) 78%);
  filter: blur(11px);
  opacity: calc(1 - var(--shade,0) * .5);
}
.sb-cast--hair {
  left: 12%; right: 12%; top: 70%; bottom: 17%;
  background: radial-gradient(50% 52% at 50% 40%,rgba(40,28,10,.34) 0%,rgba(40,28,10,0) 76%);
  filter: blur(4px);
  opacity: calc(1 - var(--shade,0) * .62);
}

/* ── full / half spread ─────────────────── */
.sb-full { position: absolute; inset: 0; }
.sb-full img { width: 100%; height: auto; display: block; }
.sb-half {
  position: absolute;
  top: 0; bottom: 0;
  width: 50%;
  overflow-x: clip;
  overflow-y: visible;
}
.sb-half--left  { left: 0; }
.sb-half--right { left: 50%; }
.sb-half-img { width: 200%; max-width: none; height: auto; display: block; }
.sb-half-img--right { margin-left: -100%; }
.sb-gutter-shade {
  position: absolute;
  top: 21.8%; bottom: 21.8%;
  width: 46%;
  pointer-events: none;
  opacity: calc(var(--shade,0) * .62);
  -webkit-mask-image: linear-gradient(180deg,transparent 0,#000 5.2%,#000 94.8%,transparent 100%);
  mask-image:         linear-gradient(180deg,transparent 0,#000 5.2%,#000 94.8%,transparent 100%);
}
.sb-gutter-shade--left  { right: 0; background: linear-gradient(270deg,rgba(52,38,20,.30),rgba(52,38,20,0) 82%); }
.sb-gutter-shade--right { left:  0; background: linear-gradient( 90deg,rgba(52,38,20,.24),rgba(52,38,20,0) 82%); }

/* ── page-curl strips ───────────────────── */
.sb-curl {
  position: absolute; top: 0; height: 100%;
  width: calc(var(--bw,0px) * var(--span));
  transform-style: preserve-3d; z-index: 6;
}
.sb-curl--next { left: 50%; transform-origin: left center; transform: rotateY(calc(-1 * var(--tt,0deg))); }
.sb-curl--prev { right: 50%; transform-origin: right center; transform: rotateY(var(--tt,0deg)); }
.sb-strip {
  position: absolute; top: 0; height: 100%;
  width: calc(var(--bw,0px) * var(--span) / var(--n));
  transform-style: preserve-3d;
}
.sb-curl--next .sb-strip { transform-origin: left center; }
.sb-curl--prev .sb-strip { transform-origin: right center; }
.sb-curl--next > .sb-strip { left: 0; }
.sb-curl--prev > .sb-strip { right: 0; left: auto; }
.sb-curl--next .sb-strip .sb-strip { left: 100%; transform: rotateY(var(--td,0deg)); }
.sb-curl--prev .sb-strip .sb-strip { right: 100%; transform: rotateY(calc(-1 * var(--td,0deg))); }
.sb-face {
  position: absolute; top: 0; bottom: 0; left: 0; right: -1.1px;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  background-repeat: no-repeat; background-size: var(--bw,0px) auto;
}
.sb-face--back { transform: rotateY(180deg); }
.sb-sh, .sb-gl {
  -webkit-mask-image: linear-gradient(180deg,transparent 0,#000 5.2%,#000 94.8%,transparent 100%);
  mask-image:         linear-gradient(180deg,transparent 0,#000 5.2%,#000 94.8%,transparent 100%);
}
.sb-strip--edge .sb-face .sb-sh,
.sb-strip--edge .sb-face .sb-gl {
  -webkit-mask-image: linear-gradient(180deg,transparent 0,#000 9%,#000 91%,transparent 100%),var(--hf);
  mask-image:         linear-gradient(180deg,transparent 0,#000 9%,#000 91%,transparent 100%),var(--hf);
  -webkit-mask-composite: source-in; mask-composite: intersect;
}
.sb-curl--next .sb-strip--edge .sb-face--front,
.sb-curl--prev .sb-strip--edge .sb-face--back  { --hf: linear-gradient(90deg,#000 0 22%,transparent 96%); }
.sb-curl--next .sb-strip--edge .sb-face--back,
.sb-curl--prev .sb-strip--edge .sb-face--front { --hf: linear-gradient(270deg,#000 0 22%,transparent 96%); }
.sb-sh {
  position: absolute; left: 0; right: 0; top: 21.8%; bottom: 21.8%; pointer-events: none;
}
.sb-curl--next .sb-face--front .sb-sh,
.sb-curl--prev .sb-face--back  .sb-sh { background: linear-gradient(90deg,rgba(58,43,20,var(--a1,0)),rgba(58,43,20,var(--a2,0))); }
.sb-curl--next .sb-face--back  .sb-sh,
.sb-curl--prev .sb-face--front .sb-sh { background: linear-gradient(90deg,rgba(58,43,20,var(--a2,0)),rgba(58,43,20,var(--a1,0))); }
.sb-gl {
  position: absolute; left: 0; right: 0; top: 21.8%; bottom: 21.8%;
  pointer-events: none; background: #fffaf0;
  opacity: calc(var(--shade,0) * var(--lit,1) * var(--lit,1) * .20);
}

/* ── hit zones ──────────────────────────── */
.sb-zone {
  position: absolute; top: 0; bottom: 0;
  border: 0; background: transparent;
  cursor: grab; z-index: 60;
  -webkit-tap-highlight-color: transparent;
}
.sb-zone:active { cursor: grabbing; }
.sb-zone--prev { left: 0; width: 50%; }
.sb-zone--next { right: 0; width: 50%; }

/* ── zoom layer ─────────────────────────── */
.sb-zoomwrap {
  position: absolute; inset: 0;
  overflow: hidden; pointer-events: none; z-index: 2;
  opacity: 0;
}
.sb-zoominner { position: absolute; inset: 0; transform-origin: 0 0; }

/* ── magnifier / loupe ──────────────────── */
.sb-loupe {
  position: absolute; left: 0; top: 0;
  width: var(--lr,240px); height: var(--lr,240px);
  pointer-events: none; z-index: 80; opacity: 0;
  transition: opacity .25s ease;
  will-change: transform;
}
.sb-loupe--on  { opacity: 1; }
.sb-loupe--held .sb-loupe__ring { cursor: grabbing; }
.sb-loupe__ring {
  position: absolute; inset: 0; border-radius: 50%;
  pointer-events: auto; cursor: grab;
  padding: calc(var(--lr,240px) * .058);
  box-shadow:
    0 1px 2px rgba(58,44,26,.30),
    0 10px 18px rgba(58,44,26,.24),
    0 26px 40px rgba(58,44,26,.20),
    0 48px 66px rgba(58,44,26,.13);
}
.sb-loupe__ring:before {
  content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: linear-gradient(146deg,#fdf7e9 0%,#e6d7b4 14%,#b69d70 32%,#7d6740 50%,#cdbb92 66%,#f4ead3 80%,#9b8459 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,.8), inset 0 -2px 3px rgba(70,52,26,.5);
  -webkit-mask-image: radial-gradient(circle closest-side at 50% 50%,transparent 0 88.2%,#000 89.8% 100%);
  mask-image:         radial-gradient(circle closest-side at 50% 50%,transparent 0 88.2%,#000 89.8% 100%);
}
.sb-loupe__grip {
  position: absolute; left: 50%; top: 50%;
  width: calc(var(--lr,240px) * .74); height: calc(var(--lr,240px) * .125);
  transform-origin: 0 50%;
  transform: rotate(40deg) translate(calc(var(--lr,240px) * .33),-50%);
  border-radius: calc(var(--lr,240px) * .06);
  pointer-events: auto; cursor: grab;
  background:
    linear-gradient(180deg,rgba(255,255,255,.46) 0 13%,rgba(255,255,255,0) 44%,rgba(0,0,0,.26) 100%),
    linear-gradient(90deg,#d9bd82 0 14%,#a9884e 14% 20%,#6d4c2b 20% 62%,#5a3d22 62% 92%,#7a563180 92% 100%);
  box-shadow: 0 8px 15px rgba(58,44,26,.26), 0 18px 26px rgba(58,44,26,.14);
}
.sb-loupe__lens {
  position: relative; display: block; width: 100%; height: 100%;
  border-radius: 50%; background-repeat: no-repeat; overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(52,40,22,.55),
    inset 0 4px 12px rgba(40,30,14,.28),
    inset 0 -7px 16px rgba(255,250,240,.14);
}
.sb-loupe__lens:before,
.sb-loupe__lens:after { content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; }
.sb-loupe__lens:before {
  z-index: 1;
  background: radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 54%,rgba(58,44,26,.10) 76%,rgba(46,34,16,.34) 100%);
  box-shadow:
    inset 0 0 0 2px rgba(130,162,196,.26),
    inset 0 0 0 4px rgba(206,158,112,.15);
}
.sb-loupe__lens:after {
  z-index: 2;
  background:
    radial-gradient(36% 26% at 29% 19%,rgba(255,255,255,.30),rgba(255,255,255,0) 76%),
    radial-gradient(24% 16% at 74% 86%,rgba(255,255,255,.12),rgba(255,255,255,0) 80%),
    linear-gradient(150deg,rgba(255,255,255,.06) 0 18%,rgba(255,255,255,0) 42%);
}
@media (pointer: coarse) { .sb-loupe { display: none; } }

/* ── captions ───────────────────────────── */
.sb-captions { display: grid; justify-items: center; min-height: 20px; }
.sb-captions > * { grid-area: 1/1; margin: 0; }
.sb-caption {
  font-size: 13px; letter-spacing: .18em; text-transform: uppercase;
  color: rgba(43,39,33,.58); animation: sb-cap-in .5s ease both;
}
.sb-caption--live { animation: none; }
@keyframes sb-cap-in { 0% { opacity: 0; } }

/* ── toolbar ────────────────────────────── */
.sb-tools {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid rgba(43,39,33,.14); border-radius: 999px;
  padding: 5px 7px;
  background: rgba(250,246,238,.72);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.sb-tool {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 50%; background: transparent;
  color: rgba(43,39,33,.58); cursor: pointer;
  transition: background-color .18s ease, color .18s ease;
}
.sb-tool:hover { background: rgba(255,252,244,.9); color: #2b2721; }
.sb-tool[aria-pressed="true"] { background: rgba(154,106,62,.16); color: #9a6a3e; }
.sb-tool:disabled { opacity: .32; cursor: default; background: transparent; }
.sb-tool svg { width: 15px; height: 15px; display: block; }
.sb-tool-sep { width: 1px; height: 17px; background: rgba(43,39,33,.14); margin: 0 2px; }
.sb-zoom-read {
  font-size: 11px; letter-spacing: .1em;
  color: rgba(43,39,33,.36);
  min-width: 40px; text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ── hint ───────────────────────────────── */
.sb-hint {
  margin: 0; font-size: 11px; letter-spacing: .12em;
  text-transform: uppercase; color: rgba(43,39,33,.36);
  transition: opacity .4s ease;
}
.sb-hint--gone { opacity: 0; }

@media (max-width: 640px) {
  .sb-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 70; padding: 12px 6px; }
  .sb-arrow--left  { left: 2px; }
  .sb-arrow--right { right: 2px; }
  .sb-3d { max-width: none; }
}
`;
