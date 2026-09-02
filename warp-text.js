/**
 * WarpText Module - React Bits Component
 * High-performance WebGL Interactive Liquid Glass Warping Text Engine
 * Features:
 * - Upright text rasterization
 * - Continuous Right -> Left seamless infinite loop marquee
 * - Liquid glass undulation, cursor lensing, chromatic aberration, and ripples
 */

const vertexShaderSource = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  // Flip Y so 2D canvas text texture is right-side up
  vUv = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uScroll;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  // Seamless horizontal marquee scroll + texture repeat
  vec2 sampleCoord = vec2(fract(uv.x + uScroll), uv.y);
  if (sampleCoord.y < 0.0 || sampleCoord.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, sampleCoord);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

const getFontValue = value => (typeof value === 'number' ? `${value}px` : value);

const buildTextCanvas = ({ container, width, height, dpr, props }) => {
  const canvas = document.createElement('canvas');
  // Build a wide texture canvas for repeatable seamless marquee
  const baseW = Math.max(1, Math.floor(width * dpr));
  const baseH = Math.max(1, Math.floor(height * dpr));
  canvas.width = baseW;
  canvas.height = baseH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const probe = document.createElement('span');
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    inset: '0 auto auto 0',
    fontFamily: props.fontFamily,
    fontSize: getFontValue(props.fontSize),
    fontWeight: String(props.fontWeight),
    letterSpacing: getFontValue(props.letterSpacing)
  });
  container.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  let fontSizePx = parseFloat(computed.fontSize) || 120;
  const fontFamily = computed.fontFamily || '"Averia Serif Libre", Georgia, serif';
  const fontWeight = computed.fontWeight || String(props.fontWeight);
  let letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0;
  probe.remove();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Theme color check
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  ctx.fillStyle = isLight ? '#1a1a1a' : (props.color || 'rgb(242, 237, 228)');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

  // Measure single phrase and separator
  const textUnit = `${props.text}     ✦     `;
  const unitWidth = ctx.measureText(textUnit).width;

  // Fill canvas across full width with repeating seamless phrase
  let cursorX = 0;
  const targetWidth = width + unitWidth * 2;
  const centerY = height / 2;

  while (cursorX < targetWidth) {
    ctx.fillText(textUnit, cursorX, centerY);
    cursorX += unitWidth;
  }

  return canvas;
};

export class WarpText {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = Object.assign({
      text: 'Thank you',
      color: 'rgb(242, 237, 228)',
      warpStrength: 0.08,
      warpScale: 1.7,
      speed: 0.85,
      scrollSpeed: 0.085, // Fast smooth marquee speed
      pointerInfluence: 0.42,
      pointerStrength: 0.38,
      refraction: 0.018,
      ripple: true,
      fontSize: 'clamp(4.5rem, 16vw, 220px)',
      fontWeight: 700,
      fontFamily: '"Averia Serif Libre", Georgia, "Times New Roman", serif',
      letterSpacing: '-0.02em',
      lineHeight: 1.0
    }, options);

    this.scroll = 0;
    this.init();
  }

  init() {
    const container = this.container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(this.canvas);

    try {
      this.gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true
      });
    } catch (e) {
      console.warn('WarpText: WebGL2 not supported.', e);
      return;
    }

    const gl = this.gl;
    if (!gl) return;

    // Compile Shaders
    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    // Fullscreen Triangle Geometry
    const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(this.program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    this.uniforms = {
      uTextTexture: gl.getUniformLocation(this.program, 'uTextTexture'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uPointer: gl.getUniformLocation(this.program, 'uPointer'),
      uPointerActive: gl.getUniformLocation(this.program, 'uPointerActive'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uScroll: gl.getUniformLocation(this.program, 'uScroll'),
      uWarpStrength: gl.getUniformLocation(this.program, 'uWarpStrength'),
      uWarpScale: gl.getUniformLocation(this.program, 'uWarpScale'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
      uPointerInfluence: gl.getUniformLocation(this.program, 'uPointerInfluence'),
      uPointerStrength: gl.getUniformLocation(this.program, 'uPointerStrength'),
      uRefraction: gl.getUniformLocation(this.program, 'uRefraction'),
      uRipple: gl.getUniformLocation(this.program, 'uRipple'),
      uMotion: gl.getUniformLocation(this.program, 'uMotion')
    };

    // Create Text Texture with REPEAT wrapping
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    this.startTime = performance.now();
    this.lastTime = performance.now();
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.setupListeners();
    this.resize();
    this.startLoop();
  }

  rasterize() {
    if (!this.gl || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const textCanvas = buildTextCanvas({
      container: this.container,
      width: rect.width,
      height: rect.height,
      dpr,
      props: this.options
    });

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    this.render();
  }

  resize() {
    if (!this.gl || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
    this.rasterize();
  }

  setupListeners() {
    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.pointer.tx = (e.clientX - rect.left) / rect.width;
      this.pointer.ty = 1 - (e.clientY - rect.top) / rect.height;
      this.pointer.activeTarget = 1;
    };

    const onPointerLeave = () => {
      this.pointer.activeTarget = 0;
    };

    this.canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    this.canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);

    // Theme toggle observer
    const observer = new MutationObserver(() => {
      this.rasterize();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Font readiness check
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => this.rasterize());
    }
  }

  render() {
    const gl = this.gl;
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.uTextTexture, 0);

    gl.uniform1f(this.uniforms.uScroll, this.scroll);
    gl.uniform1f(this.uniforms.uWarpStrength, this.options.warpStrength);
    gl.uniform1f(this.uniforms.uWarpScale, this.options.warpScale);
    gl.uniform1f(this.uniforms.uSpeed, this.options.speed);
    gl.uniform1f(this.uniforms.uPointerInfluence, this.options.pointerInfluence);
    gl.uniform1f(this.uniforms.uPointerStrength, this.options.pointerStrength);
    gl.uniform1f(this.uniforms.uRefraction, this.options.refraction);
    gl.uniform1f(this.uniforms.uRipple, this.options.ripple ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.uMotion, this.reduceMotion ? 0.0 : 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  startLoop() {
    const loop = (now) => {
      const dt = Math.min((now - this.lastTime) * 0.001, 0.1);
      this.lastTime = now;
      const elapsed = (now - this.startTime) * 0.001;

      // Advance Right -> Left marquee scroll
      if (!this.reduceMotion) {
        this.scroll = (this.scroll + this.options.scrollSpeed * dt) % 1.0;
      }

      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = this.pointer.activeTarget > 0 ? this.pointer.tx : idleX;
      const targetY = this.pointer.activeTarget > 0 ? this.pointer.ty : idleY;
      const damping = this.pointer.activeTarget > 0 ? 0.12 : 0.035;

      this.pointer.x += (targetX - this.pointer.x) * damping;
      this.pointer.y += (targetY - this.pointer.y) * damping;
      this.pointer.active += ((this.pointer.activeTarget > 0 ? 1 : 0.18) - this.pointer.active) * 0.06;

      const gl = this.gl;
      if (gl) {
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.uPointer, this.pointer.x, this.pointer.y);
        gl.uniform1f(this.uniforms.uPointerActive, this.reduceMotion ? this.pointer.active * 0.35 : this.pointer.active);
        gl.uniform1f(this.uniforms.uTime, this.reduceMotion ? 0 : elapsed);
        this.render();
      }

      this.raf = requestAnimationFrame(loop);
    };

    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
  }
}

export function initWarpText(selector = '#thankyou-warp-text', options = {}) {
  const el = document.querySelector(selector);
  if (!el) return null;
  return new WarpText(el, options);
}

if (typeof window !== 'undefined') {
  window.WarpText = WarpText;
  window.initWarpText = initWarpText;
}
