/* =========================================
   DepthCarousel – Vanilla JS Class
   Converted from React Bits DepthCarousel
   ========================================= */

// Use the global gsap loaded via CDN <script> tag
const gsap = window.gsap;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeItem = it => (typeof it === 'string' ? { image: it, alt: '' } : it);

export class DepthCarousel {
  constructor(container, options = {}) {
    this.container = container;

    const defaults = {
      items: [
        { image: 'https://picsum.photos/seed/depth1/800/1000', alt: 'Slide 1' },
        { image: 'https://picsum.photos/seed/depth2/800/1000', alt: 'Slide 2' },
        { image: 'https://picsum.photos/seed/depth3/800/1000', alt: 'Slide 3' },
        { image: 'https://picsum.photos/seed/depth4/800/1000', alt: 'Slide 4' },
        { image: 'https://picsum.photos/seed/depth5/800/1000', alt: 'Slide 5' },
        { image: 'https://picsum.photos/seed/depth6/800/1000', alt: 'Slide 6' }
      ],
      cardWidth: 300,
      cardHeight: 380,
      radius: 18,
      tint: '#05060a',
      depth: 220,
      spread: 90,
      tilt: 22,
      tiltDirection: 'right',
      perspective: 1400,
      visibleCards: 4,
      falloff: 0.2,
      blur: 6,
      duration: 700,
      ease: 'power3.out',
      autoplay: false,
      autoplayDelay: 3200,
      loop: true,
      showControls: true,
      showIndicators: true,
      onChange: null
    };

    this.opts = { ...defaults, ...options };
    this.data = (Array.isArray(this.opts.items) ? this.opts.items : []).map(normalizeItem);
    this.count = this.data.length;

    // State
    this.pos = 0;
    this.focusIdx = 0;
    this.tween = null;
    this.scale = 1;
    this.active = 0;

    // Element refs
    this.cardEls = [];
    this.overlayEls = [];
    this.dotEls = [];
    this.root = null;
    this.stage = null;

    // Interaction state
    this.dragState = null;
    this.wheelTimer = null;
    this.autoTimer = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Bound handlers
    this._boundPointerDown = this._handlePointerDown.bind(this);
    this._boundPointerMove = this._handlePointerMove.bind(this);
    this._boundPointerEnd = this._handlePointerEnd.bind(this);
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundWheel = this._handleWheel.bind(this);

    this._build();
    this._init();
  }

  /* ── DOM Construction ────────────────────── */

  _build() {
    const o = this.opts;

    // Root
    this.root = document.createElement('div');
    this.root.className = 'depth-carousel';
    this.root.style.setProperty('--dc-perspective', `${o.perspective}px`);
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-roledescription', 'carousel');
    this.root.setAttribute('aria-label', 'Depth carousel');
    this.root.tabIndex = 0;

    // Stage
    this.stage = document.createElement('div');
    this.stage.className = 'depth-carousel__stage';

    // Cards
    this.data.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'depth-carousel__card';
      card.style.width = `${o.cardWidth}px`;
      card.style.height = `${o.cardHeight}px`;
      card.style.borderRadius = `${o.radius}px`;
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', `${i + 1} of ${this.count}`);
      card.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');

      const img = document.createElement('img');
      img.className = 'depth-carousel__img';
      img.src = item.image;
      img.alt = item.alt || '';
      img.draggable = false;

      const tintEl = document.createElement('span');
      tintEl.className = 'depth-carousel__tint';
      tintEl.style.background = o.tint;

      card.appendChild(img);
      card.appendChild(tintEl);
      card.addEventListener('click', () => this._onCardClick(i));

      this.cardEls.push(card);
      this.overlayEls.push(tintEl);
      this.stage.appendChild(card);
    });

    this.root.appendChild(this.stage);

    // Arrow controls
    if (o.showControls && this.count > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'depth-carousel__arrow depth-carousel__arrow--prev';
      prevBtn.setAttribute('aria-label', 'Previous slide');
      prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      prevBtn.addEventListener('click', () => this.navigateBy(-1));

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'depth-carousel__arrow depth-carousel__arrow--next';
      nextBtn.setAttribute('aria-label', 'Next slide');
      nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      nextBtn.addEventListener('click', () => this.navigateBy(1));

      this.root.appendChild(prevBtn);
      this.root.appendChild(nextBtn);
    }

    // Dot indicators
    if (o.showIndicators && this.count > 1) {
      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'depth-carousel__dots';
      dotsWrap.setAttribute('role', 'tablist');
      dotsWrap.setAttribute('aria-label', 'Slides');

      this.data.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.className = `depth-carousel__dot${i === 0 ? ' is-active' : ''}`;
        dot.addEventListener('click', () => this.setFocus(i, true));

        this.dotEls.push(dot);
        dotsWrap.appendChild(dot);
      });

      this.root.appendChild(dotsWrap);
    }

    this.container.appendChild(this.root);
  }

  /* ── Layout ──────────────────────────────── */

  layout(pos) {
    const o = this.opts;
    const n = this.count;
    if (!n) return;

    const dir = o.tiltDirection === 'left' ? -1 : 1;
    const sc = this.scale;

    for (let i = 0; i < n; i++) {
      const el = this.cardEls[i];
      if (!el) continue;

      let d = i - pos;
      if (o.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }

      const back = Math.max(0, d);
      const az = Math.abs(d);
      const shown = az <= o.visibleCards + 0.5;

      const tz = -o.depth * d;
      const tx = dir * o.spread * d;
      const ry = dir * o.tilt * clamp(d, 0, 1);

      let opacity = d < 0 ? Math.max(0, 1 + d) : 1;
      if (!shown) opacity = 0;

      const brightness = Math.max(0.15, 1 - back * o.falloff);
      const blurPx = o.blur > 0
        ? Math.min(o.blur, (back / Math.max(1, o.visibleCards)) * o.blur)
        : 0;
      const zi = Math.round(2000 - d * 20);

      el.style.transform =
        `translate(-50%, -50%) scale(${sc}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      el.style.zIndex = String(zi);
      el.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

      const ov = this.overlayEls[i];
      if (ov) ov.style.opacity = clamp(back * o.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  }

  /* ── State helpers ───────────────────────── */

  _updateActive(idx) {
    this.active = idx;

    this.dotEls.forEach((dot, i) => {
      const isActive = i === idx;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    this.cardEls.forEach((card, i) => {
      card.setAttribute('aria-hidden', i !== idx ? 'true' : 'false');
    });

    if (this.opts.onChange) {
      this.opts.onChange(idx, this.data[idx]);
    }
  }

  /* ── Animation ───────────────────────────── */

  tweenTo(target, animate) {
    if (this.tween) this.tween.kill();

    const o = this.opts;
    const proxy = { p: this.pos };
    const dur = animate && !this.reducedMotion ? o.duration / 1000 : 0;

    this.tween = gsap.to(proxy, {
      p: target,
      duration: dur,
      ease: o.ease,
      onUpdate: () => {
        this.pos = proxy.p;
        this.layout(this.pos);
      },
      onComplete: () => {
        const n = this.count;
        if (n > 0) this.pos = ((this.pos % n) + n) % n;
        this.layout(this.pos);
      }
    });
  }

  setFocus(rawIndex, animate = true) {
    const o = this.opts;
    const n = this.count;
    if (!n) return;

    const idx = o.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
    let delta = idx - this.pos;
    if (o.loop && n > 1) {
      delta = ((delta % n) + n) % n;
      if (delta > n / 2) delta -= n;
    }

    this.tweenTo(this.pos + delta, animate);

    if (idx !== this.focusIdx) {
      this.focusIdx = idx;
      this._updateActive(idx);
    }
  }

  navigateBy(step) {
    this.setFocus(this.focusIdx + step, true);
  }

  /* ── Pointer / Drag ──────────────────────── */

  _handlePointerDown(e) {
    if (this.count < 2) return;
    if (this.tween) this.tween.kill();

    this.dragState = {
      x: e.clientX,
      startPos: this.pos,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      moved: false,
      id: e.pointerId
    };
  }

  _handlePointerMove(e) {
    const drag = this.dragState;
    if (!drag) return;

    const stepPx = Math.max(this.opts.cardWidth * 0.55 * this.scale, 40);
    const dx = e.clientX - drag.x;

    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      this.root.setPointerCapture(drag.id);
    }
    if (!drag.moved) return;

    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    drag.v = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = now;

    this.pos = drag.startPos - dx / stepPx;
    this.layout(this.pos);
  }

  _handlePointerEnd() {
    const drag = this.dragState;
    if (!drag) return;
    this.dragState = null;
    if (!drag.moved) return;

    const stepPx = Math.max(this.opts.cardWidth * 0.55 * this.scale, 40);
    const projected = this.pos - (drag.v * 180) / stepPx;
    this.setFocus(Math.round(projected), true);
  }

  /* ── Wheel ───────────────────────────────── */

  _handleWheel(e) {
    if (this.count < 2) return;
    e.preventDefault();
    if (this.tween) this.tween.kill();

    const o = this.opts;
    const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const delta = e.deltaMode === 1 ? raw * 24 : raw;
    const step = clamp(delta / (o.cardWidth * 0.9), -0.6, 0.6);

    this.pos += step;
    this.layout(this.pos);

    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      this.setFocus(Math.round(this.pos), true);
    }, 130);
  }

  /* ── Keyboard ────────────────────────────── */

  _handleKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.navigateBy(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.navigateBy(1);
    }
  }

  /* ── Card click ──────────────────────────── */

  _onCardClick(index) {
    if (this.dragState?.moved) return;
    this.setFocus(index, true);
  }

  /* ── Autoplay ────────────────────────────── */

  _setupAutoplay() {
    let hovered = false;
    let focused = false;

    const stop = () => {
      if (this.autoTimer) clearInterval(this.autoTimer);
      this.autoTimer = null;
    };

    const start = () => {
      stop();
      this.autoTimer = setInterval(() => {
        if (!hovered && !focused) this.navigateBy(1);
      }, Math.max(this.opts.autoplayDelay, 600));
    };

    this.root.addEventListener('mouseenter', () => { hovered = true; });
    this.root.addEventListener('mouseleave', () => { hovered = false; });
    this.root.addEventListener('focusin', () => { focused = true; });
    this.root.addEventListener('focusout', () => { focused = false; });

    start();
    this._stopAutoplay = stop;
  }

  /* ── Initialisation ──────────────────────── */

  _init() {
    // Pointer events
    this.root.addEventListener('pointerdown', this._boundPointerDown);
    this.root.addEventListener('pointermove', this._boundPointerMove);
    this.root.addEventListener('pointerup', this._boundPointerEnd);
    this.root.addEventListener('pointercancel', this._boundPointerEnd);

    // Keyboard
    this.root.addEventListener('keydown', this._boundKeyDown);

    // Wheel
    this.root.addEventListener('wheel', this._boundWheel, { passive: false });

    // Resize observer
    this._ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      const o = this.opts;
      const needed = o.cardWidth + Math.abs(o.spread) * 2 + 120;
      this.scale = clamp(w / needed, 0.4, 1);
      this.layout(this.pos);
    });
    this._ro.observe(this.root);

    // Initial layout
    this.layout(this.pos);

    // Autoplay
    if (this.opts.autoplay && !this.reducedMotion && this.count > 1) {
      this._setupAutoplay();
    }
  }

  /* ── Cleanup ─────────────────────────────── */

  destroy() {
    if (this.tween) this.tween.kill();
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this._ro) this._ro.disconnect();

    this.root.removeEventListener('pointerdown', this._boundPointerDown);
    this.root.removeEventListener('pointermove', this._boundPointerMove);
    this.root.removeEventListener('pointerup', this._boundPointerEnd);
    this.root.removeEventListener('pointercancel', this._boundPointerEnd);
    this.root.removeEventListener('keydown', this._boundKeyDown);
    this.root.removeEventListener('wheel', this._boundWheel);

    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
