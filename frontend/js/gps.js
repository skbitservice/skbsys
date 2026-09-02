/**
 * Engineer Travel Distance & Payout System
 * Phone GPS Tracker & Route Simulator Engine
 * - HTML5 Geolocation API (watchPosition & high accuracy)
 * - GPS Breadcrumb Trail & Actual Logged KM Odometer
 * - Proximity Geofencing (Auto-detect arrival within 150m)
 * - Real-time Ride Simulator for testing without driving
 * - 1-Click GPS Location Detection & Reverse Geocoding
 */

class GPSTracker {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.isSimulating = false;
    this.simTimer = null;
    this.currentPosition = null;
    this.breadcrumbs = [];
    this.actualLoggedKm = 0;
    this.lastBreadcrumbCoord = null;
    this.activeEngineerId = null;
    this.callbacks = new Set();
  }

  isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Subscribe to GPS position updates
   */
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifySubscribers(posData) {
    this.callbacks.forEach(cb => {
      try { cb(posData); } catch (e) { console.error('GPS subscriber error:', e); }
    });
  }

  /**
   * Get Single Current GPS Location with High Accuracy Promise
   */
  async getCurrentLocation() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser/device.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy)
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  /**
   * Reverse Geocode (Lat, Lng -> Readable Street Address)
   */
  async reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.address || {};
          const parts = [
            addr.road || addr.suburb || addr.neighbourhood,
            addr.suburb || addr.city_district || addr.locality,
            addr.city || addr.town || 'Delhi',
            addr.postcode
          ].filter(Boolean);

          if (parts.length >= 2) {
            return parts.join(', ');
          }
          return data.display_name;
        }
      }
    } catch (e) {
      console.warn('Reverse geocode warning:', e);
    }
    return `Location near ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  /**
   * Start Live Phone GPS Tracking using HTML5 Geolocation API
   */
  startPhoneTracking(engineerId, onPositionUpdate, onError) {
    if (!this.isSupported()) {
      const err = new Error('HTML5 Geolocation is not supported by your browser/device.');
      if (onError) onError(err);
      return false;
    }

    if (this.isTracking) {
      this.stopTracking();
    }

    this.activeEngineerId = engineerId;
    this.isTracking = true;
    this.isSimulating = false;

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    const handleSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : 0; // Convert m/s to km/h
      const heading = pos.coords.heading || 0;
      const timestamp = new Date(pos.timestamp).toISOString();

      const posData = {
        engineerId: this.activeEngineerId,
        latitude: lat,
        longitude: lng,
        accuracy: Math.round(accuracy),
        speedKmH: Math.round(speed),
        heading: Math.round(heading),
        timestamp,
        isSimulated: false
      };

      this.currentPosition = posData;
      this.recordBreadcrumb(lat, lng, accuracy, speed);
      this.saveLivePing(posData);
      this.notifySubscribers(posData);

      if (onPositionUpdate) onPositionUpdate(posData);
    };

    const handleError = (err) => {
      console.warn('GPS Watch Position Warning:', err.message);
      if (onError) onError(err);
    };

    this.watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    console.log('📡 Phone GPS tracking started for engineer:', engineerId);
    return true;
  }

  /**
   * Stop GPS Tracking & clear watchers
   */
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.isTracking = false;
    this.isSimulating = false;
    console.log('⏹ GPS Tracking stopped.');
  }

  /**
   * Record breadcrumb coordinate and accumulate real odometer distance
   */
  recordBreadcrumb(lat, lng, accuracy = 10, speed = 0) {
    const timestamp = new Date().toISOString();
    const point = [lat, lng, timestamp, accuracy, speed];
    this.breadcrumbs.push(point);

    if (this.lastBreadcrumbCoord) {
      const deltaKm = distanceEngine.calculateHaversine(
        this.lastBreadcrumbCoord[0],
        this.lastBreadcrumbCoord[1],
        lat,
        lng
      );

      // Only count movement if greater than 10 meters (prevents GPS jitter while stationary)
      if (deltaKm > 0.01) {
        this.actualLoggedKm = Number((this.actualLoggedKm + deltaKm).toFixed(2));
        this.lastBreadcrumbCoord = [lat, lng];
      }
    } else {
      this.lastBreadcrumbCoord = [lat, lng];
    }

    return {
      breadcrumbs: this.breadcrumbs,
      actualLoggedKm: this.actualLoggedKm
    };
  }

  /**
   * Save real-time ping to storage so Admin Fleet Map can track all engineers live
   */
  saveLivePing(posData) {
    try {
      const pingsKey = 'ttp_live_pings';
      const existing = JSON.parse(localStorage.getItem(pingsKey) || '{}');
      existing[posData.engineerId] = posData;
      localStorage.setItem(pingsKey, JSON.stringify(existing));
    } catch (e) {
      console.error('Error saving live ping:', e);
    }
  }

  getLivePings() {
    try {
      return JSON.parse(localStorage.getItem('ttp_live_pings') || '{}');
    } catch (e) {
      return {};
    }
  }

  /**
   * Proximity Geofencing Check
   * Returns true if current position is within radiusMeters of target
   */
  isNearLocation(currentLat, currentLng, targetLat, targetLng, radiusMeters = 150) {
    if (!currentLat || !currentLng || !targetLat || !targetLng) return false;
    const distKm = distanceEngine.calculateHaversine(currentLat, currentLng, targetLat, targetLng);
    const distMeters = distKm * 1000;
    return distMeters <= radiusMeters;
  }

  /**
   * Realistic Test Ride Simulator
   * Steps through the route polyline coordinates smoothly for desktop/office testing
   */
  startRideSimulation(engineerId, routeCoordinates, speedMultiplier = 1, onStep, onArrivalAtStop) {
    if (!routeCoordinates || routeCoordinates.length === 0) {
      alert('No route coordinates available for simulation.');
      return;
    }

    this.stopTracking();
    this.isSimulating = true;
    this.isTracking = true;
    this.activeEngineerId = engineerId;
    this.breadcrumbs = [];
    this.actualLoggedKm = 0;
    this.lastBreadcrumbCoord = null;

    let currentIndex = 0;
    const totalPoints = routeCoordinates.length;
    const intervalMs = Math.max(80, Math.round(500 / speedMultiplier));

    console.log(`🎮 Starting ride simulation: ${totalPoints} waypoints at ${speedMultiplier}x speed.`);

    this.simTimer = setInterval(() => {
      if (currentIndex >= totalPoints) {
        this.stopTracking();
        if (onStep) onStep({ finished: true, actualKm: this.actualLoggedKm });
        return;
      }

      const coord = routeCoordinates[currentIndex];
      const lat = coord[0];
      const lng = coord[1];

      let heading = 0;
      if (currentIndex < totalPoints - 1) {
        const nextCoord = routeCoordinates[currentIndex + 1];
        heading = this.calculateBearing(lat, lng, nextCoord[0], nextCoord[1]);
      }

      const simulatedSpeed = Math.floor(25 + Math.random() * 15);

      const posData = {
        engineerId: this.activeEngineerId,
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        speedKmH: simulatedSpeed,
        heading,
        timestamp: new Date().toISOString(),
        isSimulated: true,
        progressPercent: Math.round((currentIndex / totalPoints) * 100)
      };

      this.currentPosition = posData;
      this.recordBreadcrumb(lat, lng, 5, simulatedSpeed);
      this.saveLivePing(posData);
      this.notifySubscribers(posData);

      if (onStep) onStep(posData);

      currentIndex++;
    }, intervalMs);
  }

  calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = deg => deg * (Math.PI / 180);
    const toDeg = rad => rad * (180 / Math.PI);
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    const brng = Math.atan2(y, x);
    return Math.round((toDeg(brng) + 360) % 360);
  }

  reset() {
    this.stopTracking();
    this.breadcrumbs = [];
    this.actualLoggedKm = 0;
    this.lastBreadcrumbCoord = null;
    this.currentPosition = null;
  }
}

// Global GPS Tracker instance
window.gpsTracker = new GPSTracker();
