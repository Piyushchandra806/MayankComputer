/**
 * Products Gallery & Interaction Handler
 * Powers filtering, modal previews, navbar scroll & mobile menus for dedicated product pages.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Navbar Scroll Behavior ──
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile Menu Toggle ──
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const svg = mobileToggle.querySelector('svg');
      if (svg) {
        if (navLinks.classList.contains('active')) {
          svg.innerHTML = `
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          `;
        } else {
          svg.innerHTML = `
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          `;
        }
      }
    });
  }

  // ── Products Dropdown Toggle & Click-Outside ──
  const dropdownItems = document.querySelectorAll('.nav-item--dropdown');
  dropdownItems.forEach(item => {
    const trigger = item.querySelector('.nav-dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = item.classList.toggle('is-open');
        item.classList.toggle('open', isOpen);
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
  });

  document.addEventListener('click', (e) => {
    dropdownItems.forEach(item => {
      if (!item.contains(e.target)) {
        item.classList.remove('is-open', 'open');
        const trigger = item.querySelector('.nav-dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdownItems.forEach(item => {
        item.classList.remove('is-open', 'open');
        const trigger = item.querySelector('.nav-dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // ── Gallery Category Filter ──
  const filterBtns = document.querySelectorAll('.filter-btn');
  const designItems = document.querySelectorAll('.design-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      designItems.forEach(item => {
        const category = item.dataset.category;
        if (filter === 'all' || category === filter || (category && category.includes(filter))) {
          item.style.display = 'flex';
          item.classList.add('is-revealed');
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // ── Quick Preview Modal ──
  const modalBackdrop = document.getElementById('preview-modal');
  const modalClose = document.getElementById('modal-close');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalCode = document.getElementById('modal-code');
  const modalPrice = document.getElementById('modal-price');
  const modalSpecs = document.getElementById('modal-specs');
  const modalOrderBtn = document.getElementById('modal-order-btn');

  const openModal = (data) => {
    if (!modalBackdrop) return;
    if (modalImg) {
      modalImg.src = data.img || '';
      modalImg.alt = data.title || 'Design Preview';
    }
    if (modalTitle) modalTitle.textContent = data.title || '';
    if (modalDesc) modalDesc.textContent = data.desc || '';
    if (modalCode) modalCode.textContent = data.code || '';
    if (modalPrice) modalPrice.textContent = data.price || '';
    if (modalSpecs) {
      modalSpecs.innerHTML = '';
      if (data.specs && Array.isArray(data.specs)) {
        data.specs.forEach(spec => {
          const span = document.createElement('span');
          span.className = 'spec-tag';
          span.textContent = spec;
          modalSpecs.appendChild(span);
        });
      }
    }
    if (modalOrderBtn) {
      modalOrderBtn.href = `/#contact?item=${encodeURIComponent(data.title || '')}`;
    }

    modalBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ── 3D Parallax Tilt on Design Cards ──
  const designCards = document.querySelectorAll('.design-item');
  designCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const tiltX = -dy * 7;
      const tiltY = dx * 7;
      card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // Attach quick view triggers
  document.querySelectorAll('.btn-card-preview').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.design-item');
      if (!card) return;

      const img = card.querySelector('.design-img');
      const title = card.querySelector('.design-title');
      const desc = card.querySelector('.design-desc');
      const code = card.querySelector('.design-code');
      const price = card.querySelector('.design-price-tag');
      const specTags = card.querySelectorAll('.spec-tag');
      const specs = Array.from(specTags).map(t => t.textContent.trim());

      openModal({
        img: img ? img.src : '',
        title: title ? title.textContent.trim() : '',
        desc: desc ? desc.textContent.trim() : '',
        code: code ? code.textContent.trim() : '',
        price: price ? price.textContent.trim() : '',
        specs: specs
      });
    });
  });
});

