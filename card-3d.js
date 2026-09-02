/* =========================================
   3D Visiting Card – Vanilla JS Component
   ========================================= */

class Card3D {
  constructor(scene) {
    this.scene  = scene;
    this.card   = scene.querySelector('.card-3d');
    this.gloss  = scene.querySelector('.vc-gloss');
    this.maxRot = 18;   // degrees
    this.raf    = null;
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;

    this._bind();
  }

  _bind() {
    this.scene.addEventListener('mousemove', (e) => this._onMove(e));
    this.scene.addEventListener('mouseleave', ()  => this._onLeave());
    this.scene.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._onMove(e.touches[0]);
    }, { passive: false });
    this.scene.addEventListener('touchend', ()   => this._onLeave());
  }

  _onMove(e) {
    const rect = this.scene.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);   // -1 → +1
    const dy = (e.clientY - cy) / (rect.height / 2);   // -1 → +1

    this.targetX = -dy * this.maxRot;   // rotateX (up-down mouse → tilt top/bottom)
    this.targetY =  dx * this.maxRot;   // rotateY (left-right mouse → tilt left/right)

    // Update gloss position
    if (this.gloss) {
      const mx = ((e.clientX - rect.left) / rect.width)  * 100;
      const my = ((e.clientY - rect.top)  / rect.height) * 100;
      this.gloss.style.setProperty('--mx', `${mx}%`);
      this.gloss.style.setProperty('--my', `${my}%`);
    }

    if (!this.raf) this._tick();
  }

  _onLeave() {
    this.targetX = 0;
    this.targetY = 0;
    if (!this.raf) this._tick();
  }

  _tick() {
    const k = 0.12;  // smoothing
    this.currentX += (this.targetX - this.currentX) * k;
    this.currentY += (this.targetY - this.currentY) * k;

    if (this.card) {
      this.card.style.transform =
        `rotateX(${this.currentX.toFixed(2)}deg) rotateY(${this.currentY.toFixed(2)}deg)`;
    }

    const settled =
      Math.abs(this.targetX - this.currentX) < 0.02 &&
      Math.abs(this.targetY - this.currentY) < 0.02;

    if (settled) {
      this.raf = null;
    } else {
      this.raf = requestAnimationFrame(() => this._tick());
    }
  }
}

// Init all card scenes on this page
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card-scene').forEach(scene => new Card3D(scene));

  // Shared navbar scroll logic
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu toggle
  const toggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('active'));
  }

  // Mobile: click Products label to expand submenu
  document.querySelectorAll('.nav-item--dropdown').forEach(item => {
    const trigger = item.querySelector('.nav-dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          item.classList.toggle('open');
        }
      });
    }
  });
});
