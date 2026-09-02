/**
 * Engineer Travel Distance & Payout System
 * Backend Node.js & Express REST API Server
 * Standard Rate: ₹2.50 / KM
 * Route Flow: Main Office (Okhla Hub) -> Customer 1 -> Customer 2 -> Customer 3 -> Engineer Home
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Frontend static files directly from ../frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// In-Memory Database initialized from seed-data.json
const seedPath = path.join(__dirname, 'database/seed-data.json');
let dbData = {
  settings: {
    default_rate_per_km: 2.50,
    currency: 'INR',
    company_name: 'FastTech Field Engineering Solutions',
    company_address: 'Phase III, Okhla Industrial Area, New Delhi 110020'
  },
  offices: [
    {
      id: 'off-001',
      name: 'Main Office – Okhla Hub',
      address: 'Phase III, Okhla Industrial Area, New Delhi, 110020',
      latitude: 28.53551,
      longitude: 77.27308,
      is_primary: true
    }
  ],
  engineers: [],
  customers: [],
  jobs: [],
  daily_trips: [],
  live_gps_pings: {}
};

try {
  if (fs.existsSync(seedPath)) {
    const raw = fs.readFileSync(seedPath, 'utf8');
    const parsed = JSON.parse(raw);
    dbData = { ...dbData, ...parsed };
    console.log('📦 Database loaded from seed-data.json');
  }
} catch (e) {
  console.warn('⚠️ Could not load seed-data.json, using defaults.');
}

// Distance Calculation Helpers (Haversine & OSRM)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// ==========================================================
// REST API ROUTES
// ==========================================================

// 1. Health check & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'TravelTrack Payout API',
    rate: '₹2.50 / KM',
    active_engineers: dbData.engineers.length,
    timestamp: new Date().toISOString()
  });
});

// 2. Engineers Endpoints
app.get('/api/engineers', (req, res) => {
  res.json(dbData.engineers);
});

app.get('/api/engineers/:id', (req, res) => {
  const eng = dbData.engineers.find(e => e.id === req.params.id);
  if (!eng) return res.status(404).json({ error: 'Engineer not found' });
  res.json(eng);
});

app.post('/api/engineers', (req, res) => {
  const newEng = {
    id: 'eng-' + Date.now(),
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email || '',
    home_address: req.body.home_address,
    home_latitude: parseFloat(req.body.home_latitude),
    home_longitude: parseFloat(req.body.home_longitude),
    vehicle_type: req.body.vehicle_type || 'Motorcycle',
    vehicle_number: req.body.vehicle_number || '',
    is_active: req.body.is_active !== false,
    created_at: new Date().toISOString()
  };
  dbData.engineers.push(newEng);
  res.status(201).json(newEng);
});

// 3. Customers Endpoints
app.get('/api/customers', (req, res) => {
  res.json(dbData.customers);
});

app.post('/api/customers', (req, res) => {
  const newCust = {
    id: 'cust-' + Date.now(),
    name: req.body.name,
    address: req.body.address,
    latitude: parseFloat(req.body.latitude),
    longitude: parseFloat(req.body.longitude),
    phone: req.body.phone || '',
    contact_person: req.body.contact_person || ''
  };
  dbData.customers.push(newCust);
  res.status(201).json(newCust);
});

// 4. Jobs Endpoints
app.get('/api/jobs', (req, res) => {
  let result = dbData.jobs;
  const { date, engineerId, status } = req.query;

  if (date) result = result.filter(j => j.scheduled_date === date);
  if (engineerId) result = result.filter(j => j.engineer_id === engineerId);
  if (status) result = result.filter(j => j.status === status);

  res.json(result.sort((a, b) => (a.sequence_order || 99) - (b.sequence_order || 99)));
});

app.post('/api/jobs', (req, res) => {
  const newJob = {
    id: 'job-' + Date.now(),
    title: req.body.title,
    description: req.body.description || '',
    customer_id: req.body.customer_id,
    engineer_id: req.body.engineer_id,
    scheduled_date: req.body.scheduled_date,
    priority: req.body.priority || 'Normal',
    sequence_order: req.body.sequence_order || 1,
    status: 'assigned',
    created_at: new Date().toISOString()
  };
  dbData.jobs.push(newJob);
  res.status(201).json(newJob);
});

app.put('/api/jobs/:id', (req, res) => {
  const job = dbData.jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  Object.assign(job, req.body, { updated_at: new Date().toISOString() });
  res.json(job);
});

// 5. Daily Trips & Reimbursement Payouts
app.get('/api/trips', (req, res) => {
  let result = dbData.daily_trips;
  const { date, engineerId, month } = req.query;

  if (date) result = result.filter(t => t.trip_date === date);
  if (engineerId) result = result.filter(t => t.engineer_id === engineerId);
  if (month) result = result.filter(t => t.trip_date && t.trip_date.startsWith(month));

  res.json(result);
});

app.post('/api/trips', (req, res) => {
  const newTrip = {
    id: 'trip-' + Date.now(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  dbData.daily_trips.push(newTrip);
  res.status(201).json(newTrip);
});

// 6. Journey Distance & Payout Calculator Engine (₹2.50 / KM)
app.post('/api/calculate-journey', (req, res) => {
  const { stops, ratePerKm = 2.50 } = req.body;
  if (!stops || stops.length < 2) {
    return res.status(400).json({ error: 'At least 2 stops (Origin and Destination) required' });
  }

  const legs = [];
  let totalKm = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const dist = haversineDistance(from.latitude, from.longitude, to.latitude, to.longitude);
    const amount = Number((dist * ratePerKm).toFixed(2));

    legs.push({
      legOrder: i + 1,
      fromName: from.name,
      toName: to.name,
      distanceKm: dist,
      rate: ratePerKm,
      amount: amount
    });

    totalKm += dist;
  }

  totalKm = Number(totalKm.toFixed(1));
  const totalPayout = Number((totalKm * ratePerKm).toFixed(2));

  res.json({
    ratePerKm,
    totalKm,
    totalPayout,
    legs,
    formula: `Total KM (${totalKm} km) × ₹${ratePerKm.toFixed(2)} = ₹${totalPayout.toFixed(2)}`
  });
});

// 7. Live GPS Radar Pings
app.post('/api/gps/ping', (req, res) => {
  const { engineerId, latitude, longitude, speedKmH, accuracy, isSimulated } = req.body;
  if (!engineerId) return res.status(400).json({ error: 'engineerId required' });

  dbData.live_gps_pings[engineerId] = {
    engineerId,
    latitude,
    longitude,
    speedKmH: speedKmH || 0,
    accuracy: accuracy || 10,
    isSimulated: !!isSimulated,
    timestamp: new Date().toISOString()
  };

  res.json({ success: true, timestamp: dbData.live_gps_pings[engineerId].timestamp });
});

app.get('/api/gps/live', (req, res) => {
  res.json(dbData.live_gps_pings);
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TravelTrack Backend Server running on http://localhost:${PORT}`);
    console.log(`📱 Field Engineer App: http://localhost:${PORT}/engineer.html`);
    console.log(`🏢 Admin Operations Portal: http://localhost:${PORT}/admin.html`);
  });
}

module.exports = app;
