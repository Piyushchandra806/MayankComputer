/**
 * Scroll Stack Component – React Bits Pro / Exact Production Reproduction
 * Pinned cards that stack, turn (3D rotation), scale, and dissolve as the page scrolls.
 */

export class ScrollStack {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = Object.assign({
      scrollDistancePerCard: window.innerHeight * 0.85,
      stackYOffset: 16,        // pixels offset per stacked layer at top
      stackScaleOffset: 0.04,  // scale shrink per stacked layer at top
      stackRotateX: 3.5,       // 3D rotation angle per stacked layer
      stickyTop: 80,           // Top sticky pinning position in px
      ...options
    }, options);

    this.cards = Array.from(this.container.querySelectorAll('.scroll-stack-card'));
    this.total = this.cards.length;
    if (this.total === 0) return;

    this.stickyEl = this.container.querySelector('.scroll-stack-sticky');
    this.progressBar = this.container.querySelector('#scroll-stack-progress-fill');
    this.progressTrack = this.container.querySelector('.scroll-stack-progress-track');
    this.progressCounter = this.container.querySelector('#scroll-stack-progress-counter');

    this.ticking = false;
    this.currentIndex = 0;

    this._init();
  }

  _init() {
    this.updateContainerHeight();

    // Bind scroll & resize listeners
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);

    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('touchmove', this._onScroll, { passive: true });

    // Initial render ticks
    this._update();
    setTimeout(() => this._update(), 100);
    setTimeout(() => this._update(), 500);
  }

  updateContainerHeight() {
    const cardDist = this.options.scrollDistancePerCard || window.innerHeight * 0.85;
    const totalHeight = window.innerHeight + (this.total - 1) * cardDist;
    this.container.style.minHeight = `${Math.max(totalHeight, 1800)}px`;
  }

  _onResize() {
    this.options.scrollDistancePerCard = window.innerHeight * 0.85;
    this.updateContainerHeight();
    this._update();
  }

  _onScroll() {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this._update();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  _update() {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const stickyTop = this.options.stickyTop || 80;
    const scrollRange = rect.height - window.innerHeight;

    if (scrollRange <= 0) return;

    // Calculate scroll offset starting exactly when sticky container pins
    const scrollOffset = stickyTop - rect.top;
    const progress = Math.min(Math.max(scrollOffset / scrollRange, 0), 1);
    const rawIndex = progress * (this.total - 1);
    const activeIdx = Math.min(Math.floor(rawIndex + 0.35), this.total - 1);
    this.currentIndex = activeIdx;

    // Update Progress Bar & Counter (01 / 05)
    if (this.progressBar && this.progressTrack) {
      const segmentWidth = 100 / this.total;
      const leftPos = (rawIndex / (this.total - 1)) * (100 - segmentWidth);
      this.progressBar.style.width = `${segmentWidth}%`;
      const trackW = this.progressTrack.offsetWidth || 220;
      this.progressBar.style.transform = `translateX(${(leftPos * trackW) / 100}px)`;
    }

    if (this.progressCounter) {
      const currentFormatted = String(activeIdx + 1).padStart(2, '0');
      const totalFormatted = String(this.total).padStart(2, '0');
      this.progressCounter.textContent = `${currentFormatted} / ${totalFormatted}`;
    }

    // Render Stacking Deck & 3D Turning Physics
    this.cards.forEach((card, i) => {
      const diff = i - rawIndex;

      if (diff > 0) {
        // Upcoming card entering from bottom
        const enterProgress = Math.min(diff, 1);
        const translateY = enterProgress * 100; // 0% to 100%
        const rotateX = enterProgress * 6;      // Turn 3D angle on entry
        const scale = 1 - enterProgress * 0.02;
        const opacity = 1;

        card.style.transform = `translate3d(0, ${translateY}%, 0) rotateX(${rotateX}deg) scale(${scale})`;
        card.style.opacity = `${opacity}`;
        card.style.filter = 'none';
        card.style.zIndex = `${10 + i}`;
        card.style.pointerEvents = diff < 0.2 ? 'auto' : 'none';
      } else {
        // Active or Past card stacked behind at top edge
        const past = -diff;
        const stackLevel = Math.min(past, 3); // Max 3 visible top stacked tabs

        const translateY = -stackLevel * this.options.stackYOffset;
        const rotateX = -stackLevel * this.options.stackRotateX; // Turn 3D angle backwards
        const scale = Math.max(1 - stackLevel * this.options.stackScaleOffset, 0.86);
        const brightness = Math.max(1 - stackLevel * 0.18, 0.35);

        card.style.transform = `translate3d(0, ${translateY}px, 0) rotateX(${rotateX}deg) scale(${scale})`;
        card.style.opacity = '1';
        card.style.filter = stackLevel > 0.05 ? `brightness(${brightness})` : 'none';
        card.style.zIndex = `${10 + i}`;
        card.style.pointerEvents = past < 0.3 ? 'auto' : 'none';
      }
    });
  }

  destroy() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('touchmove', this._onScroll);
  }
}
