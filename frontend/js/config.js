/**
 * Engineer Travel Distance & Payout System
 * System Configuration & Constants with Google Maps Integration
 */

const CONFIG = {
  APP_NAME: 'TravelTrack Pro',
  SYSTEM_TITLE: 'Engineer Travel Distance & Payout System',
  VERSION: '2.1.0',
  CURRENCY: '₹',
  DEFAULT_RATE_PER_KM: 2.50, // ₹2.50 per km default bike reimbursement rate
  
  // Default Office Hub (Okhla Industrial Area Phase III, New Delhi)
  DEFAULT_OFFICE: {
    id: 'off-001',
    name: 'Main Office – Okhla Hub',
    address: 'Phase III, Okhla Industrial Area, New Delhi 110020',
    latitude: 28.53551,
    longitude: 77.27308,
    default_rate: 2.50
  },

  // Storage Keys
  STORAGE_KEYS: {
    ENGINEERS: 'ttp_engineers',
    CUSTOMERS: 'ttp_customers',
    JOBS: 'ttp_jobs',
    DAILY_TRIPS: 'ttp_daily_trips',
    SETTINGS: 'ttp_settings',
    OFFICES: 'ttp_offices',
    CURRENT_USER: 'ttp_current_user',
    ACTIVE_VIEW: 'ttp_active_view'
  },

  // Supabase Configuration
  SUPABASE: {
    URL: '',
    ANON_KEY: '',
    IS_CONNECTED: false
  },

  // Google Maps & Map Provider Defaults
  MAP: {
    DEFAULT_CENTER: [28.53551, 77.27308],
    DEFAULT_ZOOM: 12,
    DEFAULT_PROVIDER: 'google_roadmap', // 'google_roadmap', 'google_satellite', 'google_terrain', 'osm'
    
    // Tile Layer URLs
    LAYERS: {
      google_roadmap: {
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
        name: 'Google Roadmap'
      },
      google_satellite: {
        url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Imagery',
        name: 'Google Satellite'
      },
      google_terrain: {
        url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Terrain',
        name: 'Google Terrain'
      },
      osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'OpenStreetMap'
      }
    },

    ROUTING_API: 'https://router.project-osrm.org/route/v1/driving/'
  }
};

window.CONFIG = CONFIG;
