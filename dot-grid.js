/**
 * DotGrid Component - React Bits (Vanilla JS + HTML5 Canvas)
 * Interactive background dot matrix reacting to cursor proximity, speed, and click shockwaves.
 */

function parseColor(colorStr) {
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const num = parseInt(fullHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1
    };
  }
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
    };
  }
  return { r: 255, g: 255, b: 255, a: 0.2 };
}

export class DotGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = Object.assign({
      dotSize: 8,
      gap: 28,
      baseColor: 'rgba(255, 255, 255, 0.15)',
      activeColor: '#38bdf8',
      proximity: 160,
      speedTrigger: 100,
      shockRadius: 260,
      shockStrength: 6,
      maxSpeed: 5000,
      resistance: 750,
      returnDuration: 1.4
    }, options);

    this.baseRgb = parseColor(this.options.baseColor);
    this.activeRgb = parseColor(this.options.activeColor);

    this.dots = [];
    this.pointer = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
      speed: 0,
      lastTime: 0,
      lastX: 0,
      lastY: 0
    };

    this.init();
  }

  init() {
    this.buildDOM();
    this.buildGrid();
    this.bindEvents();
    this.startLoop();
  }

  buildDOM() {
    const computedPos = window.getComputedStyle(this.container).position;
    if (computedPos === 'static') {
      this.container.style.position = 'relative';
    }

    const wrap = document.createElement('div');
    wrap.className = 'dot-grid-bg';

    const canvas = document.createElement('canvas');
    canvas.className = 'dot-grid-canvas';

    wrap.appendChild(canvas);

    if (this.container.firstChild) {
      this.container.insertBefore(wrap, this.container.firstChild);
    } else {
      this.container.appendChild(wrap);
    }

    this.wrapperEl = wrap;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  buildGrid() {
    if (!this.wrapperEl || !this.canvas) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width || this.container.clientWidth || window.innerWidth;
    const height = rect.height || this.container.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    const { dotSize, gap } = this.options;
    const cell = dotSize + gap;
    const cols = Math.floor((width + gap) / cell);
    const rows = Math.floor((height + gap) / cell);

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const startX = (width - gridW) / 2 + dotSize / 2;
    const startY = (height - gridH) / 2 + dotSize / 2;

    this.dots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
          _inertiaApplied: false
        });
      }
    }
  }

  bindEvents() {
    this.onResize = () => this.buildGrid();
    window.addEventListener('resize', this.onResize);

    this.onMouseMove = (e) => {
      const now = performance.now();
      const pr = this.pointer;
      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;

      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);

      if (speed > this.options.maxSpeed) {
        const scale = this.options.maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = this.options.maxSpeed;
      }

      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.vx = vx;
      pr.vy = vy;
      pr.speed = speed;

      const rect = this.container.getBoundingClientRect();
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;

      if (speed > this.options.speedTrigger) {
        const prox = this.options.proximity;
        for (const dot of this.dots) {
          const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
          if (dist < prox && !dot._inertiaApplied) {
            dot._inertiaApplied = true;

            const pushX = (dot.cx - pr.x) * 0.4 + vx * 0.006;
            const pushY = (dot.cy - pr.y) * 0.4 + vy * 0.006;

            if (window.gsap) {
              window.gsap.killTweensOf(dot);
              window.gsap.to(dot, {
                xOffset: pushX,
                yOffset: pushY,
                duration: 0.3,
                ease: 'power2.out',
                onComplete: () => {
                  window.gsap.to(dot, {
                    xOffset: 0,
                    yOffset: 0,
                    duration: this.options.returnDuration,
                    ease: 'elastic.out(1, 0.75)',
                    onComplete: () => {
                      dot._inertiaApplied = false;
                    }
                  });
                }
              });
            } else {
              dot.xOffset = pushX;
              dot.yOffset = pushY;
              setTimeout(() => {
                dot.xOffset = 0;
                dot.yOffset = 0;
                dot._inertiaApplied = false;
              }, 400);
            }
          }
        }
      }
    };

    this.onClick = (e) => {
      const rect = this.container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const shockRad = this.options.shockRadius;
      const shockStr = this.options.shockStrength;

      for (const dot of this.dots) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRad && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          const falloff = Math.max(0, 1 - dist / shockRad);
          const pushX = (dot.cx - cx) * shockStr * falloff;
          const pushY = (dot.cy - cy) * shockStr * falloff;

          if (window.gsap) {
            window.gsap.killTweensOf(dot);
            window.gsap.to(dot, {
              xOffset: pushX,
              yOffset: pushY,
              duration: 0.25,
              ease: 'power2.out',
              onComplete: () => {
                window.gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: this.options.returnDuration,
                  ease: 'elastic.out(1, 0.75)',
                  onComplete: () => {
                    dot._inertiaApplied = false;
                  }
                });
              }
            });
          }
        }
      }
    };

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    this.container.addEventListener('click', this.onClick);
  }

  startLoop() {
    const { dotSize, proximity } = this.options;
    const radius = dotSize / 2;
    const proxSq = proximity * proximity;

    const render = () => {
      if (!this.ctx || !this.canvas) return;

      const rect = this.container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;

      this.ctx.clearRect(0, 0, width, height);

      const px = this.pointer.x;
      const py = this.pointer.y;

      const b = this.baseRgb;
      const a = this.activeRgb;

      for (let i = 0; i < this.dots.length; i++) {
        const dot = this.dots[i];
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;

        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        let r = b.r, g = b.g, bl = b.b, alpha = b.a;

        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          r = Math.round(b.r + (a.r - b.r) * t);
          g = Math.round(b.g + (a.g - b.g) * t);
          bl = Math.round(b.b + (a.b - b.b) * t);
          alpha = b.a + (a.a - b.a) * t;
        }

        this.ctx.beginPath();
        this.ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
        this.ctx.fill();
      }

      this.rafId = requestAnimationFrame(render);
    };

    render();
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.container) this.container.removeEventListener('click', this.onClick);
    if (this.wrapperEl) this.wrapperEl.remove();
  }
}
