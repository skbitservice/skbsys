/**
 * Engineer Travel Distance & Payout System
 * Map Manager & Visualization Engine (Leaflet + Google Maps / OSM)
 */

class MapManager {
  constructor() {
    this.maps = new Map();
    this.markers = new Map();
    this.polylines = new Map();
    this.liveMarkers = new Map();
    this.liveAccuracyCircles = new Map();
    this.breadcrumbLines = new Map();
  }

  init(containerId, center = CONFIG.MAP.DEFAULT_CENTER, zoom = CONFIG.MAP.DEFAULT_ZOOM) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (this.maps.has(containerId)) {
      const existing = this.maps.get(containerId);
      existing.invalidateSize();
      return existing;
    }

    const map = L.map(containerId, {
      zoomControl: true,
      attributionControl: false
    }).setView(center, zoom);

    const layerCfg = CONFIG.MAP.LAYERS.google_roadmap;
    const tileLayer = L.tileLayer(layerCfg.url, {
      maxZoom: 20,
      subdomains: layerCfg.subdomains || []
    }).addTo(map);

    map._currentLayer = tileLayer;

    this.maps.set(containerId, map);
    this.markers.set(containerId, []);
    this.polylines.set(containerId, []);

    this.addLayerSwitcher(containerId, map);

    setTimeout(() => map.invalidateSize(), 250);
    return map;
  }

  switchMapLayer(containerId, layerKey) {
    const map = this.maps.get(containerId);
    if (!map || !CONFIG.MAP.LAYERS[layerKey]) return;

    if (map._currentLayer) {
      map.removeLayer(map._currentLayer);
    }

    const cfg = CONFIG.MAP.LAYERS[layerKey];
    const newLayer = L.tileLayer(cfg.url, {
      maxZoom: 20,
      subdomains: cfg.subdomains || []
    }).addTo(map);

    map._currentLayer = newLayer;

    const container = document.getElementById(containerId);
    if (container && container.parentElement) {
      const btns = container.parentElement.querySelectorAll('.map-layer-btn');
      btns.forEach(btn => {
        if (btn.getAttribute('data-layer') === layerKey) {
          btn.className = 'map-layer-btn px-2.5 py-1 text-[10px] font-bold rounded-md bg-blue-600 text-white shadow-sm';
        } else {
          btn.className = 'map-layer-btn px-2.5 py-1 text-[10px] font-semibold rounded-md bg-white text-slate-700 hover:bg-slate-100 shadow-sm border border-slate-200';
        }
      });
    }
  }

  addLayerSwitcher(containerId, map) {
    const container = document.getElementById(containerId);
    if (!container || !container.parentElement) return;

    const switcherDiv = document.createElement('div');
    switcherDiv.className = 'map-layer-switcher absolute top-3 right-3 z-[1000] flex gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg shadow-md border border-slate-200';
    switcherDiv.innerHTML = `
      <button onclick="mapManager.switchMapLayer('${containerId}', 'google_roadmap')" data-layer="google_roadmap" class="map-layer-btn px-2.5 py-1 text-[10px] font-bold rounded-md bg-blue-600 text-white shadow-sm" title="Google Maps Roadmap">
        <i class="fa-solid fa-road mr-1"></i> Road
      </button>
      <button onclick="mapManager.switchMapLayer('${containerId}', 'google_satellite')" data-layer="google_satellite" class="map-layer-btn px-2.5 py-1 text-[10px] font-semibold rounded-md bg-white text-slate-700 hover:bg-slate-100 shadow-sm border border-slate-200" title="Google Satellite Imagery">
        <i class="fa-solid fa-satellite mr-1"></i> Sat
      </button>
      <button onclick="mapManager.switchMapLayer('${containerId}', 'google_terrain')" data-layer="google_terrain" class="map-layer-btn px-2.5 py-1 text-[10px] font-semibold rounded-md bg-white text-slate-700 hover:bg-slate-100 shadow-sm border border-slate-200" title="Google Terrain">
        <i class="fa-solid fa-mountain mr-1"></i> Terrain
      </button>
      <button onclick="mapManager.switchMapLayer('${containerId}', 'osm')" data-layer="osm" class="map-layer-btn px-2.5 py-1 text-[10px] font-semibold rounded-md bg-white text-slate-700 hover:bg-slate-100 shadow-sm border border-slate-200" title="OpenStreetMap">
        <i class="fa-solid fa-compass mr-1"></i> OSM
      </button>
    `;

    if (getComputedStyle(container.parentElement).position === 'static') {
      container.parentElement.style.position = 'relative';
    }

    container.parentElement.appendChild(switcherDiv);
  }

  getMap(containerId) {
    return this.maps.get(containerId);
  }

  clearMap(containerId) {
    const map = this.maps.get(containerId);
    if (!map) return;

    if (this.markers.has(containerId)) {
      this.markers.get(containerId).forEach(m => map.removeLayer(m));
      this.markers.set(containerId, []);
    }

    if (this.polylines.has(containerId)) {
      this.polylines.get(containerId).forEach(p => map.removeLayer(p));
      this.polylines.set(containerId, []);
    }

    for (const [key, marker] of this.liveMarkers.entries()) {
      if (key.startsWith(containerId)) {
        map.removeLayer(marker);
        this.liveMarkers.delete(key);
      }
    }

    for (const [key, circle] of this.liveAccuracyCircles.entries()) {
      if (key.startsWith(containerId)) {
        map.removeLayer(circle);
        this.liveAccuracyCircles.delete(key);
      }
    }

    if (this.breadcrumbLines.has(containerId)) {
      map.removeLayer(this.breadcrumbLines.get(containerId));
      this.breadcrumbLines.delete(containerId);
    }
  }

  createCustomIcon(type, number = '', title = '') {
    let iconHtml = '';
    let className = 'custom-map-pin';

    if (type === 'office') {
      className += ' pin-office';
      iconHtml = `<div class="pin-inner office"><i class="fa-solid fa-building"></i></div>`;
    } else if (type === 'home') {
      className += ' pin-home';
      iconHtml = `<div class="pin-inner home"><i class="fa-solid fa-house-chimney"></i></div>`;
    } else if (type === 'live') {
      className += ' pin-live';
      iconHtml = `<div class="pin-inner" style="background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4);"><i class="fa-solid fa-motorcycle"></i></div>`;
    } else {
      className += ' pin-customer';
      iconHtml = `<div class="pin-inner customer">${number || '📍'}</div>`;
    }

    return L.divIcon({
      className: className,
      html: iconHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });
  }

  renderJourney(containerId, stops, legs = [], allRouteCoords = []) {
    let map = this.getMap(containerId);
    if (!map) {
      map = this.init(containerId);
    }
    if (!map) return;

    this.clearMap(containerId);
    const bounds = L.latLngBounds();

    let customerIdx = 1;
    stops.forEach((stop) => {
      const latLng = L.latLng(stop.latitude, stop.longitude);
      bounds.extend(latLng);

      let pinType = 'customer';
      let pinLabel = customerIdx.toString();

      if (stop.type === 'office') {
        pinType = 'office';
        pinLabel = '🏢';
      } else if (stop.type === 'home') {
        pinType = 'home';
        pinLabel = '🏠';
      } else {
        customerIdx++;
      }

      const icon = this.createCustomIcon(pinType, pinLabel, stop.name);
      const marker = L.marker(latLng, { icon: icon }).addTo(map);

      marker.bindPopup(`
        <div class="map-popup-card">
          <div class="popup-tag ${stop.type === 'office' ? 'tag-office' : (stop.type === 'home' ? 'tag-home' : 'tag-customer')}">
            ${stop.type === 'office' ? 'STARTING HUB' : (stop.type === 'home' ? 'RETURN DESTINATION' : `CUSTOMER STOP ${pinLabel}`)}
          </div>
          <h4 class="popup-title">${stop.name}</h4>
          <p class="popup-address">${stop.address}</p>
          ${stop.phone ? `<p class="text-xs text-slate-500 mt-1">📞 ${stop.contact_person || 'Contact'}: ${stop.phone}</p>` : ''}
        </div>
      `);

      this.markers.get(containerId).push(marker);
    });

    if (allRouteCoords && allRouteCoords.length > 0) {
      const line = L.polyline(allRouteCoords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      this.polylines.get(containerId).push(line);
      allRouteCoords.forEach(pt => bounds.extend(L.latLng(pt[0], pt[1])));
    } else if (legs && legs.length > 0) {
      legs.forEach(leg => {
        const coords = leg.coordinates || [
          [leg.fromLat, leg.fromLng],
          [leg.toLat, leg.toLng]
        ];

        const shadowLine = L.polyline(coords, {
          color: '#1e3a8a',
          weight: 7,
          opacity: 0.35,
          smoothFactor: 1
        }).addTo(map);

        const mainLine = L.polyline(coords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6',
          smoothFactor: 1
        }).addTo(map);

        mainLine.bindPopup(`
          <div class="map-leg-popup">
            <strong>Leg ${leg.legOrder}:</strong> ${leg.fromName} &rarr; ${leg.toName}<br>
            <strong>Distance:</strong> ${leg.distanceKm} km<br>
            <strong>Rate:</strong> ₹${leg.ratePerKm.toFixed(2)}/km<br>
            <strong>Payout:</strong> <span class="text-green-600 font-bold">₹${leg.amount.toFixed(2)}</span>
          </div>
        `);

        coords.forEach(pt => bounds.extend(L.latLng(pt[0], pt[1])));
        this.polylines.get(containerId).push(shadowLine, mainLine);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
    }
  }

  updateLiveLocation(containerId, engineerId, lat, lng, accuracy = 10, speed = 0, heading = 0, isSimulated = false, label = '') {
    let map = this.getMap(containerId);
    if (!map) {
      map = this.init(containerId);
    }
    if (!map) return;

    const key = `${containerId}_${engineerId}`;
    const latLng = L.latLng(lat, lng);

    let marker = this.liveMarkers.get(key);
    let circle = this.liveAccuracyCircles.get(key);

    if (!marker) {
      marker = L.marker(latLng, {
        icon: this.createCustomIcon('live', '', 'Live Position'),
        zIndexOffset: 1000
      }).addTo(map);

      circle = L.circle(latLng, {
        radius: Math.max(accuracy, 15),
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(map);

      this.liveMarkers.set(key, marker);
      this.liveAccuracyCircles.set(key, circle);
    } else {
      marker.setLatLng(latLng);
      circle.setLatLng(latLng);
      circle.setRadius(Math.max(accuracy, 15));
    }

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-tag" style="background:#fee2e2; color:#b91c1c;">
          ${isSimulated ? 'TEST GPS SIMULATION' : 'LIVE PHONE GPS'}
        </div>
        <h4 class="popup-title">${label || 'Engineer on Route'}</h4>
        <p class="popup-address">
          <strong>Speed:</strong> ${speed} km/h | <strong>Accuracy:</strong> &plusmn;${accuracy}m<br>
          <strong>Heading:</strong> ${heading}&deg; | <strong>GPS:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </p>
      </div>
    `;

    marker.bindPopup(popupContent);
  }

  updateBreadcrumbTrail(containerId, breadcrumbs) {
    const map = this.getMap(containerId);
    if (!map || !breadcrumbs || breadcrumbs.length < 2) return;

    const coords = breadcrumbs.map(b => [b[0], b[1]]);

    if (this.breadcrumbLines.has(containerId)) {
      this.breadcrumbLines.get(containerId).setLatLngs(coords);
    } else {
      const trail = L.polyline(coords, {
        color: '#06b6d4',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      this.breadcrumbLines.set(containerId, trail);
    }
  }

  /**
   * Render Real-Time Fleet Radar Map (Live GPS for all engineers)
   */
  renderFleetRadar(containerId, engineers, livePings) {
    let map = this.getMap(containerId);
    if (!map) {
      map = this.init(containerId);
    }
    if (!map) return;

    this.clearMap(containerId);
    const bounds = L.latLngBounds();

    const office = db.getMainOffice();
    const officeLatLng = L.latLng(office.latitude, office.longitude);
    bounds.extend(officeLatLng);

    const officeMarker = L.marker(officeLatLng, {
      icon: this.createCustomIcon('office', '🏢', office.name)
    }).addTo(map);

    officeMarker.bindPopup(`<strong>${office.name}</strong><br>${office.address}`);
    this.markers.get(containerId).push(officeMarker);

    engineers.forEach(eng => {
      const ping = livePings[eng.id];
      const lat = ping ? ping.latitude : eng.home_latitude;
      const lng = ping ? ping.longitude : eng.home_longitude;

      if (!lat || !lng) return;

      const latLng = L.latLng(lat, lng);
      bounds.extend(latLng);

      const isLive = !!ping && gpsTracker.isEngineerOnline(eng.id);
      const iconType = isLive ? 'live' : 'home';

      const marker = L.marker(latLng, {
        icon: this.createCustomIcon(iconType, '', eng.name),
        zIndexOffset: isLive ? 1000 : 100
      }).addTo(map);

      marker.bindPopup(`
        <div class="map-popup-card">
          <div class="popup-tag ${isLive ? 'bg-red-100 text-red-700 font-bold' : 'tag-home'}">
            ${isLive ? '🔴 LIVE ON ROAD' : 'AT HOME / OFF-DUTY'}
          </div>
          <h4 class="popup-title">${eng.name}</h4>
          <p class="popup-address">
            <strong>Vehicle:</strong> ${eng.vehicle_type} (${eng.vehicle_number || 'N/A'})<br>
            ${isLive ? `<strong>Speed:</strong> ${ping.speedKmH || 0} km/h • <strong>Signal:</strong> &plusmn;${ping.accuracy}m<br><small class="text-slate-400">Ping: ${new Date(ping.timestamp).toLocaleTimeString()}</small>` : `Home: ${eng.home_address}`}
          </p>
        </div>
      `);

      this.markers.get(containerId).push(marker);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }

  // Alias for compatibility
  renderFleetOverview(containerId, engineers, livePings) {
    this.renderFleetRadar(containerId, engineers, livePings);
  }
}

window.mapManager = new MapManager();
