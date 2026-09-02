/**
 * CountUp — Vanilla JS port of the React Bits <CountUp /> component.
 *
 * Uses spring-physics animation identical to motion/react's useSpring,
 * with IntersectionObserver to trigger when the element scrolls into view.
 *
 * Usage:
 *   new CountUp(element, { from: 0, to: 50, suffix: 'K+', duration: 2 });
 */
export class CountUp {
  /**
   * @param {HTMLElement} el
   * @param {object}      opts
   * @param {number}  [opts.from=0]
   * @param {number}   opts.to
   * @param {string}  [opts.direction='up']
   * @param {number}  [opts.delay=0]          Seconds before animation starts.
   * @param {number}  [opts.duration=2]       Controls spring damping & stiffness.
   * @param {string}  [opts.separator='']     Thousands separator character.
   * @param {string}  [opts.suffix='']        Text appended after the number (e.g. "K+").
   * @param {boolean} [opts.startWhen=true]
   * @param {function}[opts.onStart]
   * @param {function}[opts.onEnd]
   */
  constructor(el, opts = {}) {
    this.el = el;
    this.o = Object.assign({
      from: 0, to: 0, direction: 'up',
      delay: 0, duration: 2, separator: '',
      suffix: '', startWhen: true,
      onStart: null, onEnd: null,
    }, opts);

    // Spring coefficients — same formula as the React component
    this._damping   = 20 + 40 * (1 / this.o.duration);
    this._stiffness = 100 * (1 / this.o.duration);

    // Spring state
    this._pos = this.o.direction === 'down' ? this.o.to : this.o.from;
    this._vel = 0;
    this._target = this.o.direction === 'down' ? this.o.from : this.o.to;

    this._rafId   = null;
    this._started = false;

    // Decimal precision
    this._dec = Math.max(this._decimals(this.o.from), this._decimals(this.o.to));

    // Initial render
    this._write(this._pos);

    // Scroll trigger
    this._io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && this.o.startWhen && !this._started) {
        this._started = true;
        this._io.disconnect();
        this._begin();
      }
    }, { threshold: 0.15 });
    this._io.observe(this.el);
  }

  /* ── helpers ─────────────────────────────────────── */

  _decimals(n) {
    const s = n.toString();
    if (!s.includes('.')) return 0;
    const d = s.split('.')[1];
    return parseInt(d) !== 0 ? d.length : 0;
  }

  _format(v) {
    const hasD = this._dec > 0;
    const formatted = new Intl.NumberFormat('en-US', {
      useGrouping: !!this.o.separator,
      minimumFractionDigits: hasD ? this._dec : 0,
      maximumFractionDigits: hasD ? this._dec : 0,
    }).format(v);
    return this.o.separator
      ? formatted.replace(/,/g, this.o.separator)
      : formatted;
  }

  _write(v) {
    this.el.textContent = this._format(v) + this.o.suffix;
  }

  _begin() {
    setTimeout(() => {
      if (typeof this.o.onStart === 'function') this.o.onStart();
      this._tick();
      setTimeout(() => {
        if (typeof this.o.onEnd === 'function') this.o.onEnd();
      }, this.o.duration * 1000);
    }, this.o.delay * 1000);
  }

  /**
   * Semi-implicit Euler integration — replicates motion/react's spring solver.
   */
  _tick(prev) {
    const now = performance.now();
    const dt  = prev ? Math.min((now - prev) / 1000, 0.064) : 0.016;

    const springF = -this._stiffness * (this._pos - this._target);
    const dampF   = -this._damping  * this._vel;

    this._vel += (springF + dampF) * dt;
    this._pos += this._vel * dt;

    this._write(this._pos);

    if (Math.abs(this._pos - this._target) < 0.05 && Math.abs(this._vel) < 0.05) {
      this._pos = this._target;
      this._write(this._pos);
      return;
    }

    this._rafId = requestAnimationFrame(() => this._tick(now));
  }

  /** Call manually if startWhen was false. */
  start() {
    if (!this._started) {
      this._started = true;
      this._io.disconnect();
      this._begin();
    }
  }

  destroy() {
    this._io.disconnect();
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }
}
