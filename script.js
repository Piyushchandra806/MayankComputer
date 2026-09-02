import { LightRays } from './light-rays.js';
import { ScrollExpand } from './scroll-expand.js';
import { AccordionGallery } from './accordion-gallery.js';
import { PixelateHover } from './pixelate-hover.js';
import { CountUp } from './count-up.js';
import { Lanyard } from './lanyard.js';
import { initThemeToggle } from './theme-toggle.js';
import { initBorderGlow } from './border-glow.js';
import { initScrollReveal } from './scroll-reveal.js';
import { initLocationMap } from './location-map.js';
import { initWarpText } from './warp-text.js';
import { Sketchbook } from './sketchbook.js';

// Ensure page always starts at top / header upon refresh or navigation
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.addEventListener('beforeunload', () => {
    window.scrollTo(0, 0);
});

window.addEventListener('pageshow', () => {
    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    initThemeToggle();
    initBorderGlow();
    initLocationMap();
    initWarpText('#thankyou-warp-text', {
        scrollSpeed: 0.085,
        speed: 0.85
    });
    const scrollReveal = initScrollReveal();

    // ── Sketchbook portfolio gallery ──────────────────────────────────
    const sketchbookHost = document.getElementById('sketchbook-host');
    if (sketchbookHost) {
        let sbInstance = null;
        // Lazy-init on first scroll into view so it doesn't block page load
        const sbObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !sbInstance) {
                sbInstance = new Sketchbook(sketchbookHost, {
                    pages: [
                        { url: 'wedding-card-showcase.jpg',    title: 'Shadi Cards',           caption: 'Royal Wedding Invitations' },
                        { url: 'letterhead-showcase.jpg',      title: 'Letterheads',           caption: 'Executive Stationery'      },
                        { url: 'poster-art-showcase.jpg',      title: 'Poster Art',            caption: 'Bold Print & Flex'         },
                        { url: 'print-production-showcase.jpg',title: 'Print Production',      caption: 'Offset & Digital Press'    },
                        { url: 'card-front.jpg',               title: 'Visiting Cards (Front)',caption: 'Premium Business Cards'    },
                        { url: 'card-back.jpg',                title: 'Visiting Cards (Back)', caption: 'Metallic Finishes'         },
                        { url: 'id-card.jpg',                  title: 'ID Cards',              caption: 'PVC School & Staff Cards'  },
                        { url: 'hero.jpg',                     title: 'Mayank Computer',       caption: 'Indirapuram, Ghaziabad'    },
                    ],
                    assetBase: '',
                });
                sbObserver.disconnect();
            }
        }, { threshold: 0.1 });
        sbObserver.observe(sketchbookHost);
    }
    
    const navbar = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');

    // Scroll: shrink header into floating pill
    const onScroll = () => {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (scrollY > 30) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll(); // run once on load

    // Handle mobile menu toggle
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Toggle icon between hamburger and close
        const svg = mobileToggle.querySelector('svg');
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
    });

    // Close mobile menu when a link is clicked
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const svg = mobileToggle.querySelector('svg');
            svg.innerHTML = `
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            `;
        });
    });

    // Products dropdown: Toggle on Click + Close on outside click / Escape
    document.querySelectorAll('.nav-item--dropdown').forEach(item => {
        const trigger = item.querySelector('.nav-dropdown-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = item.classList.toggle('open');
                item.classList.toggle('is-open', isOpen);
                trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item--dropdown')) {
            document.querySelectorAll('.nav-item--dropdown').forEach(item => {
                item.classList.remove('open', 'is-open');
                const trigger = item.querySelector('.nav-dropdown-trigger');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Close dropdowns on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.nav-item--dropdown').forEach(item => {
                if (item.classList.contains('open') || item.classList.contains('is-open')) {
                    item.classList.remove('open', 'is-open');
                    const trigger = item.querySelector('.nav-dropdown-trigger');
                    if (trigger) {
                        trigger.setAttribute('aria-expanded', 'false');
                        trigger.focus();
                    }
                }
            });
        }
    });



    // Initialize Hero LightRays Background
    const raysContainer = document.getElementById('hero-light-rays');
    if (raysContainer) {
        new LightRays(raysContainer, {
            raysColor: '#00ffff',
            raysSpeed: 1.5,
            lightSpread: 0.8,
            rayLength: 1.2,
            followMouse: true,
            mouseInfluence: 0.1,
            noiseAmount: 0.1,
            distortion: 0.05
        });
    }

    // Initialize ScrollExpand Hero
    const scrollExpandContainer = document.getElementById('scroll-expand-hero');
    if (scrollExpandContainer) {
        const isMobile = window.innerWidth <= 768;
        const se = new ScrollExpand(scrollExpandContainer, {
            src: 'hero.jpg',
            alt: 'Premium Shaadi Card by Mayank Computer',
            title: 'Mayank Computer',
            scrollHint: 'Scroll to explore',
            startWidth: isMobile ? 74 : 48,
            startHeight: isMobile ? 54 : 62,
            startRadius: isMobile ? 18 : 20,
            endRadius: 0,
            mediaZoom: 1.3,
            scrollDistance: isMobile ? 0.9 : 1.2,
            holdDistance: 0.35,
            smoothing: 0.1,
            overlayScrim: 0.5,
            useWindowScroll: true,
            overlayHTML: `
                <p style="font-size: clamp(14px, 2vw, 18px); color: rgba(255,255,255,0.85); max-width: 540px; line-height: 1.5; text-shadow: 0 1px 12px rgba(0,0,0,0.5); margin: 0 auto;">
                    Cards, posters, banners and more &mdash; all under one roof.
                </p>
            `
        });

        // Issue 3 fix: promote the scroll-expand title <div> to a semantic <h1>
        // so the page has exactly one primary heading for a11y & SEO.
        if (se.titleEl) {
            const h1 = document.createElement('h1');
            h1.className = se.titleEl.className;
            h1.textContent = se.titleEl.textContent;
            // Copy all inline styles applied by the animation engine
            h1.style.cssText = se.titleEl.style.cssText;
            se.titleEl.replaceWith(h1);
            se.titleEl = h1; // keep internal ref intact for animation ticks
        }
    }

    // Initialize AccordionGallery — Our Work Portfolio Section
    const accordionContainer = document.getElementById('accordion-gallery-container');
    if (accordionContainer) {
        new AccordionGallery(accordionContainer, {
            items: [
                { 
                    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Bespoke Shadi Cards', 
                    link: '/products/wedding-cards',
                    alt: 'Royal Heritage Wedding Invitation Suite'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Vibrant Event Posters', 
                    link: '/products/posters',
                    alt: 'High-Impact Flex Banner and Event Poster'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Luxury 3D Visiting Cards', 
                    link: '#products',
                    alt: 'Gold Foil Embossed Visiting Cards'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Smart PVC ID Cards', 
                    link: '#products',
                    alt: 'PVC Institutional ID Badge with Branded Lanyard'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Executive Letterheads', 
                    link: '#products',
                    alt: 'Executive Bond Letterhead & Envelopes'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Fine Art & Canvas Prints', 
                    link: '#products',
                    alt: 'Museum Grade Fine Art & Gallery Canvas Prints'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Outdoor Flex Banners', 
                    link: '/products/posters',
                    alt: 'Weatherproof Heavy-Duty Flex Hoardings'
                },
                { 
                    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&h=1200&q=85', 
                    label: 'Custom Box Packaging', 
                    link: '#products',
                    alt: 'Rigid Gift Box and Custom Product Packaging'
                }
            ],
            defaultIndex: 3,
            accentColor: '#ffffff',
            overlayColor: '#060010',
            textColor: '#ffffff',
            height: 640,
            gap: 12,
            radius: 32,
            expandRatio: 0.42,
            orientation: 'horizontal',
            duration: 0.6,
            ease: 'power3.out',
            parallax: 0.5,
            tilt: 8,
            stagger: 0.06,
            trigger: 'hover',
            showLabels: true,
            grayscale: true
        });
    }

    // Initialize PixelateHover — About Section
    const pixelateContainer = document.getElementById('pixelate-container');
    if (pixelateContainer) {
        new PixelateHover(pixelateContainer, {
            src: 'owner.jpg',
            alt: 'Mr. Bhagwat Prasad Chandra - Founder & Master Craftsman at Mayank Computer',
            pixelSize: 14,
            revealRadius: 110,
            smoothing: 0.12,
            ringColor: 'rgba(255, 255, 255, 0.25)'
        });
    }

    // Initialize CountUp — About Stats (spring-physics animation on scroll)
    const statEls = document.querySelectorAll('[data-countup-to]');
    statEls.forEach((el, i) => {
        new CountUp(el, {
            from: 0,
            to: parseFloat(el.dataset.countupTo),
            suffix: el.dataset.countupSuffix || '',
            duration: 2,
            delay: i * 0.15,          // staggered cascade
            separator: ','
        });
    });

    // =========================================
    // Universal 3D Interactive Card Showcase Component
    // =========================================
    const init3DCardScenes = () => {
        const cardScenes = document.querySelectorAll('.card-scene');
        cardScenes.forEach(scene => {
            const card = scene.querySelector('.card-3d');
            const gloss = scene.querySelector('.card-gloss');
            if (!card) return;

            let isFlipped = false;
            let targetX = 0;
            let targetY = 0;
            let currentX = 0;
            let currentY = 0;
            let rafId = null;
            const maxTilt = 16; // maximum rotation in degrees

            const onCardMove = (clientX, clientY) => {
                const rect = scene.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (clientX - cx) / (rect.width / 2); // -1 to 1
                const dy = (clientY - cy) / (rect.height / 2); // -1 to 1

                targetX = -dy * maxTilt; // rotateX
                targetY = dx * maxTilt;  // rotateY

                // Update gloss specular reflection layer
                if (gloss) {
                    const mx = ((clientX - rect.left) / rect.width) * 100;
                    const my = ((clientY - rect.top) / rect.height) * 100;
                    gloss.style.setProperty('--mx', `${mx}%`);
                    gloss.style.setProperty('--my', `${my}%`);
                }

                kickAnimation();
            };

            const onCardLeave = () => {
                targetX = 0;
                targetY = 0;
                kickAnimation();
            };

            const tick = () => {
                const smoothFactor = 0.12;
                currentX += (targetX - currentX) * smoothFactor;
                currentY += (targetY - currentY) * smoothFactor;

                if (card) {
                    if (isFlipped) {
                        card.style.transform = `rotateX(${currentX.toFixed(2)}deg) rotateY(${(currentY + 180).toFixed(2)}deg)`;
                    } else {
                        card.style.transform = `rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg)`;
                    }
                }

                const isSettled = Math.abs(targetX - currentX) < 0.02 && Math.abs(targetY - currentY) < 0.02;
                if (isSettled) {
                    rafId = null;
                } else {
                    rafId = requestAnimationFrame(tick);
                }
            };

            const kickAnimation = () => {
                if (!rafId) {
                    rafId = requestAnimationFrame(tick);
                }
            };

            // Desktop Mouse tracking
            scene.addEventListener('mousemove', (e) => onCardMove(e.clientX, e.clientY));
            scene.addEventListener('mouseleave', onCardLeave);

            // Mobile Touch tracking
            scene.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    onCardMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });
            scene.addEventListener('touchend', onCardLeave);

            // 3D Flip Action (if present in wrapper)
            const wrapper = scene.closest('.card-showcase-wrapper');
            if (wrapper) {
                const flipBtn = wrapper.querySelector('.card-flip-btn');
                if (flipBtn) {
                    flipBtn.addEventListener('click', () => {
                        isFlipped = !isFlipped;
                        const span = flipBtn.querySelector('span');
                        if (span) span.textContent = isFlipped ? 'Flip to Front' : 'Flip Card 3D';
                        kickAnimation();
                    });
                }
            }
        });
    };

    init3DCardScenes();

    // =========================================
    // Product Tabs & Navbar In-Page Routing
    // =========================================
    const tabButtons = document.querySelectorAll('.product-tab-btn');
    const tabPanels = document.querySelectorAll('.product-panel');

    const switchProductTab = (productId) => {
        // Activate Tab Button
        tabButtons.forEach(btn => {
            const isActive = btn.dataset.tab === productId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Activate Tab Panel
        tabPanels.forEach(panel => {
            const isTarget = panel.id === `panel-${productId}`;
            panel.classList.toggle('active', isTarget);
        });

        // Trigger Lanyard resize when ID Cards tab opens
        if (productId === 'school-id-cards' && lanyardInstance) {
            setTimeout(() => lanyardInstance.resize(), 60);
        }

        // Refresh scroll reveals for active panel
        if (scrollReveal) {
            setTimeout(() => scrollReveal.refresh(), 50);
        }
    };

    // =========================================
    // React Bits Lanyard 3D Physics Component
    // =========================================
    const lanyardContainer = document.getElementById('lanyard-container');
    let lanyardInstance = null;

    if (lanyardContainer) {
        lanyardInstance = new Lanyard(lanyardContainer, {
            image: 'id-card.jpg',
            strapColor: '#0d0d12',
            gravity: 0.65,
            damping: 0.965
        });
    }

    // Tab buttons click
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchProductTab(btn.dataset.tab);
        });
    });

    // Navbar Dropdown links click -> navigate to page or switch tab
    const dropdownLinks = document.querySelectorAll('.nav-dropdown a');
    dropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // If it's a dedicated page route (e.g. /products/posters, /products/wedding-cards), allow normal navigation
            if (href && (href.startsWith('/products/') || href.includes('.html'))) {
                navLinks.classList.remove('active');
                return; // Let browser navigate normally
            }

            const product = link.dataset.product;
            if (product) {
                e.preventDefault();
                switchProductTab(product);

                // Close mobile nav & dropdowns
                navLinks.classList.remove('active');
                document.querySelectorAll('.nav-item--dropdown').forEach(item => {
                    item.classList.remove('open', 'is-open');
                    const btn = item.querySelector('.nav-dropdown-trigger');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });

                // Smooth scroll to products section
                const productsSection = document.getElementById('products');
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // Services Cards click:
    // Only Shadi Card Design and Poster Printing navigate to dedicated pages.
    // All other products remain on-page.
    const serviceCards = document.querySelectorAll('.service-card[data-target-product]');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            const product = card.dataset.targetProduct;
            if (product === 'wedding-cards') {
                window.location.href = '/products/wedding-cards';
            } else if (product === 'poster-printing' || product === 'posters') {
                window.location.href = '/products/posters';
            } else if (product) {
                // For other products, stay on page and switch the showcase tab
                switchProductTab(product);
                const productsSection = document.getElementById('products');
                if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // ── Interactive Contact Section & WhatsApp Suite with Hindi Translation Support ──
    const WHATSAPP_PHONE = '918109097729';

    // Service Map: English to clear Hindi terminology
    const serviceHindiMap = {
        'Shadi / Wedding Cards': 'शादी कार्ड प्रिंटिंग (Wedding Cards)',
        'Flex & Poster Printing': 'फ्लेक्स बैनर एवं पोस्टर (Flex & Posters)',
        'School & PVC ID Cards': 'स्कूल / कॉलेज PVC आईडी कार्ड (ID Cards)',
        'Visiting Cards': 'विज़िटिंग / बिज़नेस कार्ड (Visiting Cards)',
        'Letterhead & Stationery': 'लेटरहेड एवं ऑफिशियल स्टेशनरी (Letterhead)',
        'General Printing Query': 'अन्य प्रिंटिंग कार्य (General Printing)'
    };

    // 1. Service Selection Chips
    let selectedService = 'Shadi / Wedding Cards';
    const serviceChips = document.querySelectorAll('.service-choice-chip');
    serviceChips.forEach(chip => {
        chip.addEventListener('click', () => {
            serviceChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedService = chip.dataset.service || chip.textContent.trim();
        });
    });

    // 2. Contact Form WhatsApp Inquiry Sender with Hindi Translation Formatting
    const contactForm = document.getElementById('contact-glass-form');
    const btnWhatsappChat = document.getElementById('btn-whatsapp-chat');

    const sendFormToWhatsApp = () => {
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');

        const name = nameInput ? nameInput.value.trim() : '';
        const contact = emailInput ? emailInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        const hindiService = serviceHindiMap[selectedService] || selectedService;

        // Structured Hindi & English message so the operator understands instantly
        let text = `*नमस्ते मयंक कंप्यूटर (Mayank Computer)* 🙏\n`;
        text += `*वेबसाइट से नई प्रिंटिंग पूछताछ (New Inquiry):*\n\n`;
        text += `📋 *काम का प्रकार (Service):* ${hindiService}\n`;
        text += `👤 *ग्राहक का नाम (Customer Name):* ${name || 'ग्राहक (Customer)'}\n`;
        if (contact) {
            text += `📞 *संपर्क नंबर / ईमेल (Contact):* ${contact}\n`;
        }
        text += `📝 *ग्राहक की आवश्यकता (Requirement / Message):*\n`;
        if (message) {
            text += `"${message}"\n\n`;
        } else {
            text += `"कृपया इस सेवा के सैंपल, रेट और समय की जानकारी साझा करें।"\n\n`;
        }
        text += `👉 *(ऑपरेटर कृपया रेट और सैंपल की जानकारी ग्राहक को भेजें)*`;

        window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    };

    if (btnWhatsappChat) {
        btnWhatsappChat.addEventListener('click', (e) => {
            e.preventDefault();
            sendFormToWhatsApp();
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name')?.value.trim() || 'Valued Customer';
            alert(`धन्यवाद, ${name}! आपकी इन्क्वायरी प्राप्त हो गई है। आप तुरंत जानकारी के लिए व्हाट्सएप पर भी चैट कर सकते हैं।`);
            contactForm.reset();
        });
    }

    // 3. Floating Interactive WhatsApp Assistant Widget
    const waWidget = document.getElementById('wa-floating-widget');
    const waTrigger = document.getElementById('wa-floating-trigger');
    const waClose = document.getElementById('wa-chat-close');
    const waCustomInput = document.getElementById('wa-custom-input');
    const waSendBtn = document.getElementById('wa-custom-send-btn');
    const waQuickBtns = document.querySelectorAll('.wa-quick-btn');

    if (waTrigger && waWidget) {
        waTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            waWidget.classList.toggle('is-open');
            if (waWidget.classList.contains('is-open')) {
                setTimeout(() => waCustomInput?.focus(), 200);
            }
        });
    }

    if (waClose && waWidget) {
        waClose.addEventListener('click', (e) => {
            e.stopPropagation();
            waWidget.classList.remove('is-open');
        });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (waWidget && waWidget.classList.contains('is-open') && !waWidget.contains(e.target)) {
            waWidget.classList.remove('is-open');
        }
    });

    // Quick Option Click in Floating Widget
    waQuickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.dataset.text || btn.textContent.trim();
            window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
            waWidget?.classList.remove('is-open');
        });
    });

    // Send custom message from floating widget in Hindi format
    const sendFloatingWaMessage = () => {
        const msg = waCustomInput?.value.trim();
        let text = '';
        if (msg) {
            text = `*नमस्ते मयंक कंप्यूटर!* 🙏\n\n📝 *ग्राहक का संदेश (Customer Message):*\n"${msg}"\n\n(कृपया इस प्रिंटिंग कार्य के लिए रेट और जानकारी बताएं)`;
        } else {
            text = `*नमस्ते मयंक कंप्यूटर!* 🙏\nमुझे शादी कार्ड, फ्लेक्स बैनर, पोस्टर या आईडी कार्ड प्रिंटिंग की जानकारी चाहिए।`;
        }
        window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        if (waCustomInput) waCustomInput.value = '';
        waWidget?.classList.remove('is-open');
    };

    if (waSendBtn) {
        waSendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendFloatingWaMessage();
        });
    }

    if (waCustomInput) {
        waCustomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendFloatingWaMessage();
            }
        });
    }
});


