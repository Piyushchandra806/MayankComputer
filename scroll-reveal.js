/**
 * ScrollReveal System - Premium Scroll-Triggered Animations (Vanilla JS)
 * IntersectionObserver-powered, high performance, zero-jank, once-only reveal.
 */

export class ScrollReveal {
  constructor(options = {}) {
    this.options = Object.assign({
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.03,
      staggerDelay: 75
    }, options);

    this.observer = null;
    this.init();
  }

  init() {
    // If user prefers reduced motion, immediately reveal everything
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal-init').forEach(el => el.classList.add('is-revealed'));
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-revealed');
          this.observer.unobserve(el);
        }
      });
    }, {
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold
    });

    this.observeElements();
  }

  observeElements() {
    if (!this.observer) return;
    const elements = document.querySelectorAll('.reveal-init:not(.is-revealed)');
    elements.forEach(el => {
      this.observer.observe(el);
    });
  }

  refresh() {
    this.observeElements();
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

/**
 * Automatically tags key layout items with .reveal-init and initializes ScrollReveal
 */
export function initScrollReveal(options = {}) {
  // Target key UI blocks across all pages
  const defaultTargets = [
    '.section-header',
    '.product-section-header',
    '.accordion-gallery-wrapper',
    '.product-tabs-nav',
    '.product-showcase-grid > *',
    '.services-grid > *',
    '.feature-grid > *',
    '.about-layout > *',
    '.about-stats > *',
    '.designs-grid > *',
    '.banner-sizes-grid > *',
    '.guides-grid > *',
    '.banner-sizes-cta-box',
    '.product-cta-banner',
    '.product-footer',
    '.gallery-filter-nav',
    '.location-info-card',
    '.location-map-wrap',
    '.dome-gallery-container',
    '.contact-info-panel',
    '.contact-form-glass-wrap'
  ];

  defaultTargets.forEach(selector => {
    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      // 1. Do NOT touch Hero elements (they load immediately)
      if (el.closest('#hero') || el.closest('.product-hero') || el.closest('.hero-section')) return;

      // 2. Do NOT touch internal pinned ScrollStack cards
      if (el.closest('.scroll-stack-viewport') || el.classList.contains('scroll-stack-card')) return;

      if (!el.classList.contains('reveal-init')) {
        el.classList.add('reveal-init');

        const parent = el.parentElement;
        const isGrid = parent && (
          parent.classList.contains('services-grid') ||
          parent.classList.contains('feature-grid') ||
          parent.classList.contains('designs-grid') ||
          parent.classList.contains('banner-sizes-grid') ||
          parent.classList.contains('guides-grid') ||
          parent.classList.contains('about-stats')
        );

        if (isGrid) {
          const index = Array.from(parent.children).indexOf(el);
          // Row-based stagger: 0ms, 75ms, 150ms, 225ms
          const stagger = (index % 4) * (options.staggerDelay || 75);
          el.style.transitionDelay = `${stagger}ms`;
          el.setAttribute('data-reveal', 'scale');
        } else if (el.classList.contains('section-header') || el.classList.contains('product-section-header')) {
          el.setAttribute('data-reveal', 'up');
        } else if (el.classList.contains('product-cta-banner') || el.classList.contains('banner-sizes-cta-box')) {
          el.setAttribute('data-reveal', 'scale');
        } else {
          el.setAttribute('data-reveal', 'up');
        }
      }
    });
  });

  return new ScrollReveal(options);
}

// Global browser hook
if (typeof window !== 'undefined') {
  window.ScrollReveal = ScrollReveal;
  window.initScrollReveal = initScrollReveal;
}
