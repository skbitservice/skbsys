/**
 * Engineer Travel Distance & Payout System
 * Distance & Routing Engine
 * - Real OSRM Road Distance Calculation
 * - Haversine Fallback with Road Curvature Factor (1.25x)
 * - Route Optimization (Shortest Path Nearest Neighbor)
 * - Payout Multiplier (Rate: ₹2.50 / km)
 */

class DistanceEngine {
  constructor() {
    this.routeCache = new Map();
  }

  /**
   * Calculate Great-Circle Distance using Haversine Formula (in KM)
   */
  calculateHaversine(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Apply Delhi-NCR urban road detour multiplier (approx 1.25x - 1.30x for real road paths)
    return Number((straightDistance * 1.25).toFixed(2));
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Fetch actual driving/riding road distance and route geometry via OSRM Routing Engine
   * Returns: { distanceKm: number, durationMinutes: number, coordinates: [[lat, lng], ...] }
   */
  async getRoadRoute(fromLat, fromLng, toLat, toLng) {
    const cacheKey = `${fromLat.toFixed(5)},${fromLng.toFixed(5)}_${toLat.toFixed(5)},${toLng.toFixed(5)}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey);
    }

    try {
      // OSRM expects coordinates in [lng, lat] format
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout fallback

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceKm = Number((route.distance / 1000).toFixed(2));
          const durationMinutes = Math.round(route.duration / 60);
          
          // Convert geojson [lng, lat] into Leaflet [lat, lng]
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

          const result = {
            distanceKm,
            durationMinutes,
            coordinates,
            source: 'OSRM_ROUTING_API'
          };

          this.routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('OSRM Route API unavailable or timed out, using high-precision Haversine Road approximation.', err);
    }

    // Fallback: Haversine with 1.25x road factor
    const fallbackDist = this.calculateHaversine(fromLat, fromLng, toLat, toLng);
    const result = {
      distanceKm: Math.max(0.5, fallbackDist),
      durationMinutes: Math.round(fallbackDist * 2.5), // Avg 25 km/h bike speed in city
      coordinates: [
        [fromLat, fromLng],
        [toLat, toLng]
      ],
      source: 'HAVERSINE_ESTIMATE'
    };

    this.routeCache.set(cacheKey, result);
    return result;
  }

  /**
   * Calculate complete full-day trip legs and reimbursement
   * Stops array order:
   * [0] = Office (Okhla Hub)
   * [1..N] = Customers in sequence
   * [N+1] = Engineer Home
   */
  async calculateFullJourney(stops, ratePerKm = CONFIG.DEFAULT_RATE_PER_KM) {
    if (!stops || stops.length < 2) {
      return {
        legs: [],
        totalKm: 0,
        ratePerKm,
        totalPayout: 0,
        allRouteCoordinates: []
      };
    }

    const legs = [];
    let totalKm = 0;
    const allRouteCoordinates = [];

    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];

      const routeData = await this.getRoadRoute(
        Number(from.latitude || from.lat),
        Number(from.longitude || from.lng),
        Number(to.latitude || to.lat),
        Number(to.longitude || to.lng)
      );

      const distanceKm = routeData.distanceKm;
      const legAmount = Number((distanceKm * ratePerKm).toFixed(2));
      totalKm += distanceKm;

      legs.push({
        legOrder: i + 1,
        fromName: from.name || from.title || 'Start Point',
        fromType: from.type || (i === 0 ? 'office' : 'customer'),
        fromLat: Number(from.latitude || from.lat),
        fromLng: Number(from.longitude || from.lng),
        toName: to.name || to.title || 'Destination',
        toType: to.type || (i === stops.length - 2 ? 'home' : 'customer'),
        toLat: Number(to.latitude || to.lat),
        toLng: Number(to.longitude || to.lng),
        distanceKm: distanceKm,
        ratePerKm: ratePerKm,
        amount: legAmount,
        durationMinutes: routeData.durationMinutes,
        coordinates: routeData.coordinates,
        jobId: to.jobId || null
      });

      if (routeData.coordinates && routeData.coordinates.length > 0) {
        allRouteCoordinates.push(...routeData.coordinates);
      }
    }

    const finalTotalKm = Number(totalKm.toFixed(2));
    const totalPayout = Number((finalTotalKm * ratePerKm).toFixed(2));

    return {
      legs,
      totalKm: finalTotalKm,
      ratePerKm,
      totalPayout,
      allRouteCoordinates
    };
  }

  /**
   * Automatically optimize customer visit order for minimum total travel distance
   * Starts from Office -> Visits all customers via Nearest Neighbor -> Ends at Engineer Home
   */
  optimizeCustomerOrder(office, customers, home) {
    if (!customers || customers.length <= 1) return [...customers];

    const unvisited = [...customers];
    const optimized = [];
    let currentPoint = {
      lat: Number(office.latitude),
      lng: Number(office.longitude)
    };

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const cust = unvisited[i];
        const dist = this.calculateHaversine(
          currentPoint.lat,
          currentPoint.lng,
          Number(cust.latitude),
          Number(cust.longitude)
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      if (nearestIdx !== -1) {
        const [nextCust] = unvisited.splice(nearestIdx, 1);
        optimized.push(nextCust);
        currentPoint = {
          lat: Number(nextCust.latitude),
          lng: Number(nextCust.longitude)
        };
      } else {
        break;
      }
    }

    return optimized;
  }

  /**
   * Helper formatting functions
   */
  formatKm(km) {
    if (km === undefined || km === null) return '0.00 km';
    return `${Number(km).toFixed(2)} km`;
  }

  formatCurrency(amount) {
    if (amount === undefined || amount === null) return `${CONFIG.CURRENCY}0.00`;
    return `${CONFIG.CURRENCY}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Global instance
window.distanceEngine = new DistanceEngine();
