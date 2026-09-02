/**
 * Location Map Module - MAYANK FLAX & PRINTING PRESS, Jaijaipur
 * Exact Coordinates: 21.837529, 82.817213 (from Apple Maps Place IAD0DB25C354ADB14)
 * Signature Apple Maps Aesthetic with live tile rendering, custom pin, and theme switching.
 */

export class LocationMap {
  constructor(containerId = 'shop-leaflet-map', options = {}) {
    this.containerId = containerId;
    this.lat = 21.837529;
    this.lng = 82.817213;
    this.shopName = 'MAYANK FLAX & PRINTING PRESS';
    this.shopLocation = 'Jaijaipur, Chhattisgarh';
    this.appleMapsUrl = 'https://maps.apple/p/1CZtFLBp4FnFHZ';
    this.map = null;
    this.currentTileLayer = null;
    this.marker = null;

    this.options = Object.assign({
      zoom: 16,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      dragging: true
    }, options);

    this.init();
  }

  init() {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // If Leaflet is not yet available, poll briefly
    if (typeof L === 'undefined') {
      setTimeout(() => this.init(), 100);
      return;
    }

    // Initialize Leaflet Map with full interactive zoom & pan
    this.map = L.map(el, {
      center: [this.lat, this.lng],
      zoom: this.options.zoom,
      minZoom: 4,
      maxZoom: 19,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      dragging: true,
      boxZoom: true,
      zoomControl: false,
      attributionControl: false
    });

    // Apply initial tile layer based on current theme
    this.updateThemeTiles();

    // Apple Maps Signature Red Pin Marker
    const customIcon = L.divIcon({
      className: 'apple-marker-wrapper',
      html: `
        <div class="apple-map-pin">
          <div class="apple-pin-pulse"></div>
          <div class="apple-pin-body">
            <div class="apple-pin-head">
              <svg class="apple-pin-svg" viewBox="0 0 24 24" width="16" height="16" fill="white">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
              </svg>
            </div>
            <div class="apple-pin-point"></div>
          </div>
        </div>
      `,
      iconSize: [48, 58],
      iconAnchor: [24, 52],
      popupAnchor: [0, -48]
    });

    this.marker = L.marker([this.lat, this.lng], { icon: customIcon }).addTo(this.map);

    // Apple Maps Card Popup
    const popupContent = `
      <div class="apple-map-popup">
        <div class="apple-popup-header">
          <span class="apple-popup-category">Printing &amp; Copy Service</span>
        </div>
        <h4 class="apple-popup-title">${this.shopName}</h4>
        <p class="apple-popup-address">📍 Jaijaipur, Chhattisgarh</p>
        <div class="apple-popup-actions">
          <a href="${this.appleMapsUrl}" target="_blank" rel="noopener noreferrer" class="apple-popup-btn">
            Open in Maps &rarr;
          </a>
        </div>
      </div>
    `;
    this.marker.bindPopup(popupContent, {
      className: 'apple-maps-custom-popup',
      closeButton: true
    });

    // Add Floating Control Buttons for reliable zoom and recenter
    this.setupCustomControls();

    // Theme toggle observer
    const observer = new MutationObserver(() => {
      this.updateThemeTiles();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Resize handling
    window.addEventListener('resize', () => {
      if (this.map) this.map.invalidateSize();
    });

    // Invalidate size once map reveals
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 600);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 1200);
  }

  setupCustomControls() {
    const mapWrap = document.getElementById('shop-map-container');
    if (!mapWrap) return;

    if (!mapWrap.querySelector('.apple-maps-controls')) {
      const controls = document.createElement('div');
      controls.className = 'apple-maps-controls';
      controls.innerHTML = `
        <button type="button" class="apple-ctrl-btn" id="map-zoom-in" aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" class="apple-ctrl-btn" id="map-zoom-out" aria-label="Zoom out" title="Zoom out">&minus;</button>
        <button type="button" class="apple-ctrl-btn" id="map-recenter" aria-label="Recenter" title="Recenter on shop">📍</button>
      `;
      mapWrap.appendChild(controls);

      const zoomInBtn = controls.querySelector('#map-zoom-in');
      const zoomOutBtn = controls.querySelector('#map-zoom-out');
      const recenterBtn = controls.querySelector('#map-recenter');

      if (zoomInBtn) {
        ['click', 'touchstart'].forEach(evt => {
          zoomInBtn.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.map) this.map.zoomIn();
          });
        });
      }

      if (zoomOutBtn) {
        ['click', 'touchstart'].forEach(evt => {
          zoomOutBtn.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.map) this.map.zoomOut();
          });
        });
      }

      if (recenterBtn) {
        ['click', 'touchstart'].forEach(evt => {
          recenterBtn.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.map) this.map.flyTo([this.lat, this.lng], this.options.zoom, { duration: 0.8 });
          });
        });
      }
    }
  }

  updateThemeTiles() {
    if (!this.map) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // Signature Apple Maps vector style tiles
    // CartoDB Voyager represents the Apple Maps palette: pastel terrain, crisp roads, soft green spaces, clean labels
    const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    this.currentTileLayer = L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);

    const el = document.getElementById(this.containerId);
    if (el) {
      if (isLight) {
        el.classList.remove('dark-map-tiles');
        el.classList.add('light-map-tiles');
      } else {
        el.classList.remove('light-map-tiles');
        el.classList.add('dark-map-tiles');
      }
    }
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

export function initLocationMap() {
  return new LocationMap('shop-leaflet-map');
}

if (typeof window !== 'undefined') {
  window.LocationMap = LocationMap;
  window.initLocationMap = initLocationMap;
}
