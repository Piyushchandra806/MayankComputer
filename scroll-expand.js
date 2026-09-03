/* =========================================
   ScrollExpand – Vanilla JS Class
   Adapted from React Bits ScrollExpand component
   ========================================= */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

export class ScrollExpand {
  constructor(container, options = {}) {
    this.opts = {
      src: '',
      mediaType: 'image',
      poster: '',
      alt: '',
      title: '',
      scrollHint: '',
      startWidth: 42,
      startHeight: 58,
      startRadius: 24,
      endRadius: 0,
      mediaZoom: 1.35,
      scrollDistance: 1.2,
      holdDistance: 0.35,
      smoothing: 0.1,
      overlayScrim: 0.45,
      useWindowScroll: true,
      enabled: true,
      overlayHTML: '',
      ...options
    };

    this.container = container;
    this.raf = 0;
    this.current = 0;
    this.target = 0;
    this.stageH = 0;
    this.stageH = 0;
    this.running = false;
    this.isInView = true;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._build();
    this._init();
  }

  _build() {
    const o = this.opts;

    // Root
    this.root = document.createElement('div');
    this.root.className = `scroll-expand ${o.useWindowScroll ? 'scroll-expand--window' : ''}`.trim();

    // Track
    this.track = document.createElement('div');
    this.track.className = 'scroll-expand__track';

    // Stage
    this.stage = document.createElement('div');
    this.stage.className = 'scroll-expand__stage';

    // Frame
    this.frame = document.createElement('div');
    this.frame.className = 'scroll-expand__frame';

    // Media
    if (o.mediaType === 'video') {
      this.media = document.createElement('video');
      this.media.src = o.src;
      if (o.poster) this.media.poster = o.poster;
      this.media.autoplay = true;
      this.media.muted = true;
      this.media.loop = true;
      this.media.playsInline = true;
    } else {
      this.media = document.createElement('img');
      this.media.src = o.src;
      this.media.alt = o.alt || '';
      this.media.draggable = false;
    }
    this.media.className = 'scroll-expand__media';

    // Scrim
    this.scrim = document.createElement('div');
    this.scrim.className = 'scroll-expand__scrim';

    // Overlay (children)
    if (o.overlayHTML) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'scroll-expand__overlay';
      this.overlay.innerHTML = o.overlayHTML;
    }

    // Title
    if (o.title) {
      this.titleEl = document.createElement('div');
      this.titleEl.className = 'scroll-expand__title';
      this.titleEl.textContent = o.title;
    }

    // Hint
    if (o.scrollHint) {
      this.hintEl = document.createElement('div');
      this.hintEl.className = 'scroll-expand__hint';
      this.hintEl.textContent = o.scrollHint;
    }

    // Border ring (visual cue for scroll interaction)
    this.borderEl = document.createElement('div');
    this.borderEl.className = 'scroll-expand__border';

    // Assemble
    this.frame.append(this.media, this.scrim);
    if (this.overlay) this.frame.append(this.overlay);
    this.stage.append(this.frame);
    this.stage.append(this.borderEl);
    if (this.titleEl) this.stage.append(this.titleEl);
    if (this.hintEl) this.stage.append(this.hintEl);
    this.track.append(this.stage);
    this.root.append(this.track);
    this.container.append(this.root);
  }

  _applyProgress(p) {
    const o = this.opts;
    const e = smoothstep(0, 1, p);

    const w = o.startWidth + (100 - o.startWidth) * e;
    const h = o.startHeight + (100 - o.startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = o.startRadius + (o.endRadius - o.startRadius) * e;

    this.frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;
    this.media.style.transform = `scale(${o.mediaZoom + (1 - o.mediaZoom) * e})`;
    this.scrim.style.opacity = `${o.overlayScrim * e}`;

    if (this.titleEl) {
      const out = smoothstep(0.4, 0.88, p);
      // Scale font size proportionally with the frame: small when frame is small, big when expanded
      const frameScale = w / 100; // 0.48 → 1.0
      const minFontVw = 3;  // vw when frame is smallest
      const maxFontVw = 7;  // vw when frame is full
      const fontSize = minFontVw + (maxFontVw - minFontVw) * frameScale;
      this.titleEl.style.fontSize = `${fontSize}vw`;
      this.titleEl.style.opacity = `${1 - out}`;
      this.titleEl.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
      // Keep title inside the clip area
      this.titleEl.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;
    }

    if (this.hintEl) {
      const gone = smoothstep(0, 0.12, p);
      this.hintEl.style.opacity = `${1 - gone}`;
      this.hintEl.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (this.overlay) {
      const inn = smoothstep(0.68, 1, p);
      this.overlay.style.opacity = `${inn}`;
      this.overlay.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
      // Keep overlay inside the clip area too
      this.overlay.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;
    }

    // Border ring — positioned to match the clip-path edge, fades out as image expands
    if (this.borderEl) {
      this.borderEl.style.top = `${iy}%`;
      this.borderEl.style.left = `${ix}%`;
      this.borderEl.style.width = `${w}%`;
      this.borderEl.style.height = `${h}%`;
      this.borderEl.style.borderRadius = `${r}px`;
      const borderFade = Math.max(0, 1 - smoothstep(0.6, 1, p));
      this.borderEl.style.opacity = borderFade.toFixed(3);
    }
  }

  _measure() {
    const o = this.opts;
    this.stageH = o.useWindowScroll ? window.innerHeight : this.root.clientHeight;
    if (this.stageH <= 0) return;

    this.stage.style.height = `${this.stageH}px`;
    const totalH = this.stageH * (1 + Math.max(0, o.scrollDistance) + Math.max(0, o.holdDistance));
    this.track.style.height = `${totalH}px`;

    const w = this.root.clientWidth || this.stageH;
    this.stage.style.setProperty('--se-title-size', `${clamp(w * 0.075, 20, 84)}px`);
  }

  _readProgress() {
    const o = this.opts;
    if (!o.enabled) return 1;
    const span = this.stageH * Math.max(0.01, o.scrollDistance);
    if (o.useWindowScroll) {
      const top = this.track.getBoundingClientRect().top;
      return clamp(-top / span, 0, 1);
    }
    return clamp(this.root.scrollTop / span, 0, 1);
  }

  _tick() {
    if (!this.isInView) {
      this.running = false;
      return;
    }
    const o = this.opts;
    const k = o.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * o.smoothing));
    this.current += (this.target - this.current) * k;
    if (Math.abs(this.target - this.current) < 0.0004) {
      this.current = this.target;
      this.running = false;
    }
    this._applyProgress(this.current);
    this.raf = this.running ? requestAnimationFrame(() => this._tick()) : 0;
  }

  _kick() {
    if (this.running) return;
    this.running = true;
    if (!this.raf) this.raf = requestAnimationFrame(() => this._tick());
  }

  _init() {
    const o = this.opts;

    this._onScroll = () => {
      if (!this.isInView) return;
      this.target = this._readProgress();
      if (o.smoothing <= 0 || this.reduceMotion) {
        this.current = this.target;
        this._applyProgress(this.current);
        return;
      }
      this._kick();
    };

    this._onResize = () => {
      this._measure();
      this.target = this._readProgress();
      this.current = this.target;
      this._applyProgress(this.current);
    };

    this._measure();
    this.target = this._readProgress();
    this.current = this.target;
    this._applyProgress(this.current);

    const scroller = o.useWindowScroll ? window : this.root;
    scroller.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);

    this._ro = new ResizeObserver(this._onResize);
    this._ro.observe(this.root);

    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver((entries) => {
        this.isInView = entries[0].isIntersecting;
        if (this.isInView) {
          this._onScroll();
        }
      }, { rootMargin: '200px 0px' });
      this._io.observe(this.root);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const scroller = this.opts.useWindowScroll ? window : this.root;
    scroller.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
