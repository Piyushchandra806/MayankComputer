/* =========================================
   PixelateHover – Vanilla JS Canvas Class
   Interactive pixelation with cursor reveal
   ========================================= */

export class PixelateHover {
  constructor(container, options = {}) {
    this.container = container;
    this.opts = {
      src: '',
      alt: '',
      pixelSize: 14,
      revealRadius: 110,
      smoothing: 0.12,
      ringColor: 'rgba(255, 255, 255, 0.15)',
      ...options
    };

    this.canvas = null;
    this.ctx = null;
    this.img = null;
    this.pixelatedCanvas = null;
    this.mouse = { x: -9999, y: -9999 };
    this.smoothMouse = { x: -9999, y: -9999 };
    this.isHovering = false;
    this.raf = null;
    this.loaded = false;
    this.dpr = 1;
    this.drawX = 0;
    this.drawY = 0;
    this.drawW = 0;
    this.drawH = 0;

    this._init();
  }

  _init() {
    // Wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pixelate-hover';

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pixelate-hover__canvas';
    this.ctx = this.canvas.getContext('2d');

    // Hover hint
    this.hint = document.createElement('div');
    this.hint.className = 'pixelate-hover__hint';
    this.hint.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
      <span>Hover to reveal</span>
    `;

    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.hint);
    this.container.appendChild(this.wrapper);

    // Load image
    this.img = new Image();
    this.img.crossOrigin = 'anonymous';
    this.img.onload = () => {
      this.loaded = true;
      this._resize();
      this._preRenderPixelated();
      this._startLoop();
    };
    this.img.onerror = () => {
      // Fallback: just show the image normally
      this.wrapper.style.backgroundImage = `url(${this.opts.src})`;
      this.wrapper.style.backgroundSize = 'cover';
      this.wrapper.style.backgroundPosition = 'center';
    };
    this.img.src = this.opts.src;

    // Events
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseLeave = this._handleMouseLeave.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleMouseLeave.bind(this);

    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this._onTouchEnd);

    // Resize
    this._ro = new ResizeObserver(() => {
      if (this.loaded) {
        this._resize();
        this._preRenderPixelated();
      }
    });
    this._ro.observe(this.wrapper);
  }

  /* ── Event handlers ─────────────── */

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouse.x = (e.clientX - rect.left) * scaleX;
    this.mouse.y = (e.clientY - rect.top) * scaleY;
    this.isHovering = true;
    this.hint.classList.add('is-hidden');
  }

  _handleTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.touches[0].clientX - rect.left) * scaleX;
      this.mouse.y = (e.touches[0].clientY - rect.top) * scaleY;
      this.isHovering = true;
      this.hint.classList.add('is-hidden');
    }
  }

  _handleMouseLeave() {
    this.isHovering = false;
  }

  /* ── Sizing ─────────────────────── */

  _resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.dpr = dpr;

    // Cover-fit
    const imgAspect = this.img.width / this.img.height;
    const canvasAspect = this.canvas.width / this.canvas.height;

    if (imgAspect > canvasAspect) {
      this.drawH = this.canvas.height;
      this.drawW = this.drawH * imgAspect;
    } else {
      this.drawW = this.canvas.width;
      this.drawH = this.drawW / imgAspect;
    }
    this.drawX = (this.canvas.width - this.drawW) / 2;
    this.drawY = (this.canvas.height - this.drawH) / 2;
  }

  /* ── Pixelation ─────────────────── */

  _preRenderPixelated() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ps = this.opts.pixelSize * this.dpr;

    // Step 1: Draw clear image at full resolution
    const full = document.createElement('canvas');
    full.width = w;
    full.height = h;
    const fCtx = full.getContext('2d');
    fCtx.drawImage(this.img, this.drawX, this.drawY, this.drawW, this.drawH);

    // Step 2: Shrink to tiny canvas
    const smallW = Math.max(1, Math.ceil(w / ps));
    const smallH = Math.max(1, Math.ceil(h / ps));
    const small = document.createElement('canvas');
    small.width = smallW;
    small.height = smallH;
    const sCtx = small.getContext('2d');
    sCtx.drawImage(full, 0, 0, w, h, 0, 0, smallW, smallH);

    // Step 3: Scale back up — no smoothing = blocky pixels
    this.pixelatedCanvas = document.createElement('canvas');
    this.pixelatedCanvas.width = w;
    this.pixelatedCanvas.height = h;
    const pCtx = this.pixelatedCanvas.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    pCtx.drawImage(small, 0, 0, smallW, smallH, 0, 0, w, h);
  }

  /* ── Render loop ────────────────── */

  _render() {
    if (!this.loaded) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const k = this.opts.smoothing;

    // Smooth interpolation
    if (this.isHovering) {
      this.smoothMouse.x += (this.mouse.x - this.smoothMouse.x) * k;
      this.smoothMouse.y += (this.mouse.y - this.smoothMouse.y) * k;
    } else {
      this.smoothMouse.x += (-9999 - this.smoothMouse.x) * k * 0.3;
      this.smoothMouse.y += (-9999 - this.smoothMouse.y) * k * 0.3;
    }

    // 1. Draw pixelated base
    ctx.clearRect(0, 0, w, h);
    if (this.pixelatedCanvas) {
      ctx.drawImage(this.pixelatedCanvas, 0, 0);
    }

    // 2. Draw clear reveal circle
    const mx = this.smoothMouse.x;
    const my = this.smoothMouse.y;
    const r = this.opts.revealRadius * this.dpr;

    if (mx > -5000) {
      // Clear image inside circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.img, this.drawX, this.drawY, this.drawW, this.drawH);
      ctx.restore();

      // Subtle ring at edge
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.strokeStyle = this.opts.ringColor;
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.stroke();
    }

    this.raf = requestAnimationFrame(() => this._render());
  }

  _startLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this._render();
  }

  /* ── Cleanup ────────────────────── */

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._ro) this._ro.disconnect();
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    if (this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
  }
}
