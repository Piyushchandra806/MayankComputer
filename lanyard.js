/* =========================================
   React Bits <Lanyard /> Component (Vanilla JS)
   Slow Continuous Physical Hanging Simulation:
   - Gentle, smooth scroll-triggered drop
   - Continuous ultra-slow natural pendulum swing (~6.5s cycle)
   - Extremely subtle rotation (-2° to +2°) with harmonic easing
   - Multi-joint Catmull-Rom strap flexes naturally with the card
   - Interactive drag with seamless blend back into slow swing
   - Compact ~176px card proportion with long prominent strap
   ========================================= */

function catmullRom1D(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
}

function sampleCatmullRom(controlPoints, totalSamples = 36) {
    const pts = [];
    const n = controlPoints.length; // 4 points: P0, P1, P2, P3
    if (n < 2) return controlPoints;

    const numSegments = n - 1; // 3 segments
    const samplesPerSeg = Math.floor(totalSamples / numSegments);

    for (let seg = 0; seg < numSegments; seg++) {
        const p1 = controlPoints[seg];
        const p2 = controlPoints[seg + 1];
        const p0 = seg === 0 ? { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y } : controlPoints[seg - 1];
        const p3 = seg === numSegments - 1 ? { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y } : controlPoints[seg + 2];

        const steps = (seg === numSegments - 1) ? totalSamples - pts.length : samplesPerSeg;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            pts.push({
                x: catmullRom1D(p0.x, p1.x, p2.x, p3.x, t),
                y: catmullRom1D(p0.y, p1.y, p2.y, p3.y, t)
            });
        }
    }
    pts.push(controlPoints[n - 1]);
    return pts;
}

export class Lanyard {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        if (!this.container) return;

        this.opt = Object.assign({
            image: 'id-card.jpg',
            strapWidth: 9,
            strapColor: '#0d0d12',
            iconColor: 'rgba(255,255,255,0.65)',
            iconSpacing: 32,
            swingPeriod: 3.8,       // Slightly faster, natural pendulum swing (~3.8s)
            maxSwingAngleDeg: 2.8,  // Clean ±2.8° rotation
            maxSwingOffsetPx: 8.5   // Natural ±8.5px lateral deflection
        }, options);

        // Canvas setup
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'lanyard-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.container.insertBefore(this.canvas, this.container.firstChild);

        // Card image
        this.cardImg = new Image();
        this.cardImg.src = this.opt.image;
        this.imgReady = false;
        this.cardImg.onload = () => { this.imgReady = true; };

        // Dimensions & State
        this.W = 0; this.H = 0; this.dpr = 1;
        this.anchor = { x: 0, y: 0 };
        
        // 4 Control Joint Nodes: fixed, j1, j2, j3 (matching React Bits)
        this.joints = [
            { x: 0, y: 0, vx: 0, vy: 0, pinned: true },   // fixed (anchor)
            { x: 0, y: 0, vx: 0, vy: 0, pinned: false },  // j1
            { x: 0, y: 0, vx: 0, vy: 0, pinned: false },  // j2
            { x: 0, y: 0, vx: 0, vy: 0, pinned: false }   // j3 (card connection)
        ];

        this.card = { x: 0, y: 0, rot: 0, vRot: 0, w: 176, h: 253 };
        this.drag = false;
        this.dragOff = { x: 0, y: 0 };
        this.hovered = false;
        this.hasEntered = false;

        // Slow scroll drop animation state
        this.dropOffset = -70;      // Starts slightly higher
        this.targetDropOffset = 0;
        this.dropProgress = 0;      // 0 to 1

        // Continuous slow pendulum time
        this.time = 0;
        this.dynamicBlend = 0;     // 0 = ambient pendulum, 1 = user drag/fling

        this.resize();
        this._initJoints();
        this._bindEvents();
        this._setupScrollObserver();
        this._loop();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.W = rect.width || 420;
        this.H = rect.height || 480;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.canvas.width = this.W * this.dpr;
        this.canvas.height = this.H * this.dpr;
        this.canvas.style.width = this.W + 'px';
        this.canvas.style.height = this.H + 'px';

        this.anchor.x = this.W / 2;
        this.anchor.y = 0;
        this.joints[0].x = this.anchor.x;
        this.joints[0].y = this.anchor.y;

        // Compact ID card proportion (~140px on mobile, ~165px on desktop)
        const maxW = this.W < 420 ? 138 : 162;
        const baseWidth = Math.min(maxW, this.W * 0.38);
        this.card.w = Math.round(baseWidth);
        this.card.h = Math.round(this.card.w * 1.42);

        this._resetJointPositions();
    }

    _initJoints() {
        const totalLength = this._ropeLen();
        const segLen = totalLength / 3;

        for (let i = 0; i < 4; i++) {
            this.joints[i].x = this.anchor.x;
            this.joints[i].y = this.anchor.y + i * segLen;
            this.joints[i].vx = 0;
            this.joints[i].vy = 0;
        }

        const j3 = this.joints[3];
        this.card.x = j3.x;
        this.card.y = j3.y;
        this.card.rot = 0;
        this.card.vRot = 0;
    }

    _resetJointPositions() {
        this.joints[0].x = this.anchor.x;
        this.joints[0].y = this.anchor.y;
    }

    _ropeLen() {
        // Ensures the card bottom always stays comfortably inside the canvas with 45px+ padding
        const targetLen = Math.min(this.H * 0.36, this.H - this.card.h - 48);
        return Math.max(90, targetLen);
    }

    /* ── Scroll Drop Trigger ── */
    _setupScrollObserver() {
        if (!('IntersectionObserver' in window)) {
            this.dropOffset = 0;
            this.dropProgress = 1;
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasEntered) {
                    this.hasEntered = true;
                    this.triggerDrop();
                }
            });
        }, { threshold: 0.12 });

        this.observer.observe(this.container);
    }

    triggerDrop() {
        // Smooth and gentle descent from higher position
        this.dropOffset = -70;
        this.dropProgress = 0;
    }

    /* ── User Interaction (Drag / Touch) ── */
    _bindEvents() {
        window.addEventListener('resize', () => this.resize());

        const pos = (e) => {
            const r = this.canvas.getBoundingClientRect();
            const src = e.touches ? e.touches[0] : e;
            return { x: src.clientX - r.left, y: src.clientY - r.top };
        };

        const inCard = (x, y) => {
            const hw = this.card.w / 2 + 12;
            const hh = this.card.h / 2 + 12;
            const cy = this.card.y + this.card.h / 2;
            return Math.abs(x - this.card.x) < hw && Math.abs(y - cy) < hh;
        };

        const onDown = (e) => {
            const p = pos(e);
            if (inCard(p.x, p.y)) {
                this.drag = true;
                this.dynamicBlend = 1;
                this.dragOff.x = this.joints[3].x - p.x;
                this.dragOff.y = this.joints[3].y - p.y;
                this.canvas.style.cursor = 'grabbing';
            }
        };

        const onMove = (e) => {
            const p = pos(e);
            if (this.drag) {
                const tx = p.x + this.dragOff.x;
                const ty = Math.max(p.y + this.dragOff.y, this.anchor.y + 40);
                const j3 = this.joints[3];
                
                j3.vx = (tx - j3.x) * 0.5;
                j3.vy = (ty - j3.y) * 0.5;
                j3.x = tx;
                j3.y = ty;
            } else {
                const h = inCard(p.x, p.y);
                if (h !== this.hovered) {
                    this.hovered = h;
                    this.canvas.style.cursor = h ? 'grab' : 'default';
                }
            }
        };

        const onUp = () => {
            if (this.drag) {
                this.drag = false;
                this.canvas.style.cursor = this.hovered ? 'grab' : 'default';
            }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        this.canvas.addEventListener('touchstart', onDown, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onUp);
    }

    /* ── Physics Simulation Step ── */
    _step() {
        this.time += 1;

        // 1. Slow and gentle scroll drop progression
        if (this.hasEntered && this.dropOffset < 0) {
            // Gentle exponential ease into hanging position (approx 1.6s)
            this.dropOffset += (this.targetDropOffset - this.dropOffset) * 0.045;
            if (Math.abs(this.dropOffset) < 0.2) {
                this.dropOffset = 0;
            }
        }

        const totalLength = this._ropeLen();
        const segLen = totalLength / 3;

        // 2. Ultra-slow continuous natural pendulum motion (~6.5s per cycle)
        const omega = (2 * Math.PI) / (60 * this.opt.swingPeriod); // ~0.0161 rad/frame
        const swingPhase = this.time * omega;
        const swingHarmonic = Math.sin(swingPhase); // -1 to +1 smoothly

        const maxOffset = this.opt.maxSwingOffsetPx;
        const maxRotRad = (this.opt.maxSwingAngleDeg * Math.PI) / 180; // ~0.038 rad (±2.2°)

        // Ambient target positions for each joint (natural catenary wave)
        const ambX0 = this.anchor.x;
        const ambX1 = this.anchor.x + swingHarmonic * (maxOffset * 0.22);
        const ambX2 = this.anchor.x + swingHarmonic * (maxOffset * 0.60);
        const ambX3 = this.anchor.x + swingHarmonic * maxOffset;

        const ambY0 = this.anchor.y + this.dropOffset;
        const ambY1 = this.anchor.y + this.dropOffset + segLen;
        const ambY2 = this.anchor.y + this.dropOffset + segLen * 2;
        const ambY3 = this.anchor.y + this.dropOffset + segLen * 3;

        const ambRot = swingHarmonic * maxRotRad;

        // 3. Blend user drag with ambient slow swing
        if (this.drag) {
            this.dynamicBlend = 1;
            // Solve distance constraints for joints 0, 1, 2 towards dragged joint 3
            this.joints[0].x = this.anchor.x;
            this.joints[0].y = this.anchor.y + this.dropOffset;

            for (let iter = 0; iter < 12; iter++) {
                for (let i = 0; i < 3; i++) {
                    const a = this.joints[i];
                    const b = this.joints[i + 1];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.hypot(dx, dy) || 0.0001;
                    const diff = (dist - segLen) / dist;

                    if (!a.pinned) {
                        a.x += dx * 0.5 * diff;
                        a.y += dy * 0.5 * diff;
                    }
                    if (i !== 2) {
                        b.x -= dx * 0.5 * diff;
                        b.y -= dy * 0.5 * diff;
                    }
                }
            }

            this.card.x = this.joints[3].x;
            this.card.y = this.joints[3].y;
            const j2 = this.joints[2];
            const j3 = this.joints[3];
            const targetAngle = -Math.atan2(j3.x - j2.x, j3.y - j2.y);
            this.card.vRot += (targetAngle - this.card.rot) * 0.18;
            this.card.vRot *= 0.82;
            this.card.rot += this.card.vRot;

        } else {
            // Smooth decay of any drag impulse into the continuous ambient swing
            if (this.dynamicBlend > 0.002) {
                // Decay dynamic momentum
                this.dynamicBlend *= 0.94;

                const j = this.joints;
                j[0].x = ambX0; j[0].y = ambY0;
                j[1].x += (ambX1 - j[1].x) * 0.08; j[1].y += (ambY1 - j[1].y) * 0.08;
                j[2].x += (ambX2 - j[2].x) * 0.08; j[2].y += (ambY2 - j[2].y) * 0.08;
                j[3].x += (ambX3 - j[3].x) * 0.08; j[3].y += (ambY3 - j[3].y) * 0.08;

                this.card.x = j[3].x;
                this.card.y = j[3].y;
                this.card.rot += (ambRot - this.card.rot) * 0.08;
            } else {
                // Pure continuous ultra-slow pendulum state
                this.dynamicBlend = 0;
                this.joints[0].x = ambX0; this.joints[0].y = ambY0;
                this.joints[1].x = ambX1; this.joints[1].y = ambY1;
                this.joints[2].x = ambX2; this.joints[2].y = ambY2;
                this.joints[3].x = ambX3; this.joints[3].y = ambY3;

                this.card.x = ambX3;
                this.card.y = ambY3;
                this.card.rot = ambRot;
            }
        }
    }

    /* ── Render ── */
    _draw() {
        const ctx = this.ctx;
        ctx.save();
        ctx.scale(this.dpr, this.dpr);
        ctx.clearRect(0, 0, this.W, this.H);

        // Generate smooth Catmull-Rom spline curve from joints
        const curvePoints = sampleCatmullRom(this.joints, 36);

        this._drawStrap(ctx, curvePoints);
        this._drawHook(ctx);
        this._drawCard(ctx);

        ctx.restore();
    }

    /* ── Strap Ribbon (Catmull-Rom Curve) ── */
    _drawStrap(ctx, curvePoints) {
        if (curvePoints.length < 2) return;
        const sw = this.opt.strapWidth;

        // Ribbon Path
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (let i = 1; i < curvePoints.length; i++) {
            ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }

        // Dark Satin Strap Base
        ctx.strokeStyle = this.opt.strapColor;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Subtle Lighter Edge Highlight for fabric depth
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = sw - 2;
        ctx.stroke();

        ctx.restore();

        // Star Icons spaced along curve
        this._drawIconsAlongCurve(ctx, curvePoints);
    }

    _drawIconsAlongCurve(ctx, pts) {
        const spacing = this.opt.iconSpacing;
        let acc = spacing * 0.6;
        let seg = 0;

        while (seg < pts.length - 1) {
            const ax = pts[seg].x, ay = pts[seg].y;
            const bx = pts[seg + 1].x, by = pts[seg + 1].y;
            const segLen = Math.hypot(bx - ax, by - ay);

            if (acc <= segLen) {
                const t = acc / segLen;
                const ix = ax + (bx - ax) * t;
                const iy = ay + (by - ay) * t;
                const angle = Math.atan2(by - ay, bx - ax) + Math.PI / 2;

                ctx.save();
                ctx.translate(ix, iy);
                ctx.rotate(angle);

                // 6-spoke asterisk / star icon
                ctx.strokeStyle = this.opt.iconColor;
                ctx.lineWidth = 1.3;
                ctx.lineCap = 'round';
                const r = 4;
                for (let k = 0; k < 6; k++) {
                    const a = (k / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    ctx.stroke();
                }
                ctx.restore();

                acc += spacing;
            } else {
                acc -= segLen;
                seg++;
            }
        }
    }

    /* ── Metal Clip / J-Hook ── */
    _drawHook(ctx) {
        const j3 = this.joints[3];
        ctx.save();
        ctx.translate(j3.x, j3.y);
        ctx.rotate(this.card.rot);

        // Metallic gradient
        const grad = ctx.createLinearGradient(-5, -16, 5, 16);
        grad.addColorStop(0, '#d6d9e0');
        grad.addColorStop(0.4, '#8e919c');
        grad.addColorStop(0.7, '#cbd0da');
        grad.addColorStop(1, '#767a82');

        ctx.strokeStyle = grad;
        ctx.fillStyle = grad;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';

        // Top ring attached to strap
        ctx.beginPath();
        ctx.arc(0, -14, 4.5, 0, Math.PI * 2);
        ctx.stroke();

        // J-hook body extending into punch hole
        ctx.beginPath();
        ctx.moveTo(0, -9.5);
        ctx.lineTo(0, 11);
        ctx.arc(3, 11, 3, Math.PI, 0);
        ctx.stroke();

        // Locking gate
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(5.5, 9.5, 2.2, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();

        ctx.restore();
    }

    /* ── ID Card ── */
    _drawCard(ctx) {
        const w = this.card.w;
        const h = this.card.h;
        const cx = this.card.x;
        const cy = this.card.y + h / 2;
        const r = 12;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.card.rot);

        // Realistic soft physical drop shadow (dark base to prevent white edge fringing)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = 'rgba(12, 14, 20, 0.95)';
        this._rrect(ctx, -w / 2, -h / 2, w, h, r);
        ctx.fill();
        ctx.restore();

        // Card Face with seamless anti-aliased clipping
        ctx.save();
        this._rrect(ctx, -w / 2, -h / 2, w, h, r);
        ctx.clip();

        if (this.imgReady) {
            ctx.drawImage(this.cardImg, -w / 2 - 0.5, -h / 2 - 0.5, w + 1, h + 1);
        } else {
            this._drawFallback(ctx, w, h);
        }

        // Specular gloss reflection shifting smoothly with the sway
        const gloss = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        const ga = Math.abs(this.card.rot) * 0.4 + 0.06;
        gloss.addColorStop(0, `rgba(255,255,255,${Math.min(ga, 0.35)})`);
        gloss.addColorStop(0.35, `rgba(255,255,255,${Math.min(ga * 0.2, 0.06)})`);
        gloss.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gloss;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();

        // Subtle clean bezel border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        this._rrect(ctx, -w / 2, -h / 2, w, h, r);
        ctx.stroke();

        // Punch hole (aligned with J-hook at y = 11)
        const holeR = 4.2;
        const holeY = -h / 2 + 12;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, holeY, holeR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner punch rim
        ctx.beginPath();
        ctx.arc(0, holeY, holeR - 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    _drawFallback(ctx, w, h) {
        ctx.fillStyle = '#0f2055';
        ctx.fillRect(-w / 2, -h / 2, w, h * 0.32);

        ctx.fillStyle = '#f8f9fc';
        ctx.fillRect(-w / 2, -h / 2 + h * 0.32, w, h * 0.68);

        ctx.fillStyle = '#c9972b';
        ctx.fillRect(-w / 2, -h / 2 + h * 0.32, w, 3);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${w * 0.115}px Inter, sans-serif`;
        ctx.fillText('MAYANK', 0, -h / 2 + h * 0.16);
        ctx.fillText('COMPUTER', 0, -h / 2 + h * 0.26);

        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = `${w * 0.065}px Inter, sans-serif`;
        ctx.fillText('PRINT & DIGITAL PRESS', 0, -h / 2 + h * 0.35);
    }

    _rrect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    }

    _loop() {
        this._step();
        this._draw();
        this._rafId = requestAnimationFrame(() => this._loop());
    }

    destroy() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this.observer) this.observer.disconnect();
        this.canvas?.parentNode?.removeChild(this.canvas);
    }
}
