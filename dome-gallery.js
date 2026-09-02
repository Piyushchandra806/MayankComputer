/**
 * DomeGallery Module - React Bits Component
 * Vanilla JavaScript Implementation
 * 3D Spherical Interactive Dome Gallery with continuous slow auto-rotation,
 * momentum drag & click-to-enlarge.
 */

const DEFAULT_WEDDING_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1000&q=80',
    alt: 'The Rajwada Royal Crimson Wedding Suite'
  },
  {
    src: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=1000&q=80',
    alt: 'Blush Botanical Watercolor Wedding Suite'
  },
  {
    src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
    alt: 'Midnight Blue Velvet Box Invitation'
  },
  {
    src: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?auto=format&fit=crop&w=1000&q=80',
    alt: 'Traditional Shahi Farman Silk Scroll'
  },
  {
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
    alt: 'Laser-Cut Gatefold Frosted Acrylic Suite'
  },
  {
    src: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1000&q=80',
    alt: 'Traditional Red & Gold Sanskrit Vedic Card'
  },
  {
    src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=80',
    alt: 'Emerald Monogram & Foil Wax Seal Card'
  },
  {
    src: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1000&q=80',
    alt: 'Destination Wedding Passport & Ticket Suite'
  },
  {
    src: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1000&q=80',
    alt: 'Handmade Deckled Edge Cotton Paper Card'
  },
  {
    src: 'https://images.unsplash.com/photo-1513279922550-250c2129b13a?auto=format&fit=crop&w=1000&q=80',
    alt: 'Gold Foil Monogram Hardcover Envelope'
  },
  {
    src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1000&q=80',
    alt: 'Vintage Calligraphy & Wax Seal Invitation'
  },
  {
    src: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=80',
    alt: 'Pastel Floral Gatefold Invitation Suite'
  }
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el, name, fallback) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '' }));
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') {
      return { src: image, alt: '' };
    }
    return { src: image.src || '', alt: image.alt || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export class DomeGallery {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = Object.assign({
      images: DEFAULT_WEDDING_IMAGES,
      fit: 0.52,
      fitBasis: 'auto',
      minRadius: 560,
      maxRadius: Infinity,
      padFactor: 0.22,
      overlayBlurColor: '#0d0a12',
      maxVerticalRotationDeg: 6,
      dragSensitivity: 22,
      enlargeTransitionMs: 350,
      segments: 35,
      dragDampening: 2,
      openedImageWidth: '420px',
      openedImageHeight: '420px',
      imageBorderRadius: '28px',
      openedImageBorderRadius: '28px',
      grayscale: false,
      autoRotate: true,
      autoRotateSpeed: 0.08
    }, options);

    this.rotation = { x: 0, y: 0 };
    this.startRot = { x: 0, y: 0 };
    this.startPos = null;
    this.dragging = false;
    this.moved = false;
    this.inertiaRAF = null;
    this.autoRotateRAF = null;
    this.opening = false;
    this.openStartedAt = 0;
    this.lastDragEndAt = 0;
    this.focusedEl = null;
    this.originalTilePosition = null;

    this.init();
  }

  init() {
    const {
      images,
      segments,
      overlayBlurColor,
      imageBorderRadius,
      openedImageBorderRadius,
      grayscale
    } = this.options;

    const items = buildItems(images, segments);

    // Build DOM structure
    this.container.innerHTML = `
      <div class="sphere-root"
           style="--segments-x: ${segments}; --segments-y: ${segments}; --overlay-blur-color: ${overlayBlurColor}; --tile-radius: ${imageBorderRadius}; --enlarge-radius: ${openedImageBorderRadius}; --image-filter: ${grayscale ? 'grayscale(1)' : 'none'};">
        <main class="sphere-main">
          <div class="stage">
            <div class="sphere">
              ${items.map((it, i) => `
                <div class="item"
                     data-src="${it.src}"
                     data-offset-x="${it.x}"
                     data-offset-y="${it.y}"
                     data-size-x="${it.sizeX}"
                     data-size-y="${it.sizeY}"
                     style="--offset-x: ${it.x}; --offset-y: ${it.y}; --item-size-x: ${it.sizeX}; --item-size-y: ${it.sizeY};">
                  <div class="item__image" role="button" tabindex="0" aria-label="${it.alt || 'Open image'}">
                    <img src="${it.src}" draggable="false" alt="${it.alt || 'Wedding Card Design'}" loading="lazy" />
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="overlay"></div>
          <div class="overlay overlay--blur"></div>
          <div class="edge-fade edge-fade--top"></div>
          <div class="edge-fade edge-fade--bottom"></div>

          <div class="viewer">
            <div class="scrim"></div>
            <div class="frame"></div>
          </div>
        </main>
        
        <div class="dome-hint-badge">
          <span class="dome-hint-icon">✦</span>
          <span>Continuous 3D rotation · Drag to explore · Click to inspect</span>
        </div>
      </div>
    `;

    this.root = this.container.querySelector('.sphere-root');
    this.main = this.container.querySelector('.sphere-main');
    this.sphere = this.container.querySelector('.sphere');
    this.viewer = this.container.querySelector('.viewer');
    this.scrim = this.container.querySelector('.scrim');
    this.frame = this.container.querySelector('.frame');

    this.applyTransform(this.rotation.x, this.rotation.y);
    this.setupResizeObserver();
    this.setupGestures();
    this.setupTileInteractions();
    this.setupScrimClose();
    this.setupThemeObserver();
    this.startAutoRotation();
  }

  applyTransform(xDeg, yDeg) {
    if (this.sphere) {
      this.sphere.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  }

  startAutoRotation() {
    if (!this.options.autoRotate) return;

    const loop = () => {
      // Rotate slowly when not interacting, not dragging, no inertia, and not focused
      if (!this.dragging && !this.focusedEl && !this.opening && !this.inertiaRAF) {
        this.rotation.y = wrapAngleSigned(this.rotation.y + this.options.autoRotateSpeed);
        this.applyTransform(this.rotation.x, this.rotation.y);
      }
      this.autoRotateRAF = requestAnimationFrame(loop);
    };

    if (this.autoRotateRAF) cancelAnimationFrame(this.autoRotateRAF);
    this.autoRotateRAF = requestAnimationFrame(loop);
  }

  stopAutoRotation() {
    if (this.autoRotateRAF) {
      cancelAnimationFrame(this.autoRotateRAF);
      this.autoRotateRAF = null;
    }
  }

  setupResizeObserver() {
    if (!this.root) return;
    const { fit, fitBasis, minRadius, maxRadius, padFactor } = this.options;

    this.ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width),
        h = Math.max(1, cr.height);
      const minDim = Math.min(w, h),
        maxDim = Math.max(w, h),
        aspect = w / h;

      let basis;
      switch (fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }

      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clamp(radius, minRadius, maxRadius);
      this.lockedRadius = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * padFactor));
      this.root.style.setProperty('--radius', `${this.lockedRadius}px`);
      this.root.style.setProperty('--viewer-pad', `${viewerPad}px`);
      this.applyTransform(this.rotation.x, this.rotation.y);
    });

    this.ro.observe(this.root);
  }

  stopInertia() {
    if (this.inertiaRAF) {
      cancelAnimationFrame(this.inertiaRAF);
      this.inertiaRAF = null;
    }
  }

  startInertia(vx, vy) {
    const MAX_V = 1.4;
    let vX = clamp(vx, -MAX_V, MAX_V) * 80;
    let vY = clamp(vy, -MAX_V, MAX_V) * 80;
    let frames = 0;
    const d = clamp(this.options.dragDampening ?? 0.6, 0, 1);
    const frictionMul = 0.94 + 0.055 * d;
    const stopThreshold = 0.015 - 0.01 * d;
    const maxFrames = Math.round(90 + 270 * d);

    const step = () => {
      vX *= frictionMul;
      vY *= frictionMul;
      if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
        this.inertiaRAF = null;
        return;
      }
      if (++frames > maxFrames) {
        this.inertiaRAF = null;
        return;
      }
      const nextX = clamp(this.rotation.x - vY / 200, -this.options.maxVerticalRotationDeg, this.options.maxVerticalRotationDeg);
      const nextY = wrapAngleSigned(this.rotation.y + vX / 200);
      this.rotation = { x: nextX, y: nextY };
      this.applyTransform(nextX, nextY);
      this.inertiaRAF = requestAnimationFrame(step);
    };

    this.stopInertia();
    this.inertiaRAF = requestAnimationFrame(step);
  }

  setupGestures() {
    if (!this.main) return;
    let lastTime = 0;
    let lastPos = { x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      if (this.focusedEl) return;
      this.stopInertia();
      this.dragging = true;
      this.moved = false;
      this.startRot = { ...this.rotation };
      this.startPos = { x: e.clientX, y: e.clientY };
      lastPos = { x: e.clientX, y: e.clientY };
      lastTime = performance.now();
      velocity = { x: 0, y: 0 };
    };

    const onPointerMove = (e) => {
      if (this.focusedEl || !this.dragging || !this.startPos) return;
      const dxTotal = e.clientX - this.startPos.x;
      const dyTotal = e.clientY - this.startPos.y;

      if (!this.moved) {
        const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
        if (dist2 > 16) this.moved = true;
      }

      const nextX = clamp(
        this.startRot.x - dyTotal / this.options.dragSensitivity,
        -this.options.maxVerticalRotationDeg,
        this.options.maxVerticalRotationDeg
      );
      const nextY = wrapAngleSigned(this.startRot.y + dxTotal / this.options.dragSensitivity);

      if (this.rotation.x !== nextX || this.rotation.y !== nextY) {
        this.rotation = { x: nextX, y: nextY };
        this.applyTransform(nextX, nextY);
      }

      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      const vx = ((e.clientX - lastPos.x) / dt) * 16;
      const vy = ((e.clientY - lastPos.y) / dt) * 16;
      velocity = { x: vx, y: vy };
      lastPos = { x: e.clientX, y: e.clientY };
      lastTime = now;
    };

    const onPointerUp = () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (Math.abs(velocity.x) > 0.05 || Math.abs(velocity.y) > 0.05) {
        this.startInertia(velocity.x * 0.02, velocity.y * 0.02);
      }
      if (this.moved) this.lastDragEndAt = performance.now();
      this.moved = false;
    };

    this.main.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  }

  setupTileInteractions() {
    const tiles = this.container.querySelectorAll('.item__image');
    tiles.forEach(tile => {
      tile.addEventListener('click', (e) => {
        if (this.dragging || this.moved || (performance.now() - this.lastDragEndAt < 80) || this.opening) return;
        this.openItemFromElement(e.currentTarget);
      });
    });
  }

  openItemFromElement(el) {
    if (this.opening) return;
    this.opening = true;
    this.openStartedAt = performance.now();
    const parent = el.parentElement;
    this.focusedEl = el;
    el.setAttribute('data-focused', 'true');

    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 2);
    const sizeY = getDataNumber(parent, 'sizeY', 2);
    const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, this.options.segments);
    const parentY = normalizeAngle(parentRot.rotateY);
    const globalY = normalizeAngle(this.rotation.y);

    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - this.rotation.x;

    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.opacity = '0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);

    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = this.main?.getBoundingClientRect();
    const frameR = this.frame?.getBoundingClientRect();

    if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
      this.opening = false;
      this.focusedEl = null;
      if (refDiv.parentElement) parent.removeChild(refDiv);
      return;
    }

    this.originalTilePosition = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
    el.style.visibility = 'hidden';
    el.style.zIndex = '0';

    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.position = 'absolute';
    overlay.style.left = frameR.left - mainR.left + 'px';
    overlay.style.top = frameR.top - mainR.top + 'px';
    overlay.style.width = frameR.width + 'px';
    overlay.style.height = frameR.height + 'px';
    overlay.style.opacity = '0';
    overlay.style.zIndex = '30';
    overlay.style.willChange = 'transform, opacity';
    overlay.style.transformOrigin = 'top left';
    overlay.style.transition = `transform ${this.options.enlargeTransitionMs}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${this.options.enlargeTransitionMs}ms ease`;

    const rawSrc = parent.dataset.src || el.querySelector('img')?.src || '';
    const img = document.createElement('img');
    img.src = rawSrc;
    overlay.appendChild(img);
    this.viewer.appendChild(overlay);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;
    const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
    const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

    setTimeout(() => {
      if (!overlay.parentElement) return;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      this.root.setAttribute('data-enlarging', 'true');
    }, 16);

    const wantsResize = this.options.openedImageWidth || this.options.openedImageHeight;
    if (wantsResize) {
      const onFirstEnd = (ev) => {
        if (ev.propertyName !== 'transform') return;
        overlay.removeEventListener('transitionend', onFirstEnd);
        overlay.style.transition = 'none';
        const tempWidth = this.options.openedImageWidth || `${frameR.width}px`;
        const tempHeight = this.options.openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
        const newRect = overlay.getBoundingClientRect();
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        void overlay.offsetWidth;
        overlay.style.transition = `left ${this.options.enlargeTransitionMs}ms ease, top ${this.options.enlargeTransitionMs}ms ease, width ${this.options.enlargeTransitionMs}ms ease, height ${this.options.enlargeTransitionMs}ms ease`;
        const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
        const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
        });
      };
      overlay.addEventListener('transitionend', onFirstEnd);
    }
  }

  setupScrimClose() {
    const close = () => {
      if (performance.now() - this.openStartedAt < 250) return;
      const el = this.focusedEl;
      if (!el) return;
      const parent = el.parentElement;
      const overlay = this.viewer?.querySelector('.enlarge');
      if (!overlay) return;
      const refDiv = parent.querySelector('.item__image--reference');
      const originalPos = this.originalTilePosition;

      if (!originalPos) {
        overlay.remove();
        if (refDiv) refDiv.remove();
        parent.style.setProperty('--rot-y-delta', '0deg');
        parent.style.setProperty('--rot-x-delta', '0deg');
        el.style.visibility = '';
        el.style.zIndex = '0';
        this.focusedEl = null;
        this.root?.removeAttribute('data-enlarging');
        this.opening = false;
        return;
      }

      const currentRect = overlay.getBoundingClientRect();
      const rootRect = this.root.getBoundingClientRect();
      const originalPosRelativeToRoot = {
        left: originalPos.left - rootRect.left,
        top: originalPos.top - rootRect.top,
        width: originalPos.width,
        height: originalPos.height
      };
      const overlayRelativeToRoot = {
        left: currentRect.left - rootRect.left,
        top: currentRect.top - rootRect.top,
        width: currentRect.width,
        height: currentRect.height
      };

      const animatingOverlay = document.createElement('div');
      animatingOverlay.className = 'enlarge-closing';
      animatingOverlay.style.cssText = `position:absolute;left:${overlayRelativeToRoot.left}px;top:${overlayRelativeToRoot.top}px;width:${overlayRelativeToRoot.width}px;height:${overlayRelativeToRoot.height}px;z-index:9999;border-radius:var(--enlarge-radius, 28px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${this.options.enlargeTransitionMs}ms cubic-bezier(0.16, 1, 0.3, 1);pointer-events:none;margin:0;transform:none;`;

      const originalImg = overlay.querySelector('img');
      if (originalImg) {
        const img = originalImg.cloneNode();
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        animatingOverlay.appendChild(img);
      }
      overlay.remove();
      this.root.appendChild(animatingOverlay);
      void animatingOverlay.getBoundingClientRect();

      requestAnimationFrame(() => {
        animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
        animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
        animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
        animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
        animatingOverlay.style.opacity = '0';
      });

      const cleanup = () => {
        animatingOverlay.remove();
        this.originalTilePosition = null;
        if (refDiv) refDiv.remove();
        parent.style.transition = 'none';
        el.style.transition = 'none';
        parent.style.setProperty('--rot-y-delta', '0deg');
        parent.style.setProperty('--rot-x-delta', '0deg');
        requestAnimationFrame(() => {
          el.style.visibility = '';
          el.style.opacity = '0';
          el.style.zIndex = '0';
          this.focusedEl = null;
          this.root?.removeAttribute('data-enlarging');
          requestAnimationFrame(() => {
            parent.style.transition = '';
            el.style.transition = 'opacity 300ms ease-out';
            requestAnimationFrame(() => {
              el.style.opacity = '1';
              setTimeout(() => {
                el.style.transition = '';
                el.style.opacity = '';
                this.opening = false;
              }, 300);
            });
          });
        });
      };
      animatingOverlay.addEventListener('transitionend', cleanup, { once: true });
    };

    if (this.scrim) {
      this.scrim.addEventListener('click', close);
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  setupThemeObserver() {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (this.root) {
        this.root.style.setProperty('--overlay-blur-color', isLight ? '#f8fafc' : '#0d0a12');
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  destroy() {
    if (this.ro) this.ro.disconnect();
    this.stopInertia();
    this.stopAutoRotation();
  }
}

export function initDomeGallery(selector = '#wedding-dome-gallery', options = {}) {
  const el = document.querySelector(selector);
  if (!el) return null;
  return new DomeGallery(el, options);
}

if (typeof window !== 'undefined') {
  window.DomeGallery = DomeGallery;
  window.initDomeGallery = initDomeGallery;
}
