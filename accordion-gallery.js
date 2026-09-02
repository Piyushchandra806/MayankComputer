/**
 * AccordionGallery Component - React Bits (Vanilla JS + GSAP)
 * Pinned image panels that expand, tilt in 3D, and desaturate smoothly on hover/focus.
 */

export class AccordionGallery {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = Object.assign({
      items: [
        { image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85', label: 'Shadi Card', link: '/products/wedding-cards' },
        { image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=85', label: 'Event Posters', link: '/products/posters' },
        { image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=900&q=85', label: 'Visiting Cards', link: '#products' },
        { image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=85', label: 'PVC ID Cards', link: '#products' },
        { image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=85', label: 'Letterheads', link: '#products' },
        { image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=900&q=85', label: 'Canvas Prints', link: '#products' },
        { image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85', label: 'Flex Banners', link: '/products/posters' }
      ],
      defaultIndex: 3,
      accentColor: '#ffffff',
      overlayColor: '#060010',
      textColor: '#ffffff',
      height: 620,
      gap: 12,
      radius: 32,
      expandRatio: 0.48,
      orientation: 'horizontal',
      duration: 0.6,
      ease: 'power3.out',
      parallax: 0.5,
      tilt: 8,
      stagger: 0.06,
      trigger: 'hover',
      showLabels: true,
      grayscale: true,
      className: ''
    }, options);

    this.items = this.options.items;
    this.count = this.items.length;
    this.active = Math.min(Math.max(this.options.defaultIndex, 0), this.count - 1);
    this.vertical = this.options.orientation === 'vertical';
    this.mediaSize = 600;
    this.firstRun = true;
    this.tl = null;

    this.prefersReduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    this.panelEls = [];
    this.mediaEls = [];
    this.barEls = [];
    this.textEls = [];

    this.init();
  }

  init() {
    this.buildDOM();
    this.bindEvents();
    this.setupResizeObserver();
    this.applyLayout(false);
  }

  buildDOM() {
    this.container.innerHTML = '';

    const root = document.createElement('div');
    root.className = `accordion-gallery${this.vertical ? ' accordion-gallery--vertical' : ''}${this.options.className ? ` ${this.options.className}` : ''}`;
    root.style.setProperty('--ag-accent', this.options.accentColor);
    root.style.setProperty('--ag-overlay', this.options.overlayColor);
    root.style.setProperty('--ag-text', this.options.textColor);
    root.style.setProperty('--ag-gap', `${this.options.gap}px`);
    root.style.setProperty('--ag-radius', `${this.options.radius}px`);
    root.style.height = this.vertical ? `${Math.round(this.options.height * 1.6)}px` : `${this.options.height}px`;
    root.setAttribute('role', 'list');
    root.setAttribute('aria-label', 'Image accordion gallery');

    this.rootEl = root;

    this.items.forEach((item, i) => {
      const isActive = i === this.active;
      const Tag = item.link ? 'a' : 'div';
      const panel = document.createElement(Tag);
      panel.className = `ag-panel${isActive ? ' ag-panel--active' : ''}`;
      panel.style.borderRadius = `${this.options.radius}px`;
      if (item.link) panel.href = item.link;
      panel.setAttribute('role', 'listitem');
      panel.setAttribute('tabindex', '0');
      if (isActive) panel.setAttribute('aria-current', 'true');
      if (item.label) panel.setAttribute('aria-label', item.label);

      // Frame & Media
      const frame = document.createElement('span');
      frame.className = 'ag-panel__frame';

      const media = document.createElement('span');
      media.className = 'ag-panel__media';

      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.alt || item.label || '';
      img.setAttribute('draggable', 'false');
      img.loading = 'lazy';
      media.appendChild(img);

      const overlay = document.createElement('span');
      overlay.className = 'ag-panel__overlay';
      overlay.setAttribute('aria-hidden', 'true');

      frame.appendChild(media);
      frame.appendChild(overlay);
      panel.appendChild(frame);

      // Label & Bar
      if (this.options.showLabels) {
        const labelWrap = document.createElement('span');
        labelWrap.className = 'ag-panel__label';
        labelWrap.setAttribute('aria-hidden', 'true');

        const bar = document.createElement('span');
        bar.className = 'ag-panel__bar';

        const text = document.createElement('span');
        text.className = 'ag-panel__text';
        text.textContent = item.label || '';

        labelWrap.appendChild(bar);
        labelWrap.appendChild(text);
        panel.appendChild(labelWrap);

        this.barEls[i] = bar;
        this.textEls[i] = text;
      }

      this.panelEls[i] = panel;
      this.mediaEls[i] = media;

      root.appendChild(panel);
    });

    this.container.appendChild(root);
  }

  bindEvents() {
    this.panelEls.forEach((panel, i) => {
      if (this.options.trigger === 'hover') {
        panel.addEventListener('mouseenter', () => this.setActive(i));
      }

      panel.addEventListener('click', (e) => {
        if (i !== this.active) {
          e.preventDefault();
          this.setActive(i);
        }
      });

      panel.addEventListener('focus', () => this.setActive(i));

      panel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.setActive((i + 1) % this.count);
          this.panelEls[(i + 1) % this.count]?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.setActive((i - 1 + this.count) % this.count);
          this.panelEls[(i - 1 + this.count) % this.count]?.focus();
        }
      });
    });
  }

  setupResizeObserver() {
    const measure = () => {
      if (!this.rootEl) return;
      const rect = this.rootEl.getBoundingClientRect();
      const total = this.vertical ? rect.height : rect.width;
      const usable = Math.max(total - this.options.gap * (this.count - 1), 120);
      const r = Math.min(Math.max(this.options.expandRatio, 0.2), 0.9);
      const size = Math.max(140, usable * r * 1.22);
      this.mediaSize = size;
      this.rootEl.style.setProperty('--ag-media-size', `${size}px`);
      this.applyLayout(!this.firstRun);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(this.rootEl);
    this.ro = ro;
  }

  setActive(newIndex) {
    if (newIndex === this.active && !this.firstRun) return;
    this.active = Math.min(Math.max(newIndex, 0), this.count - 1);
    
    this.panelEls.forEach((p, idx) => {
      const isAct = idx === this.active;
      p.classList.toggle('ag-panel--active', isAct);
      if (isAct) {
        p.setAttribute('aria-current', 'true');
      } else {
        p.removeAttribute('aria-current');
      }
    });

    this.applyLayout(true);
  }

  applyLayout(animate = true) {
    if (!this.panelEls.length) return;

    const r = Math.min(Math.max(this.options.expandRatio, 0.2), 0.9);
    const grow = this.count > 1 ? (r * (this.count - 1)) / (1 - r) : 1;
    const mediaSize = this.mediaSize;
    const dur = animate && !this.prefersReduced ? this.options.duration : 0;
    const ease = this.options.ease || 'power3.out';

    const hasGsap = typeof window !== 'undefined' && window.gsap;

    if (this.tl && hasGsap) {
      this.tl.kill();
    }

    if (hasGsap) {
      const tl = window.gsap.timeline();

      this.panelEls.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === this.active;
        const media = this.mediaEls[i];
        const bar = this.barEls[i];
        const text = this.textEls[i];

        const rot = isActive ? 0 : i < this.active ? this.options.tilt : -this.options.tilt;
        const rotProp = this.vertical ? { rotateX: -rot } : { rotateY: rot };

        tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, this.active - i));
          const shift = drift * this.options.parallax * mediaSize * 0.06;
          const gray = this.options.grayscale ? (isActive ? 0 : 1) : 0;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: this.vertical ? 0 : isActive ? 0 : shift,
              y: this.vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': isActive ? 0 : 0.35,
              duration: dur,
              ease
            },
            0
          );
        }

        if (this.options.showLabels && bar && text) {
          if (isActive) {
            tl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease, stagger: this.prefersReduced ? 0 : this.options.stagger }, 0);
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      this.tl = tl;
    } else {
      // Fallback CSS transform/flex
      this.panelEls.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === this.active;
        panel.style.flexGrow = isActive ? grow : 1;
        const rot = isActive ? 0 : i < this.active ? this.options.tilt : -this.options.tilt;
        panel.style.transform = this.vertical ? `rotateX(${-rot}deg)` : `rotateY(${rot}deg)`;

        const media = this.mediaEls[i];
        if (media) {
          media.style.setProperty('--ag-gray', this.options.grayscale ? (isActive ? '0' : '1') : '0');
          media.style.setProperty('--ag-dim', isActive ? '0' : '0.35');
        }

        const bar = this.barEls[i];
        const text = this.textEls[i];
        if (bar && text) {
          bar.style.opacity = isActive ? '1' : '0';
          text.style.opacity = isActive ? '1' : '0';
          text.style.transform = isActive ? 'translateX(0)' : 'translateX(-14px)';
        }
      });
    }

    this.firstRun = false;
  }

  destroy() {
    if (this.tl) this.tl.kill();
    if (this.ro) this.ro.disconnect();
    if (this.container) this.container.innerHTML = '';
  }
}
