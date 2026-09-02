/**
 * BorderGlow Component – Pure Border Glow (Vanilla JS)
 * High-performance, buttery-smooth cursor & touch reactive border glow.
 * Only the border line glows — no background/box wash.
 */

export class BorderGlow {
  constructor(element, options = {}) {
    if (typeof element === 'string') {
      this.el = document.querySelector(element);
    } else {https://127.0.0.1:49793/static/artifacts/84348e6c-b50a-4b51-82ae-513913206889/.user_uploaded/media_1787819969130.png?csrf=6bc16692-ea14-45db-bc95-5579dbf00f5a
      this.el = element;
    }
    if (!this.el) return;

    this.options = Object.assign({
      coneSpreadDeg: 40, // half-beam width in degrees
      lerpSpeed: 0.16,   // smooth cursor follow interpolation (0.1 - 0.3)
      borderWidth: 1.5,
      animated: true     // intro sweep when scrolled into viewport
    }, options);

    this.currentAngle = 0;
    this.targetAngle = 0;
    this.currentOpacity = 0;
    this.targetOpacity = 0;
    this.isHovered = false;
    this.isSweeping = false;
    this.rafId = null;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerEnter = this.onPointerEnter.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.update = this.update.bind(this);

    this.init();
  }

  init() {
    const el = this.el;
    el.classList.add('border-glow-card');

    // Ensure edge-light span exists for focused halo
    if (!el.querySelector(':scope > .edge-light')) {
      const edgeLight = document.createElement('span');
      edgeLight.className = 'edge-light';
      edgeLight.setAttribute('aria-hidden', 'true');
      el.appendChild(edgeLight);
    }

    el.style.setProperty('--cone-spread-deg', `${this.options.coneSpreadDeg}deg`);
    el.style.setProperty('--glow-border-width', `${this.options.borderWidth}px`);
    el.style.setProperty('--cursor-angle', '0deg');
    el.style.setProperty('--border-glow-opacity', '0');

    // Desktop Pointer Events
    el.addEventListener('pointerenter', this.onPointerEnter, { passive: true });
    el.addEventListener('pointermove', this.onPointerMove, { passive: true });
    el.addEventListener('pointerleave', this.onPointerLeave, { passive: true });

    // Touch Events (Mobile/Tablet)
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchmove', this.onTouchMove, { passive: true });
    el.addEventListener('touchend', this.onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', this.onTouchEnd, { passive: true });

    // Intro scroll sweep
    if (this.options.animated) {
      this.setupObserver();
    }
  }

  calculateAngle(clientX, clientY) {
    const rect = this.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    const rad = Math.atan2(dy, dx);
    let deg = rad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    // Shortest-path angle difference
    const diff = ((deg - (this.targetAngle % 360) + 540) % 360) - 180;
    this.targetAngle += diff;
  }

  onPointerEnter(e) {
    this.isHovered = true;
    this.targetOpacity = 1;
    this.calculateAngle(e.clientX, e.clientY);
    this.startLoop();
  }

  onPointerMove(e) {
    this.calculateAngle(e.clientX, e.clientY);
    this.startLoop();
  }

  onPointerLeave() {
    this.isHovered = false;
    if (!this.isSweeping) {
      this.targetOpacity = 0;
    }
    this.startLoop();
  }

  onTouchStart(e) {
    if (e.touches && e.touches[0]) {
      this.isHovered = true;
      this.targetOpacity = 1;
      this.calculateAngle(e.touches[0].clientX, e.touches[0].clientY);
      this.startLoop();
    }
  }

  onTouchMove(e) {
    if (e.touches && e.touches[0]) {
      this.calculateAngle(e.touches[0].clientX, e.touches[0].clientY);
      this.startLoop();
    }
  }

  onTouchEnd() {
    this.isHovered = false;
    if (!this.isSweeping) {
      this.targetOpacity = 0;
    }
    this.startLoop();
  }

  startLoop() {
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.update);
    }
  }

  update() {
    // Smooth angle interpolation
    this.currentAngle += (this.targetAngle - this.currentAngle) * this.options.lerpSpeed;

    // Smooth opacity transition
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * 0.14;

    this.el.style.setProperty('--cursor-angle', `${this.currentAngle.toFixed(2)}deg`);
    this.el.style.setProperty('--border-glow-opacity', this.currentOpacity.toFixed(3));

    // Stop loop when idle and invisible
    if (!this.isHovered && !this.isSweeping && this.currentOpacity < 0.005) {
      this.currentOpacity = 0;
      this.el.style.setProperty('--border-glow-opacity', '0');
      this.rafId = null;
      return;
    }

    this.rafId = requestAnimationFrame(this.update);
  }

  triggerSweep() {
    if (this.isHovered) return;
    this.isSweeping = true;
    this.targetOpacity = 0.9;
    this.startLoop();

    const startAngle = this.targetAngle;
    const sweepSpan = 360;
    const duration = 1600;
    const startTime = performance.now();

    const sweepTick = (now) => {
      if (this.isHovered) {
        this.isSweeping = false;
        return;
      }
      const progress = Math.min((now - startTime) / duration, 1);
      // Cubic smooth ease
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.targetAngle = startAngle + sweepSpan * ease;

      if (progress < 1) {
        requestAnimationFrame(sweepTick);
      } else {
        this.isSweeping = false;
        if (!this.isHovered) {
          this.targetOpacity = 0;
        }
      }
    };

    requestAnimationFrame(sweepTick);
  }

  setupObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => this.triggerSweep(), 250);
          observer.unobserve(this.el);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(this.el);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.el.removeEventListener('pointerenter', this.onPointerEnter);
    this.el.removeEventListener('pointermove', this.onPointerMove);
    this.el.removeEventListener('pointerleave', this.onPointerLeave);
    this.el.removeEventListener('touchstart', this.onTouchStart);
    this.el.removeEventListener('touchmove', this.onTouchMove);
    this.el.removeEventListener('touchend', this.onTouchEnd);
    this.el.removeEventListener('touchcancel', this.onTouchEnd);
  }
}

/**
 * Global helper to initialize BorderGlow across target card elements
 */
export function initBorderGlow(selector = '.border-glow-card, .service-card, .feature-card, .design-item, .guide-box, .banner-size-card, .about-stat, .banner-sizes-cta-box', options = {}) {
  const elements = document.querySelectorAll(selector);
  const instances = [];
  elements.forEach(el => {
    instances.push(new BorderGlow(el, options));
  });
  return instances;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  window.BorderGlow = BorderGlow;
  window.initBorderGlow = initBorderGlow;
}
